import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = 'http://localhost:8000/api/v1/knowledge_base/delete_knowledge_base'
const DEFAULT_TOKEN = 'your_token_here'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEFAULT_TOKEN}`,
      'x-token': DEFAULT_TOKEN,
    }
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers,
      body,
    })
    
    const data = await response.text()
    
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
    return NextResponse.json(
      { error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}