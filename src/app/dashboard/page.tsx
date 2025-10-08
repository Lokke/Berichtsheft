'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isPast, isToday } from 'date-fns'
import { de } from 'date-fns/locale'

interface ActivityEntry {
  id?: string
  description: string
  duration?: number // Stunden
  order: number
}

interface Entry {
  id: string
  date: string
  activities: ActivityEntry[]
  isCompleted: boolean
  week: number
}

interface VacationPeriod {
  id: string
  startDate: string
  endDate: string
  description: string | null
}

export default function Dashboard() {
  const router = useRouter()
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Start with Monday of current week
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)
    return monday
  })
  const [entries, setEntries] = useState<Entry[]>([])
  const [editingDate, setEditingDate] = useState<string | null>(null) // Format: 'YYYY-MM-DD'
  const [tempActivities, setTempActivities] = useState<{[key: string]: ActivityEntry[]}>({})
  const [tempCompleted, setTempCompleted] = useState<{[key: string]: boolean}>({})
  const [loading, setLoading] = useState(false)
  const [userConfig, setUserConfig] = useState<any>(null)
  const [vacations, setVacations] = useState<VacationPeriod[]>([])

  const fetchUserConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/user/settings')
      if (response.ok) {
        const data = await response.json()
        setUserConfig(data.user)
      } else if (response.status === 401) {
        console.log('❌ User not authenticated, middleware will redirect')
        // Let middleware handle redirect
      }
    } catch (error) {
      console.error('Failed to fetch user config:', error)
    }
  }, [])

  const fetchEntries = useCallback(async () => {
    try {
      // Fetch entries for the entire month that contains current week
      const month = currentWeekStart.getMonth() + 1
      const year = currentWeekStart.getFullYear()
      const response = await fetch(`/api/entries?month=${month}&year=${year}`)
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries)
      } else if (response.status === 401) {
        console.log('❌ User not authenticated, middleware will redirect')
        // Let middleware handle redirect
      }
    } catch (error) {
      console.error('Failed to fetch entries:', error)
    }
  }, [currentWeekStart])

  const fetchVacations = useCallback(async () => {
    try {
      const response = await fetch('/api/user/vacations')
      if (response.ok) {
        const data = await response.json()
        setVacations(data)
      }
    } catch (error) {
      console.error('Failed to fetch vacations:', error)
    }
  }, [])

  useEffect(() => {
    fetchUserConfig()
    fetchEntries()
    fetchVacations()
  }, [fetchUserConfig, fetchEntries, fetchVacations])

  // Helper: Check if date is in vacation period
  const isVacationDay = (date: Date): boolean => {
    // Normalize date to midnight local time for comparison
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    const checkTime = checkDate.getTime()
    
    return vacations.some(vacation => {
      // Parse dates and normalize to midnight local time
      const start = new Date(vacation.startDate)
      start.setHours(0, 0, 0, 0)
      
      const end = new Date(vacation.endDate)
      end.setHours(23, 59, 59, 999) // End of day
      
      const startTime = start.getTime()
      const endTime = end.getTime()
      
      return checkTime >= startTime && checkTime <= endTime
    })
  }

  // Helper: Get activities for a specific date
  const getActivitiesForDate = (date: Date): ActivityEntry[] => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return tempActivities[dateKey] || getEntryForDate(date)?.activities || []
  }

  // Helper: Set activities for a specific date
  const setActivitiesForDate = (date: Date, activities: ActivityEntry[]) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    setTempActivities(prev => ({ ...prev, [dateKey]: activities }))
  }

  // Helper: Distribute hours equally among activities, rounded to 0.5
  const distributeHours = (totalHours: number, activityCount: number): number[] => {
    if (activityCount === 0) return []
    
    const baseHours = totalHours / activityCount
    const roundedHours = Array(activityCount).fill(0).map(() => Math.round(baseHours * 2) / 2)
    
    // Calculate difference and adjust to ensure sum equals totalHours
    let sum = roundedHours.reduce((a, b) => a + b, 0)
    let diff = totalHours - sum
    
    // Adjust by 0.5 increments until we match the total
    let idx = 0
    while (Math.abs(diff) >= 0.5 && idx < activityCount) {
      if (diff > 0) {
        roundedHours[idx] += 0.5
        diff -= 0.5
      } else {
        if (roundedHours[idx] >= 0.5) {
          roundedHours[idx] -= 0.5
          diff += 0.5
        }
      }
      idx++
    }
    
    return roundedHours
  }

  // Helper: Add activity to specific date
  const addActivityToDate = (date: Date) => {
    const currentActivities = getActivitiesForDate(date)
    const totalHours = getWorkHoursForDay(date)
    
    // Create new activity list
    const newActivities = [...currentActivities, {
      description: '',
      duration: undefined,
      order: currentActivities.length
    }]
    
    // Distribute hours among all activities
    const distributedHours = distributeHours(totalHours, newActivities.length)
    const activitiesWithHours = newActivities.map((activity, i) => ({
      ...activity,
      duration: distributedHours[i]
    }))
    
    setActivitiesForDate(date, activitiesWithHours)
  }

  // Helper: Remove activity from specific date
  const removeActivityFromDate = (date: Date, index: number) => {
    const currentActivities = getActivitiesForDate(date)
    const totalHours = getWorkHoursForDay(date)
    
    // Remove activity
    const newActivities = currentActivities.filter((_, i) => i !== index)
    
    // Redistribute hours among remaining activities
    if (newActivities.length > 0) {
      const distributedHours = distributeHours(totalHours, newActivities.length)
      const activitiesWithHours = newActivities.map((activity, i) => ({
        ...activity,
        duration: distributedHours[i]
      }))
      setActivitiesForDate(date, activitiesWithHours)
    } else {
      setActivitiesForDate(date, [])
    }
  }

  // Helper: Update activity for specific date
  const updateActivityForDate = (date: Date, index: number, field: keyof ActivityEntry, value: string | number | undefined) => {
    const currentActivities = getActivitiesForDate(date)
    setActivitiesForDate(date, currentActivities.map((activity, i) => 
      i === index ? { ...activity, [field]: value } : activity
    ))
  }

  const saveEntry = async (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const activities = getActivitiesForDate(date)
    const isCompleted = tempCompleted[dateKey] ?? false
    
    // Überprüfe ob mindestens eine Aktivität vorhanden ist
    const validActivities = activities.filter(a => a.description.trim())
    if (validActivities.length === 0) return

    setLoading(true)
    try {
        const response = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: format(date, 'yyyy-MM-dd'),
            activities: validActivities,
            isCompleted
          })
        })

        if (response.ok) {
          await fetchEntries()
          // Clear temp state for this date
          setTempActivities(prev => {
            const newState = { ...prev }
            delete newState[dateKey]
            return newState
          })
          setTempCompleted(prev => {
            const newState = { ...prev }
            delete newState[dateKey]
            return newState
          })
          setEditingDate(null)
        }
      } catch (error) {
        console.error('Fehler beim Speichern:', error)
      }
      setLoading(false)
  }

  // Toggle edit mode for a date
  const toggleEditMode = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    
    if (editingDate === dateKey) {
      // Exit edit mode - save if there are changes
      saveEntry(date)
    } else {
      // Enter edit mode
      setEditingDate(dateKey)
      const entry = getEntryForDate(date)
      if (!tempActivities[dateKey]) {
        setTempActivities(prev => ({ 
          ...prev, 
          [dateKey]: entry?.activities || [] 
        }))
      }
      if (tempCompleted[dateKey] === undefined) {
        setTempCompleted(prev => ({ 
          ...prev, 
          [dateKey]: entry?.isCompleted || false 
        }))
      }
    }
  }

  const generateAllWeeksPDF = async () => {
    try {
      const response = await fetch('/api/pdf')
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `berichtsheft-alle-wochen.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorData = await response.json()
        alert(`PDF-Generierung fehlgeschlagen:\n\n${errorData.error}\n\n${errorData.details || ''}`)
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      alert('PDF-Generierung fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung.')
    }
  }

  // Helper function to check if a weekday is enabled
  const isWeekdayEnabled = (date: Date): boolean => {
    if (!userConfig) return true // Show all days if config not loaded yet
    
    const dayOfWeek = date.getDay()
    const dayConfig = [
      userConfig.sundayEnabled,
      userConfig.mondayEnabled,
      userConfig.tuesdayEnabled,
      userConfig.wednesdayEnabled,
      userConfig.thursdayEnabled,
      userConfig.fridayEnabled,
      userConfig.saturdayEnabled
    ]
    
    return dayConfig[dayOfWeek] || false
  }

  // Helper function to get work hours for a weekday
  const getWorkHoursForDay = (date: Date): number => {
    if (!userConfig) return 8.0 // Default if config not loaded yet
    
    const dayOfWeek = date.getDay()
    const dayHours = [
      userConfig.sundayHours,
      userConfig.mondayHours,
      userConfig.tuesdayHours,
      userConfig.wednesdayHours,
      userConfig.thursdayHours,
      userConfig.fridayHours,
      userConfig.saturdayHours
    ]
    
    return dayHours[dayOfWeek] || 8.0
  }

  // Calculate current week (Monday to Sunday)
  const weekEnd = new Date(currentWeekStart)
  weekEnd.setDate(currentWeekStart.getDate() + 6)
  
  const allWeekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd })
  const weekDays = allWeekDays.filter(day => isWeekdayEnabled(day))
  
  // Navigation functions
  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentWeekStart)
    prevWeek.setDate(currentWeekStart.getDate() - 7)
    setCurrentWeekStart(prevWeek)
  }
  
  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeekStart)
    nextWeek.setDate(currentWeekStart.getDate() + 7)
    setCurrentWeekStart(nextWeek)
  }
  
  const goToCurrentWeek = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)
    setCurrentWeekStart(monday)
  }

  const getEntryForDate = (date: Date) => {
    return entries.find(entry => isSameDay(new Date(entry.date), date))
  }



  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Berichtsheft - KW {format(currentWeekStart, 'I', { locale: de })} / {format(currentWeekStart, 'yyyy', { locale: de })}
            </h1>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                ⚙️ Einstellungen
              </button>
              <button
                onClick={goToPreviousWeek}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                ← Vorwoche
              </button>
              <button
                onClick={goToCurrentWeek}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Heute
              </button>
              <button
                onClick={goToNextWeek}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Nächste Woche →
              </button>
              <button
                onClick={generateAllWeeksPDF}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                � Berichtsheft PDF generieren
              </button>
            </div>
          </div>

          {/* Legend */}
                    <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Woche vom {format(currentWeekStart, 'dd.MM.yyyy', { locale: de })} bis {format(weekEnd, 'dd.MM.yyyy', { locale: de })}
            </p>
          </div>

          {/* Wochenliste - ähnlich PDF Layout */}
          <div className="space-y-4 mb-6">
            {allWeekDays.map(day => {
              const entry = getEntryForDate(day)
              const dayName = format(day, 'EEEE', { locale: de })
              const dayDate = format(day, 'dd.MM.yyyy', { locale: de })
              const isToday = isSameDay(day, new Date())
              const isDayEnabled = isWeekdayEnabled(day)
              const isVacation = isVacationDay(day)
              
              return (
                <div
                  key={day.toISOString()}
                  className={`bg-white rounded-lg border-2 p-4 transition-all ${
                    isVacation
                      ? 'border-purple-300 bg-purple-50 cursor-default'
                      : !isDayEnabled
                      ? 'opacity-50 border-gray-200 bg-gray-100 cursor-not-allowed'
                      : editingDate && isSameDay(day, new Date(editingDate + 'T00:00:00'))
                      ? 'border-blue-500 bg-blue-50 cursor-pointer'
                      : entry && entry.activities && entry.activities.length > 0
                      ? 'border-green-300 bg-green-50 cursor-pointer'
                      : isPast(day) && !isToday
                      ? 'border-red-300 bg-red-50 cursor-pointer'
                      : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!isDayEnabled || isVacation) return // Verhindere Klicks auf deaktivierte Tage und Ferientage
                    toggleEditMode(day)
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-bold text-gray-900">
                        {dayName}
                      </div>
                      <div className="text-sm text-gray-600">
                        {dayDate}
                      </div>
                      {isToday && (
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                          Heute
                        </span>
                      )}
                      {isVacation && (
                        <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                          🏖️ Ferien
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {entry && entry.activities && entry.activities.length > 0 && !isVacation && (
                        <span className="text-green-600" title="Abgeschlossen">
                          ✅
                        </span>
                      )}
                      {!entry && isPast(day) && !isToday && !isVacation && (
                        <span className="text-red-600" title="Kein Eintrag">
                          ⚠️
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Aktivitäten anzeigen oder Inline-Editing */}
                  <div className="space-y-2">
                    {isVacation ? (
                      <div className="text-sm text-purple-700 italic flex items-center gap-2">
                        🏖️ Ferientag (0 Stunden)
                      </div>
                    ) : !isDayEnabled ? (
                      <div className="text-sm text-gray-500 italic flex items-center gap-2">
                        🚫 Dieser Wochentag ist in Ihren Arbeitszeit-Einstellungen deaktiviert
                      </div>
                    ) : editingDate === format(day, 'yyyy-MM-dd') ? (
                      /* Inline-Editing-Modus */
                      <div className="space-y-3 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-medium text-blue-800">Tätigkeiten bearbeiten:</h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addActivityToDate(day)
                            }}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            + Hinzufügen
                          </button>
                        </div>
                        
                        {getActivitiesForDate(day).map((activityItem, index) => (
                          <div key={index} className="flex gap-2 items-center bg-white p-2 rounded border">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={activityItem.description}
                                onChange={(e) => updateActivityForDate(day, index, 'description', e.target.value)}
                                placeholder="Beschreibung der Tätigkeit..."
                                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="w-20">
                              <input
                                type="number"
                                value={activityItem.duration || ''}
                                onChange={(e) => updateActivityForDate(day, index, 'duration', parseFloat(e.target.value) || undefined)}
                                placeholder="Std."
                                step="0.5"
                                min="0"
                                max={getWorkHoursForDay(day)}
                                className="w-full p-2 border border-gray-300 rounded text-center text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeActivityFromDate(day, index)
                              }}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        
                        {getActivitiesForDate(day).length === 0 && (
                          <div className="text-center py-2 text-gray-500 text-sm">
                            Keine Tätigkeiten. Klicken Sie auf "+ Hinzufügen".
                          </div>
                        )}
                        
                        <div className="flex items-center justify-end pt-2 border-t border-blue-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              saveEntry(day)
                            }}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 font-medium"
                          >
                            Speichern
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normale Anzeige */
                      entry?.activities && entry.activities.length > 0 ? (
                        entry.activities.map((activity: any, index: number) => (
                          <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <span className="text-sm text-gray-700">
                              {activity.description}
                            </span>
                            {activity.duration && (
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                {activity.duration}h
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-400 italic">
                          Keine Tätigkeiten eingetragen - Klicken zum Bearbeiten
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>



          {/* Inline Editing - No separate form needed */}
        </div>
      </div>
    </div>
  )
}