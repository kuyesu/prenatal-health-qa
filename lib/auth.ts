import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
  }
}

export async function authenticateToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return { error: 'Access token required', status: 401 }
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string
      email: string
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user) {
      return { error: 'User not found', status: 401 }
    }

    return { user: { id: user.id, email: user.email } }
  } catch (error) {
    return { error: 'Invalid token', status: 401 }
  }
}
