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

    const { message, type } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create new chat session
    const chatSession = await prisma.chatSession.create({
      data: {
        userId: authResult.user.id,
        platform: type === 'voice' ? 'mobile' : 'web',
        language: 'en',
      },
    });

    // Here you would integrate with your AI service to get a response
    // For now, I'll add a placeholder response
    const aiResponse = 'Thank you for your message. I\'m here to help with your prenatal health questions.';

    // Create the chat message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        chatSessionId: chatSession.id,
        userMessage: message,
        aiResponse: aiResponse,
        language: 'en',
        suggestedQuestions: [
          'What should I expect this week?',
          'Are there any warning signs to watch for?',
          'What foods should I avoid?',
        ],
      },
    });

    return NextResponse.json({
      success: true,
      data: { 
        chatSession,
        chatMessage,
        response: aiResponse,
      },
    });
  } catch (error) {
    console.error('Create chat session error:', error);
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const chatSessions = await prisma.chatSession.findMany({
      where: { userId: authResult.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({
      success: true,
      data: { chatSessions },
    });
  } catch (error) {
    console.error('Get chat sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
