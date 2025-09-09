import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const pregnancyWeek = searchParams.get('pregnancyWeek');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build filter conditions
    const where: any = {
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    if (pregnancyWeek) {
      const weekNum = parseInt(pregnancyWeek);
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

    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const faqs = await prisma.fAQ.findMany({
      where,
      take: limit,
      orderBy: { popularity: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: { faqs },
    });
  } catch (error) {
    console.error('Get FAQs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Admin endpoint to create FAQs
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
      question,
      answer,
      category,
      pregnancyWeekMin,
      pregnancyWeekMax,
      tags,
      language,
      popularity,
    } = await request.json();

    if (!question || !answer || !category) {
      return NextResponse.json(
        { error: 'Question, answer, and category are required' },
        { status: 400 }
      );
    }

    const faq = await prisma.fAQ.create({
      data: {
        question,
        answer,
        category,
        pregnancyWeekMin: pregnancyWeekMin || null,
        pregnancyWeekMax: pregnancyWeekMax || null,
        tags: tags || [],
        language: language || 'en',
        popularity: popularity || 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: { faq },
    });
  } catch (error) {
    console.error('Create FAQ error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
