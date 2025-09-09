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

    const {
      type,
      title,
      description,
      rating,
      platform,
      appVersion,
      deviceInfo,
    } = await request.json();

    if (!type || !title || !description) {
      return NextResponse.json(
        { error: 'Type, title, and description are required' },
        { status: 400 }
      );
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: authResult.user.id,
        type,
        title,
        description,
        rating: rating || null,
        platform: platform || 'mobile',
        appVersion: appVersion || null,
        deviceInfo: deviceInfo || {},
      },
    });

    return NextResponse.json({
      success: true,
      data: { feedback },
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateToken(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build filter conditions - Admin only feature, but for now return user's own feedback
    const where: any = {
      userId: authResult.user.id,
    };

    if (type) {
      where.type = type;
    }

    if (platform) {
      where.platform = platform;
    }

    const feedback = await prisma.feedback.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: { feedback },
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
