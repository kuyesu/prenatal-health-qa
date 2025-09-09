import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection
    const userCount = await prisma.user.count();
    const healthTipCount = await prisma.healthTip.count();
    const faqCount = await prisma.fAQ.count();

    return NextResponse.json({
      success: true,
      message: 'Prenatal Health QA API is running!',
      data: {
        database: 'connected',
        stats: {
          users: userCount,
          healthTips: healthTipCount,
          faqs: faqCount,
        },
        endpoints: {
          auth: [
            'POST /api/auth/signup',
            'POST /api/auth/login',
            'POST /api/auth/refresh',
            'POST /api/auth/logout',
            'POST /api/auth/reset-password',
          ],
          user: [
            'GET /api/user/profile',
            'PUT /api/user/profile',
            'POST /api/user/onboarding',
            'GET /api/user/onboarding',
          ],
          chat: [
            'POST /api/chat/sessions',
            'GET /api/chat/sessions',
            'POST /api/chat/sessions/[sessionId]',
            'GET /api/chat/sessions/[sessionId]',
          ],
          content: [
            'GET /api/health-tips',
            'POST /api/health-tips',
            'GET /api/faqs',
            'POST /api/faqs',
          ],
          other: [
            'POST /api/analytics',
            'GET /api/analytics',
            'POST /api/feedback',
            'GET /api/feedback',
          ],
        },
      },
    });
  } catch (error) {
    console.error('API test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
