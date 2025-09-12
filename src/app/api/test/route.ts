import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'API proxy is working', status: 'ok' })
}

export async function POST() {
  return NextResponse.json({ message: 'POST API proxy is working', status: 'ok' })
}