import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'
const DEFAULT_TOKEN = process.env.DEFAULT_TOKEN || 'your_token_here'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { doc_content, doc_knowledge_base_id } = body

    // 验证必需参数
    if (!doc_content || !doc_knowledge_base_id) {
      return NextResponse.json(
        { 
          code: 400,
          msg: '缺少必需参数：doc_content 和 doc_knowledge_base_id',
          data: null
        },
        { status: 400 }
      )
    }

    // 构建请求参数
    const requestBody = {
      doc_content: doc_content.trim(),
      doc_knowledge_base_id: doc_knowledge_base_id
    }

    // 设置请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEFAULT_TOKEN}`,
      'x-token': DEFAULT_TOKEN,
    }

    // 从原始请求中获取认证信息
    const authHeader = request.headers.get('authorization')
    const xTokenHeader = request.headers.get('x-token')
    
    if (authHeader) {
      headers['Authorization'] = authHeader
    }
    if (xTokenHeader) {
      headers['x-token'] = xTokenHeader
    }

    console.log('Semantic query request:', {
      url: `${API_BASE_URL}/api/v1/documents/semantic_query`,
      headers,
      body: requestBody
    })

    // 发起语义检索请求
    const response = await fetch(`${API_BASE_URL}/api/v1/documents/semantic_query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    console.log('Semantic query response status:', response.status)

    const data = await response.json()
    console.log('Semantic query response data:', data)

    // 返回标准化的响应格式
    if (response.ok) {
      return NextResponse.json({
        code: 200,
        msg: 'success',
        data: data.data || data || []
      })
    } else {
      return NextResponse.json({
        code: data.code || response.status,
        msg: data.msg || data.message || '语义检索失败',
        data: null
      }, { status: response.status })
    }

  } catch (error) {
    console.error('Semantic query error:', error)
    return NextResponse.json(
      {
        code: 500,
        msg: '语义检索服务异常',
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}