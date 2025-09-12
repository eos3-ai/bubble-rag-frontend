import { NextRequest, NextResponse } from 'next/server'
import { envConfig } from '@/lib/env-config'

// 从环境配置中获取参数
const { API_BASE_URL, TRAINING_API_BASE_URL, DEFAULT_TOKEN, API_TIMEOUT, ENABLE_API_LOGS } = envConfig

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleRequest(request, resolvedParams, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleRequest(request, resolvedParams, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleRequest(request, resolvedParams, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleRequest(request, resolvedParams, 'DELETE')
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    const path = params.path.join('/')
    
    // 根据API路径确定目标服务器
    let targetBaseUrl = API_BASE_URL
    
    if (path.startsWith('api/v1/unified_training/')) {
      // 统一训练相关API，使用专用的训练API服务器 (12410端口)
      // 包含: start_training, tasks, stop_training, datasets, gpu/status, training_logs
      if (path.includes('start_training') || 
          path.includes('tasks') || 
          path.includes('stop_training') || 
          path.includes('datasets') || 
          path.includes('gpu/status') || 
          path.includes('training_logs')) {
        targetBaseUrl = TRAINING_API_BASE_URL
      }
    }
    
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams.toString()
    let url = `${targetBaseUrl}/${path}${searchParams ? `?${searchParams}` : ''}`
    
    // 检查是否是FormData请求
    const contentType = request.headers.get('content-type')
    const isFormData = contentType?.includes('multipart/form-data')
    
    // 获取请求体（如果有）
    let body = null
    let actualIsFormData = false
    let customBaseUrl = null
    let customApiKey = null
    
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        // 先尝试解析为FormData，如果成功就是FormData请求
        const clonedRequest = request.clone()
        try {
          body = await request.formData()
          actualIsFormData = true
        } catch {
          // 如果FormData解析失败，就作为普通text处理
          body = await clonedRequest.text()
          actualIsFormData = false
          
          // 如果是聊天API，尝试解析JSON来提取自定义配置
          if (path.includes('chat/completions') && body) {
            try {
              const requestData = JSON.parse(body)
              
              // 检查是否有自定义base_url和api_key参数
              if (requestData.base_url) {
                customBaseUrl = requestData.base_url
              }
              if (requestData.api_key) {
                customApiKey = requestData.api_key
              }
              
              // 注意：保留自定义参数传递给后端，让后端决定如何处理
              // 代理目标始终是默认的后端服务器，不因自定义配置而改变
              
              body = JSON.stringify(requestData)
            } catch (parseError) {
              // JSON解析失败，保持原样
            }
          }
        }
      } catch (error) {
        // 忽略空请求体的错误
      }
    }

    // 构建请求头
    const headers: Record<string, string> = {}
    
    // 使用自定义API密钥或默认token
    const apiKey = customApiKey || DEFAULT_TOKEN
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
      headers['x-token'] = apiKey
    }

    // 只对非FormData且有请求体的请求设置JSON Content-Type
    if (!actualIsFormData && method !== 'GET' && method !== 'DELETE' && body) {
      headers['Content-Type'] = 'application/json'
    }

    // 从原始请求中复制其他必要的头部
    const authHeader = request.headers.get('authorization')
    const xTokenHeader = request.headers.get('x-token')
    
    if (authHeader) {
      headers['Authorization'] = authHeader
    }
    if (xTokenHeader) {
      headers['x-token'] = xTokenHeader
    }

    // 发起代理请求
    if (ENABLE_API_LOGS) {
      console.log(`Proxying ${method} request to:`, url)
      console.log('Original Content-Type:', contentType)
      console.log('Header detected FormData:', isFormData)
      console.log('Actual FormData:', actualIsFormData)
      console.log('Request headers:', headers)
      console.log('Request body type:', actualIsFormData ? 'FormData' : 'JSON')
      if (customBaseUrl || customApiKey) {
        console.log('Using custom config:', { 
          base_url: customBaseUrl, 
          has_api_key: !!customApiKey 
        })
      }
    }
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)
    
    const response = await fetch(url, {
      method,
      headers,
      body: body || undefined,
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    if (ENABLE_API_LOGS) {
      console.log('Response status:', response.status)
      
      // 特别记录GPU状态API的响应数据
      if (path.includes('gpu/status')) {
        try {
          const responseClone = response.clone()
          const responseText = await responseClone.text()
          console.log('GPU Status API Response:', responseText)
        } catch (error) {
          console.log('Failed to log GPU status response:', error)
        }
      }
    }

    // 检查是否是流式响应
    const isStreamResponse = path.includes('chat/completions')

    if (isStreamResponse && response.body) {
      // 流式响应：创建自定义流
      
      const stream = new ReadableStream({
        start(controller) {
          const reader = response.body!.getReader()
          let isClosed = false
          
          function pump(): Promise<void> {
            return reader.read().then(({ done, value }) => {
              if (done) {
                if (!isClosed) {
                  isClosed = true
                  controller.close()
                }
                return
              }
              
              // 检查控制器是否仍然可用
              if (!isClosed) {
                try {
                  controller.enqueue(value)
                  return pump()
                } catch (error) {
                  console.error('Controller enqueue error:', error)
                  isClosed = true
                  return
                }
              }
            }).catch(err => {
              console.error('Stream error:', err)
              if (!isClosed) {
                isClosed = true
                try {
                  controller.error(err)
                } catch (controllerError) {
                  console.error('Controller error failed:', controllerError)
                }
              }
            })
          }
          
          return pump()
        },
        cancel() {
          // 当客户端取消流时清理资源
          console.log('Stream cancelled by client')
        }
      })

      return new NextResponse(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-token',
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        }
      })
    } else {
      // 非流式响应：按原来的方式处理
      const data = await response.text()
      
      const nextResponse = new NextResponse(data, {
        status: response.status,
        statusText: response.statusText,
      })

      // 设置CORS头部
      nextResponse.headers.set('Access-Control-Allow-Origin', '*')
      nextResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      nextResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-token')
      nextResponse.headers.set('Content-Type', 'application/json')

      return nextResponse
    }
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// 处理预检请求
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-token',
      'Access-Control-Max-Age': '86400',
    },
  })
}