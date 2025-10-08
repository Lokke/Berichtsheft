import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getWeek } from 'date-fns'
import { de } from 'date-fns/locale'

interface Activity {
  description: string
  duration: number
  order?: number
}

// Custom week calculation for October 2025 based on actual work weeks
function getCustomWeekNumber(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-based month
  
  if (year === 2025 && month === 10) { // October 2025
    // First Monday of October 2025 is October 6th
    const firstMondayOctober = new Date(2025, 9, 6) // October 6, 2025
    
    if (date < firstMondayOctober) {
      return 0 // Before first work week
    }
    
    // Calculate which week this date falls into
    const daysDiff = Math.floor((date.getTime() - firstMondayOctober.getTime()) / (1000 * 60 * 60 * 24))
    return Math.floor(daysDiff / 7) + 1
  }
  
  // For other months, use standard date-fns calculation
  return getWeek(date, { locale: de })
}

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

    console.log('🔐 Entries GET - User ID:', decoded.userId)

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || '')
    const year = parseInt(searchParams.get('year') || '')

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const entries = await prisma.entry.findMany({
      where: {
        userId: decoded.userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        activities: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { date: 'asc' }
    })

    // Format entries for frontend
    const processedEntries = entries.map((entry) => {
      // Use new activities relationship if available, otherwise fallback to JSON parsing
      let activities: Activity[] = []
      
      if (entry.activities && entry.activities.length > 0) {
        activities = entry.activities.map((activity) => ({
          description: activity.description,
          duration: activity.duration || 0
        }))
      } else {
        // Fallback: parse from JSON (for backward compatibility)
        try {
          const parsed = JSON.parse(entry.activity)
          if (Array.isArray(parsed)) {
            activities = parsed
          }
        } catch {
          activities = []
        }
      }
      
      return {
        ...entry,
        activities: activities
      }
    })

    return NextResponse.json({ entries: processedEntries })
  } catch (error) {
    console.error('Get entries error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    const { date, activities = [], isCompleted = false } = await request.json()
    if (!date || activities.length === 0) {
      return NextResponse.json({ error: 'Date and activities are required' }, { status: 400 })
    }

    const entryDate = new Date(date)
    const week = getCustomWeekNumber(entryDate)
    const month = entryDate.getMonth() + 1
    const year = entryDate.getFullYear()

    // Get user's work time configuration
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        mondayEnabled: true, mondayHours: true,
        tuesdayEnabled: true, tuesdayHours: true,
        wednesdayEnabled: true, wednesdayHours: true,
        thursdayEnabled: true, thursdayHours: true,
        fridayEnabled: true, fridayHours: true,
        saturdayEnabled: true, saturdayHours: true,
        sundayEnabled: true, sundayHours: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get work hours for the specific weekday (0 = Sunday, 1 = Monday, ...)
    const dayOfWeek = entryDate.getDay()
    const dayConfig = [
      { enabled: user.sundayEnabled, hours: user.sundayHours },
      { enabled: user.mondayEnabled, hours: user.mondayHours },
      { enabled: user.tuesdayEnabled, hours: user.tuesdayHours },
      { enabled: user.wednesdayEnabled, hours: user.wednesdayHours },
      { enabled: user.thursdayEnabled, hours: user.thursdayHours },
      { enabled: user.fridayEnabled, hours: user.fridayHours },
      { enabled: user.saturdayEnabled, hours: user.saturdayHours }
    ][dayOfWeek]

    // Check if this weekday is enabled
    if (!dayConfig.enabled) {
      return NextResponse.json({ 
        error: 'This weekday is disabled in your work time configuration'
      }, { status: 400 })
    }

    // Prozessiere Aktivitäten mit automatischer Zeitverteilung
    let processedActivities = activities
    if (activities.length > 0) {
      const totalWorkHours = dayConfig.hours
      const activitiesWithoutTime = activities.filter((a: Activity) => !a.duration)
      const activitiesWithTime = activities.filter((a: Activity) => a.duration)
      
      const usedHours = activitiesWithTime.reduce((sum: number, a: Activity) => sum + (a.duration || 0), 0)
      const remainingHours = Math.max(0, totalWorkHours - usedHours)
      
      if (activitiesWithoutTime.length > 0 && remainingHours > 0) {
        // Improved algorithm with exact 0.5h precision and total matching
        const totalActivitiesWithoutTime = activitiesWithoutTime.length
        let baseHours = Math.floor(remainingHours / totalActivitiesWithoutTime * 2) / 2 // Round down to nearest 0.5h
        
        // Calculate how many hours we need to distribute after base allocation
        let distributedHours = baseHours * totalActivitiesWithoutTime
        let leftoverHours = remainingHours - distributedHours
        
        // Ensure minimum 0.5h per activity and adjust if needed
        if (baseHours < 0.5) {
          baseHours = 0.5
          distributedHours = 0.5 * totalActivitiesWithoutTime
          leftoverHours = Math.max(0, remainingHours - distributedHours)
        }
        
        // Distribute leftover hours in 0.5h increments
        const activitiesNeedingExtra = Math.floor(leftoverHours / 0.5)
        
        activitiesWithoutTime.forEach((a: Activity, index: number) => {
          a.duration = baseHours
          if (index < activitiesNeedingExtra) {
            a.duration += 0.5
          }
        })
      }
      
      processedActivities = [...activitiesWithTime, ...activitiesWithoutTime]
    }

    // Store activities as JSON
    const activityData = JSON.stringify(processedActivities)

    // Check if entry already exists
    const existingEntry = await prisma.entry.findUnique({
      where: {
        userId_date: {
          userId: decoded.userId,
          date: entryDate
        }
      }
    })

    let entry
    if (existingEntry) {
      // Delete existing activities and create new ones
      await prisma.activityEntry.deleteMany({
        where: { entryId: existingEntry.id }
      })

      // Update entry
      entry = await prisma.entry.update({
        where: { id: existingEntry.id },
        data: {
          activity: activityData,
          isCompleted,
          week,
          month,
          year,
          activities: {
            create: processedActivities.map((activity: Activity, index: number) => ({
              description: activity.description,
              duration: activity.duration,
              order: index
            }))
          }
        },
        include: {
          activities: {
            orderBy: { order: 'asc' }
          }
        }
      })
    } else {
      // Create new entry
      entry = await prisma.entry.create({
        data: {
          userId: decoded.userId,
          date: entryDate,
          activity: activityData,
          isCompleted,
          week,
          month,
          year,
          activities: {
            create: processedActivities.map((activity: Activity, index: number) => ({
              description: activity.description,
              duration: activity.duration,
              order: index
            }))
          }
        },
        include: {
          activities: {
            orderBy: { order: 'asc' }
          }
        }
      })
    }

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('Save entry error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}