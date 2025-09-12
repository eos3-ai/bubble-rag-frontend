import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8000'
    const token = 'your_token_here'
    
    // 获取请求体
    const body = await request.json()
    console.log('Start training request body:', body)
    
    // 构建完整的API URL
    const apiUrl = `${baseUrl}/api/v1/model_sft/start_training`
    
    console.log('Starting training task to:', apiUrl)
    
    // 调用后端API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-token': token,
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      console.error('API response error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error response:', errorText)
      return NextResponse.json(
        { code: response.status, msg: `创建训练任务失败: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Training task created response:', data)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('创建微调训练任务失败:', error)
    return NextResponse.json(
      { code: 500, msg: '创建微调训练任务失败' },
      { status: 500 }
    )
  }
}