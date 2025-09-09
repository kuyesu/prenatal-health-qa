import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateToken } from '@/lib/auth';

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
    const pregnancyWeek = searchParams.get('pregnancyWeek');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get user's pregnancy week if not provided
    let targetWeek = pregnancyWeek;
    if (!targetWeek) {
      const user = await prisma.user.findUnique({
        where: { id: authResult.user.id },
        select: { pregnancyWeek: true },
      });
      targetWeek = user?.pregnancyWeek?.toString() || null;
    }

    // Build filter conditions
    const where: any = {
      isActive: true,
    };

    if (targetWeek) {
      const weekNum = parseInt(targetWeek);
      where.AND = [
        {
          OR: [
            { pregnancyWeekMin: { lte: weekNum } },
            { pregnancyWeekMin: null },
          ],
        },
        {
          OR: [
            { pregnancyWeekMax: { gte: weekNum } },
            { pregnancyWeekMax: null },
          ],
        },
      ];
    }

    if (category) {
      where.category = category;
    }

    const healthTips = await prisma.healthTip.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: { healthTips },
    });
  } catch (error) {
    console.error('Get health tips error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Admin endpoint to create health tips
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
      title,
      content,
      category,
      pregnancyWeekMin,
      pregnancyWeekMax,
      tags,
      language,
      priority,
    } = await request.json();

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'Title, content, and category are required' },
        { status: 400 }
      );
    }

    const healthTip = await prisma.healthTip.create({
      data: {
        title,
        content,
        category,
        pregnancyWeekMin: pregnancyWeekMin || null,
        pregnancyWeekMax: pregnancyWeekMax || null,
        tags: tags || [],
        language: language || 'en',
        priority: priority || 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: { healthTip },
    });
  } catch (error) {
    console.error('Create health tip error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
