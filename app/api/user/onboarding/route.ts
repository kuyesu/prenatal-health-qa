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
      name,
      age,
      pregnancyWeek,
      dueDate,
      previousPregnancies,
      healthConditions,
      concerns,
      preferredLanguage,
    } = await request.json();

    // Validate required fields
    if (!name || !age || !pregnancyWeek || !dueDate || previousPregnancies === undefined) {
      return NextResponse.json(
        { error: 'Required fields: name, age, pregnancyWeek, dueDate, previousPregnancies' },
        { status: 400 }
      );
    }

    // Check if onboarding data already exists
    const existingOnboarding = await prisma.onboardingData.findUnique({
      where: { userId: authResult.user.id },
    });

    let onboardingData;
    if (existingOnboarding) {
      // Update existing onboarding data
      onboardingData = await prisma.onboardingData.update({
        where: { userId: authResult.user.id },
        data: {
          name,
          age,
          pregnancyWeek,
          dueDate,
          previousPregnancies,
          healthConditions: healthConditions || [],
          concerns: concerns || [],
          preferredLanguage: preferredLanguage || 'en',
        },
      });
    } else {
      // Create new onboarding data
      onboardingData = await prisma.onboardingData.create({
        data: {
          userId: authResult.user.id,
          name,
          age,
          pregnancyWeek,
          dueDate,
          previousPregnancies,
          healthConditions: healthConditions || [],
          concerns: concerns || [],
          preferredLanguage: preferredLanguage || 'en',
        },
      });
    }

    // Update user with onboarding data
    await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        name,
        pregnancyWeek,
        dueDate,
        previousPregnancies,
        healthConditions: healthConditions || [],
        concerns: concerns || [],
        profileCompleted: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { onboardingData },
    });
  } catch (error) {
    console.error('Onboarding error:', error);
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

    const onboardingData = await prisma.onboardingData.findUnique({
      where: { userId: authResult.user.id },
    });

    return NextResponse.json({
      success: true,
      data: { onboardingData },
    });
  } catch (error) {
    console.error('Get onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
