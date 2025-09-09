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

    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        profileCompleted: true,
        pregnancyWeek: true,
        dueDate: true,
        previousPregnancies: true,
        healthConditions: true,
        concerns: true,
        preferredLanguage: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateToken(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const updateData = await request.json();
    
    // Only allow specific fields to be updated
    const allowedFields = [
      'name',
      'pregnancyWeek',
      'dueDate',
      'previousPregnancies',
      'healthConditions',
      'concerns',
      'preferredLanguage',
    ];

    const filteredData: any = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        ...filteredData,
        profileCompleted: true, // Mark profile as completed when updated
      },
      select: {
        id: true,
        email: true,
        name: true,
        profileCompleted: true,
        pregnancyWeek: true,
        dueDate: true,
        previousPregnancies: true,
        healthConditions: true,
        concerns: true,
        preferredLanguage: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
