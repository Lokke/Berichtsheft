import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('🔐 Login attempt for:', email)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.log('❌ User not found:', email)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const passwordValid = await verifyPassword(password, user.password)
    console.log('🔑 Password valid:', passwordValid)

    if (!passwordValid) {
      console.log('❌ Invalid password for:', email)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const token = generateToken(user.id)
    console.log('✅ Token generated for user:', user.id)
    console.log('🎫 Token:', token.substring(0, 20) + '...')

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })

    // Set cookie with proper settings for development
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: false, // Set to false for localhost development
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/' // Explicit path
    })

    console.log('🍪 Cookie set for user:', user.id)
    console.log('🍪 Cookie config:', { 
      httpOnly: true, 
      secure: false, 
      sameSite: 'lax', 
      path: '/',
      maxAge: 60 * 60 * 24 * 7 
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}