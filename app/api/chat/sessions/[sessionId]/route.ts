import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateToken } from '@/lib/auth'

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const authResult = await authenticateToken(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { message } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Verify the chat session exists and belongs to the user
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: params.sessionId,
        userId: authResult.user.id,
      },
    })

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    // Here you would integrate with your AI service to get a response
    // For now, I'll add a placeholder response
    const aiResponse =
      "Thank you for your message. I'm here to help with your prenatal health questions."

    // Create the chat message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        chatSessionId: params.sessionId,
        userMessage: message,
        aiResponse: aiResponse,
        language: chatSession.language,
        suggestedQuestions: [
          'What should I expect this week?',
          'Are there any warning signs to watch for?',
          'What foods should I avoid?',
        ],
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        chatMessage,
        response: aiResponse,
      },
    })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const authResult = await authenticateToken(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    // Get chat session with messages
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: params.sessionId,
        userId: authResult.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { chatSession },
    })
  } catch (error) {
    console.error('Get chat session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
