import jsPDF from 'jspdf'

interface Entry {
  date: Date
  activity: string
  week?: number
}

interface UserData {
  name: string
  department: string
  trainingProfession: string
  trainingYear: number
  trainingStartDate?: Date | string
}

export const generateLatexTemplate = (): string => {
  // This function is kept for compatibility but won't be used
  return `Generated with jsPDF instead of LaTeX`
}

export const generateWeeklyPDF = async (entries: Entry[], userData: UserData, weekStart: Date): Promise<Buffer> => {
  // Create PDF using jsPDF instead of LaTeX
  const doc = new jsPDF('p', 'mm', 'a4')
  
  // Set font
  doc.setFont('helvetica')
  doc.setFontSize(8)
  
  // Calculate week end date (Friday)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 4)
  
  // Format dates
  const formatDate = (date: Date) => 
    `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`
  
  // Table setup - exact 11 columns as in LaTeX template
  const startX = 5
  const startY = 10
  const totalWidth = 200
  const colWidth = totalWidth / 11
  const rowHeight = 5
  
  let currentY = startY
  
  // Draw table cell
  const drawCell = (x: number, y: number, width: number, height: number, text: string = '') => {
    doc.rect(x, y, width, height)
    if (text) {
      const maxWidth = width - 1
      const splitText = doc.splitTextToSize(text, maxWidth)
      doc.text(splitText, x + 0.5, y + 3)
    }
  }
  
  // Draw complete row with 11 cells
  const drawRow = (texts: string[], y: number, height: number = rowHeight) => {
    for (let i = 0; i < 11; i++) {
      drawCell(startX + i * colWidth, y, colWidth, height, texts[i] || '')
    }
    return y + height
  }
  
  // Header row 1: Name field
  currentY = drawRow(['', '', '', '', '', 'Name:', userData.name || '', '', '', '', ''], currentY)
  
  // Header row 2: Training year
  currentY = drawRow(['', '', '', userData.trainingYear?.toString() || '', '', '', '', '', '', '', ''], currentY)
  
  // Header row 3: Week information
  currentY = drawRow([
    'Ausbildungsnachweis Nr.',
    '',
    '',
    '',
    'Woche vom',
    formatDate(weekStart),
    'bis',
    formatDate(weekEnd),
    'Ausbildungsjahr',
    '',
    ''
  ], currentY)
  
  // Empty row
  currentY = drawRow(['', '', '', '', '', '', '', '', '', '', ''], currentY)
  
  // Column headers row 1
  currentY = drawRow([
    'Tag',
    'Ausgeführte Arbeiten, Unterricht, Unterweisungen usw.',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Einzel-',
    'Gesamt-'
  ], currentY)
  
  // Column headers row 2
  currentY = drawRow(['', '', '', '', '', '', '', '', '', 'stunden', 'stunden'], currentY)
  
  // Days of the week with activities
  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
  const dayActivities: { [key: string]: string[] } = {}
  const dayHours: { [key: string]: number } = {}
  
  // Group entries by day
  entries.forEach(entry => {
    const entryDate = new Date(entry.date)
    const dayName = entryDate.toLocaleDateString('de-DE', { weekday: 'long' })
    if (!dayActivities[dayName]) {
      dayActivities[dayName] = []
      dayHours[dayName] = 0
    }
    dayActivities[dayName].push(entry.activity)
    dayHours[dayName] = 8 // Default 8 hours per day
  })
  
  let totalHours = 0
  
  // Draw each day (6 rows per day as in template)
  days.forEach(day => {
    const activities = dayActivities[day] || []
    const hours = dayHours[day] || 0
    if (hours > 0) totalHours += hours
    
    // First row with day name
    currentY = drawRow([
      day,
      activities[0] || '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ], currentY)
    
    // Additional activity rows (5 more rows per day)
    for (let i = 1; i < 6; i++) {
      const isLastRowOfDay = i === 5
      const activity = activities[i] || ''
      const hourText = isLastRowOfDay && hours > 0 ? `${hours} h` : ''
      
      currentY = drawRow([
        '',
        activity,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        hourText
      ], currentY)
    }
  })
  
  // Week total row
  currentY = drawRow(['', '', '', '', '', '', '', '', 'Wochenstunden', '', totalHours.toString()], currentY)
  
  // Empty row
  currentY = drawRow(['', '', '', '', '', '', '', '', '', '', ''], currentY)
  
  // Special remarks
  currentY = drawRow(['Besondere Bemerkungen', '', '', '', '', '', '', '', '', '', ''], currentY)
  currentY = drawRow(['Auszubildender', '', '', '', '', 'Ausbilder', '', '', '', '', ''], currentY)
  
  // Empty rows for remarks (6 rows)
  for (let i = 0; i < 6; i++) {
    currentY = drawRow(['', '', '', '', '', '', '', '', '', '', ''], currentY)
  }
  
  // Signature section
  currentY = drawRow(['Für die Richtigkeit', '', '', '', '', '', '', '', '', '', ''], currentY)
  
  // Empty rows for signatures (4 rows)
  for (let i = 0; i < 4; i++) {
    currentY = drawRow(['', '', '', '', '', '', '', '', '', '', ''], currentY)
  }
  
  // Final signature row
  currentY = drawRow([
    'Datum',
    '',
    'Unterschrift des Auszubildenden',
    '',
    '',
    'Datum',
    '',
    'Unterschrift des Ausbilders',
    '',
    '',
    ''
  ], currentY)
  
  // Convert to buffer
  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
}

export const generateAllWeeksPDF = async (entries: Entry[], userData: UserData): Promise<Buffer> => {
  if (!userData.trainingStartDate) {
    throw new Error('Ausbildungsstart-Datum ist erforderlich')
  }
  
  const doc = new jsPDF('p', 'mm', 'a4')
  
  // Calculate all weeks from training start to last entry
  const trainingStart = new Date(userData.trainingStartDate)
  const lastEntryDate = entries.length > 0 ? 
    new Date(Math.max(...entries.map(e => new Date(e.date).getTime()))) : 
    new Date()
  
  // Find first Monday of training start week
  const firstMonday = new Date(trainingStart)
  const dayOfWeek = firstMonday.getDay()
  if (dayOfWeek !== 1) { // If not already Monday
    firstMonday.setDate(firstMonday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  }
  
  // Generate weeks
  const weeks: Date[] = []
  const currentWeek = new Date(firstMonday)
  
  while (currentWeek <= lastEntryDate) {
    weeks.push(new Date(currentWeek))
    currentWeek.setDate(currentWeek.getDate() + 7)
  }
  
  // Generate PDF for each week
  for (let i = 0; i < weeks.length; i++) {
    if (i > 0) {
      doc.addPage()
    }
    
    const weekStart = weeks[i]
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    // Filter entries for this week
    const weekEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date)
      return entryDate >= weekStart && entryDate <= weekEnd
    })
    
    // Generate week page using the same logic as generateWeeklyPDF
    await generateWeekPage(doc, weekEntries, userData, weekStart)
  }
  
  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
}

