import { NextResponse } from 'next/server'

export async function POST() {
  // Clear the authentication cookie
  const response = NextResponse.json({ message: 'Logged out successfully' })
  
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0) // Expire immediately
  })
  
  return response
}