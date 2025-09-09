import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateToken(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { refreshToken } = await request.json();

    if (refreshToken) {
      // Revoke the specific refresh token
      await prisma.refreshToken.updateMany({
        where: {
          token: refreshToken,
          userId: authResult.user.id,
        },
        data: {
          isRevoked: true,
        },
      });
    } else {
      // Revoke all refresh tokens for the user
      await prisma.refreshToken.updateMany({
        where: {
          userId: authResult.user.id,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully logged out',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
