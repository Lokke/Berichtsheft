import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    let user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        trainingClass: true,
        trainingProfessionId: true,
        trainingProfession: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        trainingStartDate: true,
        department: true,
        // Arbeitszeit-Konfiguration
        mondayEnabled: true,
        mondayHours: true,
        tuesdayEnabled: true,
        tuesdayHours: true,
        wednesdayEnabled: true,
        wednesdayHours: true,
        thursdayEnabled: true,
        thursdayHours: true,
        fridayEnabled: true,
        fridayHours: true,
        saturdayEnabled: true,
        saturdayHours: true,
        sundayEnabled: true,
        sundayHours: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get user settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { 
      name, surname, trainingClass, trainingProfessionId, trainingStartDate, department,
      // Arbeitszeit-Konfiguration
      mondayEnabled, mondayHours, tuesdayEnabled, tuesdayHours,
      wednesdayEnabled, wednesdayHours, thursdayEnabled, thursdayHours,
      fridayEnabled, fridayHours, saturdayEnabled, saturdayHours,
      sundayEnabled, sundayHours
    } = await request.json()

    if (!name || !surname || !trainingProfessionId) {
      return NextResponse.json(
        { error: 'Name, Nachname und Ausbildungsberuf sind erforderlich' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        name,
        surname,
        trainingClass,
        trainingProfessionId,
        trainingStartDate: trainingStartDate ? new Date(trainingStartDate) : null,
        department,
        // Arbeitszeit-Konfiguration
        mondayEnabled,
        mondayHours,
        tuesdayEnabled,
        tuesdayHours,
        wednesdayEnabled,
        wednesdayHours,
        thursdayEnabled,
        thursdayHours,
        fridayEnabled,
        fridayHours,
        saturdayEnabled,
        saturdayHours,
        sundayEnabled,
        sundayHours
      },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        trainingClass: true,
        trainingProfessionId: true,
        trainingProfession: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        trainingStartDate: true,
        department: true,
        // Arbeitszeit-Konfiguration
        mondayEnabled: true,
        mondayHours: true,
        tuesdayEnabled: true,
        tuesdayHours: true,
        wednesdayEnabled: true,
        wednesdayHours: true,
        thursdayEnabled: true,
        thursdayHours: true,
        fridayEnabled: true,
        fridayHours: true,
        saturdayEnabled: true,
        saturdayHours: true,
        sundayEnabled: true,
        sundayHours: true
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Update user settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}