// Helper function to generate a single week page
const generateWeekPage = async (doc: jsPDF, entries: Entry[], userData: UserData, weekStart: Date) => {
  // Set font
  doc.setFont('helvetica')
  doc.setFontSize(8)
  
  // Calculate week end date (Friday)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 4)
  
  // Format dates
  const formatDate = (date: Date) => 
    `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`
  
  // Table setup - exact 11 columns as in LaTeX template
  const startX = 5
  const startY = 10
  const totalWidth = 200
  const colWidth = totalWidth / 11
  const rowHeight = 5
  
  let currentY = startY
  
  // Draw table cell
  const drawCell = (x: number, y: number, width: number, height: number, text: string = '') => {
    doc.rect(x, y, width, height)
    if (text) {
      const maxWidth = width - 1
      const splitText = doc.splitTextToSize(text, maxWidth)
      doc.text(splitText, x + 0.5, y + 3)
    }
  }
  
  // Draw complete row with 11 cells
  const drawRow = (texts: string[], y: number, height: number = rowHeight) => {
    for (let i = 0; i < 11; i++) {
      drawCell(startX + i * colWidth, y, colWidth, height, texts[i] || '')
    }
    return y + height
  }
  
  // Header row 1: Name field
  currentY = drawRow(['', '', '', '', '', 'Name:', userData.name || '', '', '', '', ''], currentY)
  
  // Header row 2: Training year
  currentY = drawRow(['', '', '', userData.trainingYear?.toString() || '', '', '', '', '', '', '', ''], currentY)
  
  // Header row 3: Week information
  currentY = drawRow([
    'Ausbildungsnachweis Nr.',
    '',
    '',
    '',
    'Woche vom',
    formatDate(weekStart),
    'bis',
    formatDate(weekEnd),
    'Ausbildungsjahr',
    '',
    ''
  ], currentY)
  
  // Empty row
  currentY = drawRow(['', '', '', '', '', '', '', '', '', '', ''], currentY)
  
  // Column headers row 1
  currentY = drawRow([
    'Tag',
    'Ausgeführte Arbeiten, Unterricht, Unterweisungen usw.',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Einzel-',
    'Gesamt-'
  ], currentY)
  
  // Column headers row 2
  currentY = drawRow(['', '', '', '', '', '', '', '', '', 'stunden', 'stunden'], currentY)
  
  // Days of the week with activities
  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
  const dayActivities: { [key: string]: string[] } = {}
  const dayHours: { [key: string]: number } = {}
  
  // Group entries by day
  entries.forEach(entry => {
    const entryDate = new Date(entry.date)
    const dayName = entryDate.toLocaleDateString('de-DE', { weekday: 'long' })
    if (!dayActivities[dayName]) {
      dayActivities[dayName] = []
      dayHours[dayName] = 0
    }
    dayActivities[dayName].push(entry.activity)
    dayHours[dayName] = 8 // Default 8 hours per day
  })
  
  let totalHours = 0
  
  // Draw each day (6 rows per day as in template)
  days.forEach(day => {
    const activities = dayActivities[day] || []
    const hours = dayHours[day] || 0
    if (hours > 0) totalHours += hours
    
    // First row with day name
    currentY = drawRow([
      day,
      activities[0] || '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ], currentY)
    
    // Additional activity rows (5 more rows per day)
    for (let i = 1; i < 6; i++) {
      const isLastRowOfDay = i === 5
      const activity = activities[i] || ''
      const hourText = isLastRowOfDay && hours > 0 ? `${hours} h` : ''
      
      currentY = drawRow([
        '',
        activity,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        hourText
      ], currentY)
    }
  })
  
  // Week total row
  currentY = drawRow(['', '', '', '', '', '', '', '', 'Wochenstunden', '', totalHours.toString()], currentY)
  
  // Empty row
  currentY = drawRow(['', '', '', '', '', '', '', '', '', '', ''], currentY)
  
  // Special remarks
  currentY = drawRow(['Besondere Bemerkungen', '', '', '', '', '', '', '', '', '', ''], currentY)
  currentY = drawRow(['Auszubildender', '', '', '', '', 'Ausbilder', '', '', '', '', ''], currentY)
  
  // Empty rows for remarks (6 rows)
  for (let i = 0; i < 6; i++) {
    currentY = drawRow(['', '', '', '', '', '', '', '', '', '', ''], currentY)
  }
  
  // Signature section
  currentY = drawRow(['Für die Richtigkeit', '', '', '', '', '', '', '', '', '', ''], currentY)
  
  // Empty rows for signatures (4 rows)
  for (let i = 0; i < 4; i++) {
    currentY = drawRow(['', '', '', '', '', '', '', '', '', '', ''], currentY)
  }
  
  // Final signature row
  currentY = drawRow([
    'Datum',
    '',
    'Unterschrift des Auszubildenden',
    '',
    '',
    'Datum',
    '',
    'Unterschrift des Ausbilders',
    '',
    '',
    ''
  ], currentY)
}