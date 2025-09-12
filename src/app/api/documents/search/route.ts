import { NextRequest, NextResponse } from 'next/server'

// 环境配置
const isDevelopment = process.env.NODE_ENV === 'development'
const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000/api/v1/documents/semantic_query'
  : process.env.PRODUCTION_API_URL + '/api/v1/documents/semantic_query'

const DEFAULT_TOKEN = 'your_token_here'

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    console.log('Received documents search request:', requestData)
    console.log('Using API URL:', API_BASE_URL)
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEFAULT_TOKEN}`,
      'x-token': DEFAULT_TOKEN,
    }
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestData),
    })
    
    console.log('Backend response status:', response.status)
    const data = await response.text()
    console.log('Backend response data:', data)
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-token',
      },
    })
  } catch (error) {
    console.error('Documents search API error:', error)
    return NextResponse.json(
      { error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
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