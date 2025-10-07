import jsPDF from 'jspdf';

interface WeekEntry {
  week: string;
  activities: string[]; // Activities for each day (Mon-Sun)
  totalHours: number;
  startDate?: string; // ISO date string for the Monday of this week
}

interface WorkdayConfig {
  includeSaturday: boolean;
  includeSunday: boolean;
  hoursPerDay: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
}

interface MonthlyReport {
  month: string;
  year: string;
  dateRange?: string; // Optional: formatted date range like "01.10.2024 - 31.10.2025"
  weeks: WeekEntry[];
  userInfo: {
    name: string;
    company: string;
    department: string;
    ausbildungsberuf: string;
    ausbildungsjahr: string;
  };
  workdayConfig?: WorkdayConfig;
}

export class LaTeXEngine {
  async generatePDF(reportData: MonthlyReport): Promise<Buffer> {
    try {
      const pdfBuffer = await this.compileWithjsPDF(reportData);
      return pdfBuffer;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`Failed to generate PDF: ${error}`);
    }
  }

  private async compileWithjsPDF(reportData: MonthlyReport): Promise<Buffer> {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Generate each week as a separate page
      reportData.weeks.forEach((week, weekIndex) => {
        if (weekIndex > 0) {
          pdf.addPage();
        }
        
        this.generateWeekPage(pdf, reportData, week, weekIndex + 1);
      });
      
      const pdfOutput = pdf.output('arraybuffer');
      return Buffer.from(pdfOutput);
    } catch (error) {
      console.error('jsPDF compilation error:', error);
      throw new Error(`PDF generation failed: ${error}`);
    }
  }

  private generateWeekPage(pdf: jsPDF, reportData: MonthlyReport, week: WeekEntry, weekNumber: number) {
    // Get workday configuration or use defaults
    const config = reportData.workdayConfig || {
      includeSaturday: false,
      includeSunday: false,
      hoursPerDay: {
        monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 8, sunday: 8
      }
    };

    // Calculate correct week dates based on actual calendar week
    // Use JavaScript's built-in date calculation for accurate weekdays
    let startDate: Date;
    if (week.startDate) {
      startDate = new Date(week.startDate);
    } else {
      // Calculate the Monday of the specified week in October 2025
      // Week 1 starts with the first Monday in October (6. Oktober 2025)
      const firstMondayOctober = new Date(2025, 9, 6); // 6. Oktober 2025 = Montag
      
      // Calculate the Monday of the requested week
      startDate = new Date(firstMondayOctober);
      startDate.setDate(firstMondayOctober.getDate() + (weekNumber - 1) * 7);
    }
    
    // Determine end date based on configuration
    let lastWorkDay = 4; // Friday
    if (config.includeSunday) lastWorkDay = 6;
    else if (config.includeSaturday) lastWorkDay = 5;
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + lastWorkDay);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Header - Ausbildungsnachweis Nr. (BOLD)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Ausbildungsnachweis Nr. ', 20, 25);
    
    pdf.setFontSize(14);
    pdf.text(weekNumber.toString(), 120, 25); // Linksbündig direkt nach "Nr. "
    
    // Name (top right) - mit korrekten Seitenrändern
    pdf.setFontSize(12);
    pdf.text(reportData.userInfo.name, 190, 25, { align: 'right' });
    
    // Week info (smaller text)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Woche vom ${formatDate(startDate)} bis ${formatDate(endDate)}`, 20, 35);
    pdf.text(`Ausbildungsjahr: ${reportData.userInfo.ausbildungsjahr}`, 190, 35, { align: 'right' });

    // Table setup - korrekte A4 Seitenränder (20mm links/rechts)
    const tableStartY = 50;
    const rowHeight = 20;
    const pageWidth = 170; // A4 width: 210mm - 40mm margins (20mm links + 20mm rechts)
    const colWidths = {
      day: 25,
      activities: pageWidth - 25 - 20 - 25, // Remaining space
      individualHours: 20,
      totalHours: 25
    };

    // Draw table header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    
    // Header background
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, tableStartY, pageWidth, 15, 'F');
    
    // Header borders
    let currentX = 20;
    pdf.rect(currentX, tableStartY, colWidths.day, 15);
    currentX += colWidths.day;
    pdf.rect(currentX, tableStartY, colWidths.activities, 15);
    currentX += colWidths.activities;
    pdf.rect(currentX, tableStartY, colWidths.individualHours, 15);
    currentX += colWidths.individualHours;
    pdf.rect(currentX, tableStartY, colWidths.totalHours, 15);
    
    // Header text
    pdf.text('Tag', 22, tableStartY + 10);
    pdf.text('Ausgeführte Arbeiten, Unterricht, Unterweisungen, etc.', 50, tableStartY + 10);
    pdf.text('Stunden', 155, tableStartY + 10, { align: 'center' });
    pdf.text('Gesamt-\nstunden', 170, tableStartY + 6);

    // Define days based on configuration
    const allDays = [
      { name: 'Montag', key: 'monday' },
      { name: 'Dienstag', key: 'tuesday' },
      { name: 'Mittwoch', key: 'wednesday' },
      { name: 'Donnerstag', key: 'thursday' },
      { name: 'Freitag', key: 'friday' },
      { name: 'Samstag', key: 'saturday' },
      { name: 'Sonntag', key: 'sunday' }
    ];

    let workDays = allDays.slice(0, 5); // Default Mon-Fri
    if (config.includeSaturday) workDays = allDays.slice(0, 6);
    if (config.includeSunday) workDays = allDays.slice(0, 7);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    let totalHours = 0;
    let currentY = tableStartY + 15;

    workDays.forEach((day, dayIndex) => {
      // Calculate the actual date for this weekday
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + dayIndex);
      const dayDateString = formatDate(dayDate);
      
      // Parse activities - split by "; " to get individual activities
      const dayActivitiesString = (week.activities && week.activities[dayIndex]) || '';
      const dayActivities = dayActivitiesString ? dayActivitiesString.split('; ').filter(a => a.trim()) : [];
      
      const dayHours = config.hoursPerDay[day.key as keyof typeof config.hoursPerDay];
      let dayTotalHours = 0;
      
      // Extract hours for each activity
      const activitiesWithHours = dayActivities.map(activity => {
        const hoursMatch = activity.match(/\((\d+(?:\.\d+)?)\s*h\)/);
        const activityHours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;
        const activityText = activity.replace(/\s*\(\d+(?:\.\d+)?\s*h\)/, '').trim();
        dayTotalHours += activityHours;
        return { text: activityText, hours: activityHours };
      });
      
      // Fixed row height regardless of number of activities
      const fixedRowHeight = rowHeight;
      
      currentX = 20;
      
      // Day column - show day name and date
      pdf.rect(currentX, currentY, colWidths.day, fixedRowHeight);
      pdf.text(`${day.name}`, currentX + 2, currentY + 7);
      pdf.setFontSize(8);
      pdf.text(dayDateString, currentX + 2, currentY + 13);
      pdf.setFontSize(9);
      
      // Activities column - all activities in one cell with compact line breaks
      currentX += colWidths.day;
      pdf.rect(currentX, currentY, colWidths.activities, fixedRowHeight);
      
      // Individual hours column - draw border first
      const hoursColumnX = currentX + colWidths.activities;
      pdf.rect(hoursColumnX, currentY, colWidths.individualHours, fixedRowHeight);
      
      if (activitiesWithHours.length > 0) {
        let textY = currentY + 6;
        const lineSpacing = 4; // Compact spacing between activities
        
        activitiesWithHours.forEach((activity, activityIndex) => {
          // Show activity text in activities column
          const wrappedText = pdf.splitTextToSize(activity.text, colWidths.activities - 4);
          if (textY < currentY + fixedRowHeight - 2 && wrappedText.length > 0) {
            pdf.text(wrappedText[0], currentX + 2, textY);
            
            // Show hours for THIS activity in hours column at SAME Y position
            if (activity.hours > 0) {
              pdf.text(activity.hours.toString(), hoursColumnX + 10, textY, { align: 'center' });
            }
            
            textY += lineSpacing;
          }
        });
      }
      
      // Total hours column
      currentX = hoursColumnX + colWidths.individualHours;
      pdf.rect(currentX, currentY, colWidths.totalHours, fixedRowHeight);
      const displayHours = dayTotalHours > 0 ? dayTotalHours : (dayActivities.length > 0 ? dayHours : 0);
      if (displayHours > 0) {
        pdf.text(displayHours.toString(), currentX + 12, currentY + 12, { align: 'center' });
        totalHours += displayHours;
      }
      
      currentY += fixedRowHeight;
    });

    // Total hours row
    pdf.setFont('helvetica', 'bold');
    currentX = 20 + colWidths.day + colWidths.activities;
    pdf.rect(currentX, currentY, colWidths.individualHours, 12);
    pdf.rect(currentX + colWidths.individualHours, currentY, colWidths.totalHours, 12);
    pdf.text('Gesamt:', currentX + 2, currentY + 8);
    pdf.text(totalHours.toString(), currentX + colWidths.individualHours + 12, currentY + 8, { align: 'center' });

    // Besondere Bemerkungen section - nebeneinander für mehr Platz
    const remarksY = currentY + 20;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Besondere Bemerkungen:', 20, remarksY);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    const remarksWidth = (pageWidth - 10) / 2; // Zwei Spalten nebeneinander
    
    // Auszubildender remarks (links)
    pdf.text('Auszubildender:', 20, remarksY + 12);
    pdf.rect(20, remarksY + 15, remarksWidth, 20);
    
    // Ausbilder remarks (rechts)
    pdf.text('Ausbilder:', 20 + remarksWidth + 10, remarksY + 12);
    pdf.rect(20 + remarksWidth + 10, remarksY + 15, remarksWidth, 20);

    // Signature section - "Für die Richtigkeit"
    const signatureY = remarksY + 45; // Weniger Abstand wegen kompakterem Layout
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Für die Richtigkeit:', 20, signatureY);
    
    // Signature lines (korrekte Seitenränder beachten)
    const signatureWidth = (pageWidth - 20) / 2; // Split in half with gap
    pdf.line(20, signatureY + 15, 20 + signatureWidth - 10, signatureY + 15);
    pdf.line(20 + signatureWidth + 10, signatureY + 15, 190, signatureY + 15); // Rechter Rand bei 190
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Auszubildender', 20, signatureY + 22);
    pdf.text('Ausbilder', 20 + signatureWidth + 10, signatureY + 22);
  }
}