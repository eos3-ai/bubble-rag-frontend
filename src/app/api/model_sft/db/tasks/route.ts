import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8000'
    const token = 'your_token_here'
    
    // 构建完整的API URL
    const apiUrl = `${baseUrl}/api/v1/model_sft/db/tasks`
    
    console.log('Fetching training tasks from:', apiUrl)
    
    // 调用后端API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-token': token,
      },
    })

    if (!response.ok) {
      console.error('API response error:', response.status, response.statusText)
      return NextResponse.json(
        { code: response.status, msg: `API调用失败: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Training tasks response:', data)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('获取模型训练任务失败:', error)
    return NextResponse.json(
      { code: 500, msg: '获取模型训练任务失败' },
      { status: 500 }
    )
  }
}