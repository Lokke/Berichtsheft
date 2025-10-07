import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12)
}

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export const verifyToken = (token: string): { userId: string } | null => {
  try {
    console.log('🔍 Verifying token with JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...')
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    console.log('✅ Token verified successfully:', decoded.userId)
    return decoded
  } catch (error) {
    console.error('❌ Token verification error:', error instanceof Error ? error.message : error)
    return null
  }
}