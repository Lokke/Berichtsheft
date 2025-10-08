'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, eachDayOfInterval, isSameDay, isPast } from 'date-fns'
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

interface UserConfig {
  id: string
  email: string
  name: string | null
  surname: string | null
  trainingClass: string | null
  trainingProfessionId: string | null
  trainingStartDate: Date | null
  sundayEnabled: boolean
  mondayEnabled: boolean
  tuesdayEnabled: boolean
  wednesdayEnabled: boolean
  thursdayEnabled: boolean
  fridayEnabled: boolean
  saturdayEnabled: boolean
  sundayHours: number
  mondayHours: number
  tuesdayHours: number
  wednesdayHours: number
  thursdayHours: number
  fridayHours: number
  saturdayHours: number
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
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null)
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
        setVacations(data.vacations || [])
      }
    } catch (error) {
      console.error('Failed to fetch vacations:', error)
    }
  }, [])

  useEffect(() => {
    fetchUserConfig()
    fetchVacations()
  }, [fetchUserConfig, fetchVacations])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Check if a day is within any vacation period
  const isVacationDay = (date: Date): boolean => {
    return vacations.some(vacation => {
      const start = new Date(vacation.startDate)
      const end = new Date(vacation.endDate)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return date >= start && date <= end
    })
  }

  // Helper: Distribute hours evenly among activities
  const distributeHours = (totalHours: number, activityCount: number): number[] => {
    if (activityCount === 0) return []
    const hoursPerActivity = Math.floor((totalHours / activityCount) * 2) / 2 // Round to nearest 0.5
    const distributedHours = new Array(activityCount).fill(hoursPerActivity)
    
    // Distribute any remaining hours
    let remainingHours = totalHours - (hoursPerActivity * activityCount)
    let index = 0
    while (remainingHours > 0 && index < activityCount) {
      distributedHours[index] += 0.5
      remainingHours -= 0.5
      index++
    }
    
    return distributedHours
  }

  // Get activities for a specific date (from temp state or entries)
  const getActivitiesForDate = (date: Date): ActivityEntry[] => {
    const dateKey = format(date, 'yyyy-MM-dd')
    if (tempActivities[dateKey]) {
      return tempActivities[dateKey]
    }
    const entry = getEntryForDate(date)
    return entry?.activities || []
  }

  // Set activities for a specific date
  const setActivitiesForDate = (date: Date, activities: ActivityEntry[]) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    setTempActivities(prev => ({ ...prev, [dateKey]: activities }))
  }

  // Helper: Add activity to specific date
  const addActivityToDate = (date: Date) => {
    const currentActivities = getActivitiesForDate(date)
    const totalHours = getWorkHoursForDay(date)
    
    // Add new activity
    const newActivities = [
      ...currentActivities,
      { description: '', duration: 0, order: currentActivities.length }
    ]
    
    // Redistribute hours among all activities
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
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="glass-strong rounded-3xl p-6 mb-6 animate-slide-in">
          {/* Modern Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              📝 Berichtsheft
            </h1>
            <div className="flex items-center justify-center gap-2 text-lg md:text-xl" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold">KW {format(currentWeekStart, 'I', { locale: de })}</span>
              <span className="text-sm">•</span>
              <span>{format(currentWeekStart, 'yyyy', { locale: de })}</span>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {format(currentWeekStart, 'dd.MM.yyyy', { locale: de })} - {format(weekEnd, 'dd.MM.yyyy', { locale: de })}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousWeek}
                className="btn-secondary px-4 py-2 text-sm"
                title="Vorwoche"
              >
                ←
              </button>
              <button
                onClick={goToCurrentWeek}
                className="btn-primary px-6 py-2 text-sm font-medium"
              >
                Heute
              </button>
              <button
                onClick={goToNextWeek}
                className="btn-secondary px-4 py-2 text-sm"
                title="Nächste Woche"
              >
                →
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={generateAllWeeksPDF}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
              >
                <span>📄</span>
                <span className="hidden md:inline">PDF generieren</span>
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="btn-secondary px-4 py-2 text-sm"
                title="Einstellungen"
              >
                ⚙️
              </button>
            </div>
          </div>
        </div>

        {/* Weekly Calendar - Modern Glass Cards */}
        <div className="space-y-4">
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
                className={`glass rounded-2xl p-5 transition-all duration-300 ${
                  isVacation
                    ? 'opacity-90 cursor-default border-2 border-purple-400/30'
                    : !isDayEnabled
                    ? 'opacity-50 cursor-not-allowed'
                    : editingDate && isSameDay(day, new Date(editingDate + 'T00:00:00'))
                    ? 'cursor-pointer border-2 border-blue-500/50 shadow-lg'
                    : entry && entry.activities && entry.activities.length > 0
                    ? 'cursor-pointer hover:shadow-lg border-2 border-green-400/30'
                    : isPast(day) && !isToday
                    ? 'cursor-pointer hover:shadow-lg border-2 border-red-400/30'
                    : 'cursor-pointer hover:shadow-lg border-2 border-transparent hover:border-purple-400/30'
                }`}
                onClick={() => {
                  if (!isDayEnabled || isVacation) return
                  toggleEditMode(day)
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {dayName}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {dayDate}
                    </div>
                    {isToday && (
                      <span className="px-3 py-1 text-white text-xs rounded-full font-medium shadow-md" style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
                      }}>
                        ✨ Heute
                      </span>
                    )}
                    {isVacation && (
                      <span className="px-3 py-1 text-white text-xs rounded-full font-medium shadow-md" style={{
                        background: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)'
                      }}>
                        🏖️ Ferien
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {entry && entry.activities && entry.activities.length > 0 && !isVacation && (
                      <span className="text-green-500 text-xl" title="Abgeschlossen">
                        ✓
                      </span>
                    )}
                    {!entry && isPast(day) && !isToday && !isVacation && isDayEnabled && (
                      <span className="text-red-500 text-xl" title="Kein Eintrag">
                        ⚠
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Activities Display or Inline Editing */}
                <div className="space-y-2">
                  {isVacation ? (
                    <div className="text-sm flex items-center gap-2 px-4 py-3 rounded-xl" style={{ 
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(192, 132, 252, 0.15) 100%)',
                      border: '2px solid rgba(168, 85, 247, 0.3)'
                    }}>
                      <span className="text-lg">🏖️</span>
                      <span className="font-medium" style={{ color: 'var(--vacation-color)' }}>Ferientag</span>
                    </div>
                  ) : !isDayEnabled ? (
                    <div className="text-sm italic flex items-center gap-2 px-3 py-2 rounded-xl glass-strong" style={{ color: 'var(--text-tertiary)' }}>
                      🚫 Dieser Wochentag ist deaktiviert
                    </div>
                  ) : editingDate === format(day, 'yyyy-MM-dd') ? (
                    /* Inline-Editing-Modus */
                    <div className="space-y-3 p-4 rounded-xl" style={{
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                      border: '2px solid rgba(99, 102, 241, 0.2)'
                    }}>
                      {getActivitiesForDate(day).map((activityItem, index) => (
                        <div key={index} className="flex gap-2 items-center activity-card p-3 rounded-xl">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={activityItem.description}
                              onChange={(e) => updateActivityForDate(day, index, 'description', e.target.value)}
                              placeholder="Beschreibung der Tätigkeit..."
                              className="input w-full"
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
                              className="input w-full text-center text-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeActivityFromDate(day, index)
                            }}
                            className="px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-xl hover:shadow-lg transition-all font-medium"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      
                      {getActivitiesForDate(day).length === 0 && (
                        <div className="text-center py-3 text-sm italic" style={{ color: 'var(--text-tertiary)' }}>
                          Keine Tätigkeiten. Klicken Sie auf &quot;+ Hinzufügen&quot;.
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            addActivityToDate(day)
                          }}
                          className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                        >
                          <span>+</span>
                          <span>Hinzufügen</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            saveEntry(day)
                          }}
                          className="btn-primary px-6 py-2 text-sm font-semibold"
                        >
                          💾 Speichern
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Display */
                    entry?.activities && entry.activities.length > 0 ? (
                      entry.activities.map((activity, index: number) => (
                        <div key={index} className="flex justify-between items-center activity-card p-4 rounded-xl">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {activity.description}
                          </span>
                          {activity.duration && (
                            <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ 
                              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                              color: 'var(--primary)',
                              border: '1px solid rgba(99, 102, 241, 0.2)'
                            }}>
                              {activity.duration}h
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm italic px-3 py-2" style={{ color: 'var(--text-tertiary)' }}>
                        Keine Tätigkeiten eingetragen - Klicken zum Bearbeiten
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
