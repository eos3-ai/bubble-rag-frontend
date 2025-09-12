import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 从环境变量或配置中获取后端API地址
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8000'
    const apiUrl = `${apiBaseUrl}/api/v1/docker_servers/list_all_docker_servers`
    
    console.log('Fetching docker servers from:', apiUrl)
    console.log('Request body:', body)

    // 获取认证token
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || 
                  request.headers.get('x-token') || 
                  'your_token_here'

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
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Docker servers response:', data)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching docker servers:', error)
    return NextResponse.json(
      { code: 500, msg: 'Failed to fetch docker servers', data: null },
      { status: 500 }
    )
  }
}