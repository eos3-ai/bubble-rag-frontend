import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'
const DEFAULT_TOKEN = process.env.DEFAULT_TOKEN || ''

export async function POST(request: NextRequest) {
  try {
    // 获取请求体
    const body = await request.text()
    console.log('Received request body:', body)
    
    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEFAULT_TOKEN}`,
      'x-token': DEFAULT_TOKEN,
    }
    
    // 构建完整的API URL
    const fullApiUrl = `${API_BASE_URL}/api/v1/knowledge_base/list_knowledge_base`
    
    console.log('Making request to:', fullApiUrl)
    console.log('Request headers:', headers)
    
    // 发起代理请求
    const response = await fetch(fullApiUrl, {
      method: 'POST',
      headers,
      body,
    })
    
    console.log('Response status:', response.status)
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }
    
    // 获取响应数据
    const data = await response.text()
    console.log('Response data:', data)
    
    // 返回响应，设置CORS头部
    const nextResponse = new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-token',
      },
    })
    
    return nextResponse
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { 
        error: 'Proxy request failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-token',
        }
      }
    )
  }
}

// 处理预检请求
export async function OPTIONS() {
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