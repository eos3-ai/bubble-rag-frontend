import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证必填字段
    if (!body.docker_server_id || !body.model_path || body.model_type === undefined) {
      return NextResponse.json(
        {
          code: 400,
          msg: 'docker_server_id, model_path and model_type are required',
          data: null
        },
        { status: 400 }
      )
    }

    // 从环境变量获取API基础URL
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8000'
    const apiUrl = `${apiBaseUrl}/api/v1/model_deploy/one_click_deploy`

    // 从localStorage获取token或使用默认token
    const defaultToken = 'your_token_here'
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '') || defaultToken

    console.log('Deploying model with params:', body)

    // 请求后端API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-token': token,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Backend API request failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('Model deployment response:', data)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error deploying model:', error)
    return NextResponse.json(
      {
        code: 500,
        msg: error instanceof Error ? error.message : 'Internal server error',
        data: null
      },
      { status: 500 }
    )
  }
}