import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json()

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 })
    }

    // Verify refresh token
    let decoded
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
    }

    // Check if refresh token exists in database and is not expired
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    })

    if (!storedToken) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: storedToken.user.id, email: storedToken.user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    )

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
      },
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
