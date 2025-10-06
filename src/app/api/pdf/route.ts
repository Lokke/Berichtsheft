import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { LaTeXEngine } from '@/lib/latex-engine'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

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

    // Get user data including work time configuration
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        surname: true,
        department: true,
        trainingStartDate: true,
        trainingProfession: true,
        // Work time configuration
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

    if (!user.trainingStartDate) {
      return NextResponse.json({ 
        error: 'Ausbildungsstart-Datum nicht gesetzt',
        details: 'Bitte setzen Sie das Ausbildungsstart-Datum in den Einstellungen.'
      }, { status: 400 })
    }

    // Get all entries from training start to now
    const trainingStart = new Date(user.trainingStartDate)
    const now = new Date()

    const entries = await prisma.entry.findMany({
      where: {
        userId: decoded.userId,
        date: {
          gte: trainingStart,
          lte: now
        }
      },
      orderBy: { date: 'asc' }
    })

    const formattedEntries = entries.map((entry: { date: Date; activity: string }) => {
      let content = ''
      
      // Parse activities from JSON
      try {
        const activities = JSON.parse(entry.activity)
        if (Array.isArray(activities)) {
          // Format multiple activities with time information
          content = activities
            .map((act: any) => `${act.description}${act.duration ? ` (${act.duration}h)` : ''}`)
            .join('; ')
        }
      } catch {
        // If parsing fails, use empty content
        content = ''
      }
      
      return {
        date: entry.date,
        content: content
      }
    })

    const fullName = user.surname ? `${user.name} ${user.surname}` : user.name
    const currentYear = new Date().getFullYear()
    const trainingYear = Math.floor((currentYear - new Date(user.trainingStartDate).getFullYear()) + 1)
    
    const startMonth = format(trainingStart, 'MMMM-yyyy', { locale: de })
    const endMonth = format(now, 'MMMM-yyyy', { locale: de })
    
    const userData = {
      name: fullName,
      department: user.department || 'EDV',
      trainingStartDate: user.trainingStartDate,
      trainingYear: trainingYear
    }

    // LaTeX-Engine initialisieren - NUR NOCH LATEX, KEIN FALLBACK!
    const latexEngine = new LaTeXEngine()
    
    // Group entries by weeks and weekdays for October 2025
    const weeks: { [weekNumber: number]: { [dayIndex: number]: string } } = {}
    
    formattedEntries.forEach((entry: { date: Date; content: string }) => {
      const entryDate = new Date(entry.date)
      const year = entryDate.getFullYear()
      const month = entryDate.getMonth() + 1
      
      if (year === 2025 && month === 10) { // October 2025
        // Calculate week number using same logic as API
        const firstMondayOctober = new Date(2025, 9, 6) // October 6, 2025
        if (entryDate >= firstMondayOctober) {
          const daysDiff = Math.floor((entryDate.getTime() - firstMondayOctober.getTime()) / (1000 * 60 * 60 * 24))
          const weekNumber = Math.floor(daysDiff / 7) + 1
          const dayOfWeek = entryDate.getDay() // 0=Sunday, 1=Monday, etc.
          const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert to 0=Monday, 6=Sunday
          
          if (!weeks[weekNumber]) {
            weeks[weekNumber] = {}
          }
          weeks[weekNumber][dayIndex] = entry.content
        }
      }
    })
    
    // Convert weeks object to array format expected by LaTeX engine
    const weekEntries = []
    for (let weekNum = 1; weekNum <= 4; weekNum++) { // October has 4 work weeks
      const weekData = weeks[weekNum] || {}
      const activities = []
      
      // Fill activities array for each day, but only for enabled weekdays
      const enabledDays = [
        user.mondayEnabled,    // 0 = Monday
        user.tuesdayEnabled,   // 1 = Tuesday
        user.wednesdayEnabled, // 2 = Wednesday
        user.thursdayEnabled,  // 3 = Thursday
        user.fridayEnabled,    // 4 = Friday
        user.saturdayEnabled,  // 5 = Saturday
        user.sundayEnabled     // 6 = Sunday
      ]
      
      for (let day = 0; day < 7; day++) {
        if (enabledDays[day]) {
          activities[day] = weekData[day] || '' // Empty if no entry for this day
        } else {
          activities[day] = '' // Keep empty for disabled days
        }
      }
      
      // Calculate total hours based on user configuration
      const totalHours = (user.mondayEnabled ? user.mondayHours : 0) +
                        (user.tuesdayEnabled ? user.tuesdayHours : 0) +
                        (user.wednesdayEnabled ? user.wednesdayHours : 0) +
                        (user.thursdayEnabled ? user.thursdayHours : 0) +
                        (user.fridayEnabled ? user.fridayHours : 0) +
                        (user.saturdayEnabled ? user.saturdayHours : 0) +
                        (user.sundayEnabled ? user.sundayHours : 0)

      weekEntries.push({
        week: `${weekNum}`,
        activities: activities,
        totalHours: totalHours,
        startDate: (() => {
          const firstMondayOctober = new Date(2025, 9, 6)
          const weekStart = new Date(firstMondayOctober)
          weekStart.setDate(firstMondayOctober.getDate() + (weekNum - 1) * 7)
          return weekStart.toISOString()
        })()
      })
    }

    // Transform data to match new LaTeX engine format
    const reportData = {
      month: 'Oktober',
      year: '2025',
      weeks: weekEntries,
      userInfo: {
        name: userData.name,
        company: 'Ausbildungsbetrieb', // Default company name
        department: userData.department,
        ausbildungsberuf: user.trainingProfession || 'Fachinformatiker',
        ausbildungsjahr: userData.trainingYear.toString()
      },
      workdayConfig: {
        includeSaturday: user.saturdayEnabled,
        includeSunday: user.sundayEnabled,
        hoursPerDay: {
          monday: user.mondayHours,
          tuesday: user.tuesdayHours,
          wednesday: user.wednesdayHours,
          thursday: user.thursdayHours,
          friday: user.fridayHours,
          saturday: user.saturdayHours,
          sunday: user.sundayHours
        }
      }
    };

    // Generiere PDF mit der neuen LaTeX-Engine
    const pdfBuffer = await latexEngine.generatePDF(reportData)
    
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="berichtsheft-original-${startMonth}-bis-${endMonth}.pdf"`
      }
    })
  } catch (error: unknown) {
    console.error('PDF generation error:', error)
    
    // Return more specific error message
    const errorMessage = (error instanceof Error ? error.message : 'Failed to generate PDF')
    
    return NextResponse.json({ 
      error: errorMessage,
      details: 'PDF-Generierung fehlgeschlagen.'
    }, { status: 500 })
  }
}