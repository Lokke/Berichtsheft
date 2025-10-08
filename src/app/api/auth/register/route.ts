import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email und Passwort sind erforderlich' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Benutzer existiert bereits' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(password)

    // Extract name from email (part before @)
    const nameFromEmail = email.split('@')[0]

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: nameFromEmail
      }
    })

    // Generate token and set cookie to automatically log in the user
    const token = generateToken(user.id)

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      requiresSetup: true
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: false, // Set to false for localhost development
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/' // Explicit path
    })

    console.log('✅ User registered and auto-logged in:', user.id)

    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}