import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const vacations = await prisma.vacationPeriod.findMany({
      where: { userId: decoded.userId },
      orderBy: { startDate: 'asc' }
    })

    return NextResponse.json(vacations)
  } catch (error) {
    console.error('Error fetching vacations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vacations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { startDate, endDate, description } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start and end date are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    const vacation = await prisma.vacationPeriod.create({
      data: {
        userId: decoded.userId,
        startDate: start,
        endDate: end,
        description: description || null
      }
    })

    return NextResponse.json(vacation, { status: 201 })
  } catch (error) {
    console.error('Error creating vacation:', error)
    return NextResponse.json(
      { error: 'Failed to create vacation' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Vacation ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const vacation = await prisma.vacationPeriod.findUnique({
      where: { id }
    })

    if (!vacation || vacation.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Vacation not found or unauthorized' },
        { status: 404 }
      )
    }

    await prisma.vacationPeriod.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vacation:', error)
    return NextResponse.json(
      { error: 'Failed to delete vacation' },
      { status: 500 }
    )
  }
}
