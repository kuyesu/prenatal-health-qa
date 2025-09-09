import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Optional authentication - analytics can be tracked for both authenticated and anonymous users
    let userId = null;
    const authResult = await authenticateToken(request);
    if (!('error' in authResult)) {
      userId = authResult.user.id;
    }

    const {
      eventType,
      eventData,
      platform,
      language,
    } = await request.json();

    if (!eventType) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      );
    }

    const analytics = await prisma.analytics.create({
      data: {
        userId,
        eventType,
        eventData: eventData || {},
        platform: platform || 'web',
        language: language || 'en',
      },
    });

    return NextResponse.json({
      success: true,
      data: { analytics },
    });
  } catch (error) {
    console.error('Track analytics error:', error);
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
    const eventType = searchParams.get('eventType');
    const platform = searchParams.get('platform');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build filter conditions
    const where: any = {};

    if (eventType) {
      where.eventType = eventType;
    }

    if (platform) {
      where.platform = platform;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const analytics = await prisma.analytics.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: { analytics },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
