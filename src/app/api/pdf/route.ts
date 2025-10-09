import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { LaTeXEngine } from '@/lib/latex-engine'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

// Deaktiviere Next.js Caching für diese Route - PDF muss IMMER aktuellen DB-Stand haben
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface VacationPeriod {
  id: string
  startDate: Date
  endDate: Date
  description: string | null
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

    console.log('🔍 Fetching entries from database...')
    console.log(`   Training start: ${trainingStart.toLocaleDateString('de-DE')}`)
    console.log(`   Now: ${now.toLocaleDateString('de-DE')} ${now.toLocaleTimeString('de-DE')}`)

    const entries = await prisma.entry.findMany({
      where: {
        userId: decoded.userId,
        date: {
          gte: trainingStart,
          lte: now
        }
      },
      include: {
        activities: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { date: 'asc' }
    })

    console.log(`📦 Found ${entries.length} entries in database`)

    // Get vacation periods
    const vacations = await prisma.vacationPeriod.findMany({
      where: {
        userId: decoded.userId
      }
    })

    console.log(`🏖️ Found ${vacations.length} vacation periods`)

    const formattedEntries = entries.map((entry) => {
      let content = ''
      
      console.log(`\n🔍 Processing entry:`, {
        date: entry.date.toISOString(),
        hasActivities: !!entry.activities,
        activitiesCount: entry.activities?.length || 0,
        hasOldActivity: !!entry.activity
      })
      
      // NEW: Use ActivityEntry relation if available
      if (entry.activities && entry.activities.length > 0) {
        console.log(`   📝 Activities:`, entry.activities.map((a) => ({ desc: a.description, dur: a.duration })))
        content = entry.activities
          .map((act) => `${act.description}${act.duration ? ` (${act.duration}h)` : ''}`)
          .join('; ')
        console.log(`   ✅ Entry ${entry.date.toISOString().split('T')[0]}: ${entry.activities.length} activities from relation`)
        console.log(`   📄 Final content: "${content}"`)
      } 
      // FALLBACK: Parse old activity JSON field
      else if (entry.activity) {
        try {
          const activities = JSON.parse(entry.activity)
          if (Array.isArray(activities)) {
            content = activities
              .map((act) => `${act.description}${act.duration ? ` (${act.duration}h)` : ''}`)
              .join('; ')
            console.log(`   ⚠️ Entry ${entry.date.toISOString().split('T')[0]}: ${activities.length} activities from old JSON field`)
          }
        } catch {
          content = ''
          console.log(`   ❌ Entry ${entry.date.toISOString().split('T')[0]}: Failed to parse activity JSON`)
        }
      } else {
        console.log(`   ⚠️ Entry ${entry.date.toISOString().split('T')[0]}: No activities found`)
      }
      
      return {
        date: entry.date,
        content: content
      }
    })

    const fullName = user.surname ? `${user.name} ${user.surname}` : user.name
    const currentYear = new Date().getFullYear()
    const trainingYear = Math.floor((currentYear - new Date(user.trainingStartDate).getFullYear()) + 1)
    
    const userData = {
      name: fullName,
      department: user.department || 'EDV',
      trainingStartDate: user.trainingStartDate,
      trainingYear: trainingYear
    }

    // LaTeX-Engine initialisieren - NUR NOCH LATEX, KEIN FALLBACK!
    const latexEngine = new LaTeXEngine()
    
    // Group entries by weeks - calculate week numbers from training start
    const weeks: { [weekKey: string]: { [dayIndex: number]: string } } = {}
    
    console.log('📋 DEBUG: Processing entries for PDF generation')
    console.log('📋 Total entries:', formattedEntries.length)
    
    // Find the Monday of the week containing training start date
    const trainingStartDate = new Date(user.trainingStartDate)
    const trainingStartDay = trainingStartDate.getDay()
    const daysToMonday = trainingStartDay === 0 ? -6 : 1 - trainingStartDay
    const firstMonday = new Date(trainingStartDate)
    firstMonday.setDate(trainingStartDate.getDate() + daysToMonday)
    firstMonday.setHours(0, 0, 0, 0)
    
    console.log(`📅 Training start: ${trainingStartDate.toLocaleDateString('de-DE')}`)
    console.log(`📅 First Monday: ${firstMonday.toLocaleDateString('de-DE')}`)
    
    // Helper function to check if a date is in vacation period
    const isVacationDay = (date: Date): boolean => {
      // Normalize date to midnight local time for comparison
      const checkDate = new Date(date)
      checkDate.setHours(0, 0, 0, 0)
      const checkTime = checkDate.getTime()
      
      return vacations.some((vacation: VacationPeriod) => {
        // Parse dates and normalize to midnight local time
        const start = new Date(vacation.startDate)
        start.setHours(0, 0, 0, 0)
        
        const end = new Date(vacation.endDate)
        end.setHours(23, 59, 59, 999) // End of day
        
        const startTime = start.getTime()
        const endTime = end.getTime()
        
        console.log(`🏖️ Checking vacation: ${start.toLocaleDateString('de-DE')} - ${end.toLocaleDateString('de-DE')} vs ${checkDate.toLocaleDateString('de-DE')}`)
        
        return checkTime >= startTime && checkTime <= endTime
      })
    }
    
    formattedEntries.forEach((entry) => {
      // Use UTC components to avoid timezone issues
      const entryDate = new Date(entry.date)
      const year = entryDate.getUTCFullYear()
      const month = entryDate.getUTCMonth()
      const day = entryDate.getUTCDate()
      
      // Create local date with UTC components
      const localDate = new Date(year, month, day)
      const dayOfWeek = localDate.getDay()
      
      console.log(`📅 Processing entry: ${entry.date.toISOString()} → Local: ${localDate.toLocaleDateString('de-DE')}, DayOfWeek: ${dayOfWeek} (${['So','Mo','Di','Mi','Do','Fr','Sa'][dayOfWeek]})`)
      console.log(`   Content: "${entry.content}"`)
      
      // Calculate week number from first Monday
      if (localDate >= firstMonday) {
        const daysDiff = Math.floor((localDate.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24))
        const weekNumber = Math.floor(daysDiff / 7) + 1
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert to 0=Monday, 6=Sunday
        
        // Get month/year for week key
        const weekMonday = new Date(firstMonday)
        weekMonday.setDate(firstMonday.getDate() + (weekNumber - 1) * 7)
        const weekKey = `${weekMonday.getFullYear()}-${String(weekMonday.getMonth() + 1).padStart(2, '0')}-W${weekNumber}`
        
        console.log(`   → Week ${weekNumber} (${weekKey}), Day ${dayOfWeek} (${['So','Mo','Di','Mi','Do','Fr','Sa'][dayOfWeek]}), Index ${dayIndex}`)
        
        if (!weeks[weekKey]) {
          weeks[weekKey] = {}
          console.log(`   📝 Created new week object for ${weekKey}`)
        }
        
        weeks[weekKey][dayIndex] = entry.content
        console.log(`   ✅ Stored in weeks[${weekKey}][${dayIndex}]`)
      } else {
        console.log(`   ⚠️ Date is before first Monday (${firstMonday.toLocaleDateString('de-DE')})`)
      }
    })
    
    console.log('📊 Final weeks structure:', Object.keys(weeks).length, 'weeks')
    
    // Convert weeks object to array format expected by LaTeX engine
    const weekEntries: Array<{
      week: string
      activities: string[]
      totalHours: number
      startDate: string
    }> = []
    console.log('🔄 Converting weeks to LaTeX format...')
    
    const sortedWeekKeys = Object.keys(weeks).sort()
    
    sortedWeekKeys.forEach((weekKey) => {
      const weekData = weeks[weekKey]
      console.log(`\n📅 Processing ${weekKey}:`)
      console.log(`   Raw weekData:`, JSON.stringify(weekData))
      
      // Initialize activities array with empty strings for all 7 days
      const activities = ['', '', '', '', '', '', '']
      
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
      
      // Extract week number from weekKey
      const weekMatch = weekKey.match(/W(\d+)$/)
      const weekNumber = weekMatch ? parseInt(weekMatch[1]) : 1
      const weekMonday = new Date(firstMonday)
      weekMonday.setDate(firstMonday.getDate() + (weekNumber - 1) * 7)
      
      for (let day = 0; day < 7; day++) {
        // Calculate the actual date for this day
        const dayDate = new Date(weekMonday)
        dayDate.setDate(weekMonday.getDate() + day)
        
        // Check if this day is a vacation day
        if (isVacationDay(dayDate)) {
          activities[day] = 'Ferien (0h)'
          console.log(`   🏖️ Day ${day} (${['Mo','Di','Mi','Do','Fr','Sa','So'][day]}): Vacation`)
        } else if (enabledDays[day]) {
          activities[day] = weekData[day] || '' // Empty if no entry for this day
          if (weekData[day]) {
            console.log(`   ✅ Day ${day} (${['Mo','Di','Mi','Do','Fr','Sa','So'][day]}): "${weekData[day]}"`)
          }
        } else {
          activities[day] = '' // Keep empty for disabled days
          console.log(`   ⏭️ Day ${day} (${['Mo','Di','Mi','Do','Fr','Sa','So'][day]}): disabled`)
        }
      }
      
      console.log(`   📋 Final activities array for ${weekKey}:`, activities)
      
      // weekNumber and weekMonday already calculated above, use them
      const weekStartDate = new Date(weekMonday)
      
      // Calculate total hours based on user configuration and vacation days
      let totalHours = 0
      for (let day = 0; day < 7; day++) {
        const dayDate = new Date(weekMonday)
        dayDate.setDate(weekMonday.getDate() + day)
        
        if (isVacationDay(dayDate)) {
          // Vacation days have 0 hours
          continue
        }
        
        // Add hours only if day is enabled
        const dayHours = [
          user.mondayHours,
          user.tuesdayHours,
          user.wednesdayHours,
          user.thursdayHours,
          user.fridayHours,
          user.saturdayHours,
          user.sundayHours
        ]
        
        if (enabledDays[day]) {
          totalHours += dayHours[day]
        }
      }

      weekEntries.push({
        week: weekKey,
        activities: activities,
        totalHours: totalHours,
        startDate: weekStartDate.toISOString()
      })
    })

    // Get date range for report
    const reportStartDate = formattedEntries.length > 0 
      ? new Date(formattedEntries[0].date) 
      : trainingStartDate
    const reportEndDate = formattedEntries.length > 0 
      ? new Date(formattedEntries[formattedEntries.length - 1].date) 
      : now

    // Transform data to match new LaTeX engine format
    const reportData = {
      month: format(reportStartDate, 'MMMM', { locale: de }),
      year: format(reportStartDate, 'yyyy'),
      dateRange: `${format(reportStartDate, 'dd.MM.yyyy', { locale: de })} - ${format(reportEndDate, 'dd.MM.yyyy', { locale: de })}`,
      weeks: weekEntries,
      userInfo: {
        name: userData.name,
        company: 'Ausbildungsbetrieb', // Default company name
        department: userData.department,
        ausbildungsberuf: typeof user.trainingProfession === 'string' 
          ? user.trainingProfession 
          : user.trainingProfession?.name || 'Fachinformatiker',
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
    
    // Generate filename with date range
    const startDateStr = format(reportStartDate, 'yyyy-MM-dd')
    const endDateStr = format(reportEndDate, 'yyyy-MM-dd')
    
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="berichtsheft-${startDateStr}-bis-${endDateStr}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
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