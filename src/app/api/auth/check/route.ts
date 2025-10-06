import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    return NextResponse.json({ 
      authenticated: true,
      userId: decoded.userId 
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
}
