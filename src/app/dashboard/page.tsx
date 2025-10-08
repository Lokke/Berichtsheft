'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, eachDayOfInterval, isSameDay, isPast } from 'date-fns'
import { de } from 'date-fns/locale'
import ThemeToggle from '@/components/ThemeToggle'

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
    console.log('🔥 REMOVE ACTIVITY called')
    console.log('  Date:', format(date, 'yyyy-MM-dd'))
    console.log('  Index to remove:', index)
    
    const currentActivities = getActivitiesForDate(date)
    console.log('  Current activities:', currentActivities)
    
    const totalHours = getWorkHoursForDay(date)
    console.log('  Total work hours:', totalHours)
    
    // Remove activity
    const newActivities = currentActivities.filter((_, i) => i !== index)
    console.log('  New activities (after filter):', newActivities)
    
    // Redistribute hours among remaining activities
    if (newActivities.length > 0) {
      const distributedHours = distributeHours(totalHours, newActivities.length)
      console.log('  Distributed hours:', distributedHours)
      
      const activitiesWithHours = newActivities.map((activity, i) => ({
        ...activity,
        duration: distributedHours[i]
      }))
      console.log('  Activities with redistributed hours:', activitiesWithHours)
      
      setActivitiesForDate(date, activitiesWithHours)
      console.log('  ✅ State updated with redistributed activities')
    } else {
      console.log('  ⚠️ No activities remaining - setting empty array')
      setActivitiesForDate(date, [])
      console.log('  ✅ State updated with empty array')
    }
  }

  // Helper: Update activity for specific date
  const updateActivityForDate = (date: Date, index: number, field: keyof ActivityEntry, value: string | number | undefined) => {
    const currentActivities = getActivitiesForDate(date)
    setActivitiesForDate(date, currentActivities.map((activity, i) => 
      i === index ? { ...activity, [field]: value } : activity
    ))
  }

  const saveEntry = async (date: Date, closeEditMode = true, forcedActivities?: ActivityEntry[]) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const activities = forcedActivities ?? getActivitiesForDate(date)
    const isCompleted = tempCompleted[dateKey] ?? false
    
    console.log('💾 SAVE ENTRY called')
    console.log('  Date:', dateKey)
    console.log('  Activities:', activities)
    console.log('  Forced activities?', forcedActivities ? 'YES' : 'NO')
    console.log('  closeEditMode:', closeEditMode)
    
    // Filter out empty activities
    const validActivities = activities.filter(a => a.description.trim())
    console.log('  Valid activities (filtered):', validActivities)
    
    // Remove empty activities from temp state
    if (validActivities.length !== activities.length) {
      setActivitiesForDate(date, validActivities)
      console.log('  ⚠️ Removed empty activities from temp state')
    }
    
    // If no valid activities, delete the entry from database
    if (validActivities.length === 0) {
      console.log('  🗑️ No valid activities - attempting DELETE')
      try {
        const existingEntry = getEntryForDate(date)
        console.log('  Existing entry in DB:', existingEntry)
        
        if (existingEntry) {
          console.log('  📤 Sending DELETE request...')
          // Delete the entry via API
          const response = await fetch(`/api/entries?date=${format(date, 'yyyy-MM-dd')}`, {
            method: 'DELETE'
          })
          
          console.log('  DELETE response status:', response.status)
          
          if (response.ok) {
            console.log('  ✅ DELETE successful, fetching entries...')
            await fetchEntries()
            console.log('  ✅ Entries refreshed')
          } else {
            console.error('  ❌ DELETE failed:', await response.text())
          }
        } else {
          console.log('  ℹ️ No existing entry in DB - nothing to delete')
        }
        
        // Clear temp state
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
        console.log('  🧹 Temp state cleared')
        
        if (closeEditMode) {
          setEditingDate(null)
          console.log('  🔒 Edit mode closed')
        }
      } catch (error) {
        console.error('  ❌ Error during DELETE:', error)
      }
      return
    }

    console.log('  📤 Sending POST request with activities...')
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

        console.log('  POST response status:', response.status)

        if (response.ok) {
          console.log('  ✅ POST successful, fetching entries...')
          await fetchEntries()
          console.log('  ✅ Entries refreshed')
          
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
          console.log('  🧹 Temp state cleared')
          
          if (closeEditMode) {
            setEditingDate(null)
            console.log('  🔒 Edit mode closed')
          }
        } else {
          console.error('  ❌ POST failed:', await response.text())
        }
      } catch (error) {
        console.error('  ❌ Error during POST:', error)
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
    <div className="min-h-screen px-3 md:px-4">
      <div className="max-w-6xl mx-auto">
        <div className="glass rounded-2xl p-4 mb-4 animate-slide-in">
          {/* Compact Modern Header */}
          <div className="flex items-center justify-between mb-4">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-2">
              <div className="text-2xl">📝</div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  Berichtsheft
                </h1>
                <div className="flex items-center gap-2 text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-semibold">KW {format(currentWeekStart, 'I', { locale: de })}</span>
                  <span>•</span>
                  <span>{format(currentWeekStart, 'yyyy', { locale: de })}</span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={generateAllWeeksPDF}
                className="btn-primary px-3 py-1.5 text-xs md:text-sm flex items-center gap-1.5"
                title="PDF generieren"
              >
                <span>📄</span>
                <span className="hidden md:inline">PDF</span>
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="px-3 py-1.5 text-sm rounded-xl transition-all"
                style={{
                  background: 'rgba(0, 0, 0, 0.02)',
                  border: '2px solid rgba(0, 0, 0, 0.1)',
                  color: 'var(--text-secondary)'
                }}
                title="Einstellungen"
              >
                ⚙️
              </button>
            </div>
          </div>

          {/* Compact Week Navigation */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousWeek}
                className="px-3 py-1.5 text-sm rounded-xl transition-all"
                style={{
                  background: 'rgba(0, 0, 0, 0.02)',
                  border: '2px solid rgba(0, 0, 0, 0.1)',
                  color: 'var(--text-secondary)'
                }}
                title="Vorwoche"
              >
                ←
              </button>
              <button
                onClick={goToCurrentWeek}
                className="btn-primary px-4 py-1.5 text-sm font-medium"
              >
                Heute
              </button>
              <button
                onClick={goToNextWeek}
                className="px-3 py-1.5 text-sm rounded-xl transition-all"
                style={{
                  background: 'rgba(0, 0, 0, 0.02)',
                  border: '2px solid rgba(0, 0, 0, 0.1)',
                  color: 'var(--text-secondary)'
                }}
                title="Nächste Woche"
              >
                →
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {format(currentWeekStart, 'dd.MM.')} - {format(weekEnd, 'dd.MM.yyyy', { locale: de })}
            </p>
          </div>
        </div>

        {/* Weekly Calendar - Compact Cards */}
        <div className="space-y-3">
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
                className={`glass rounded-xl p-4 transition-all duration-300 ${
                  isVacation
                    ? 'opacity-90 cursor-default border-2 border-purple-400/30'
                    : !isDayEnabled
                    ? 'opacity-50 cursor-not-allowed'
                    : entry && entry.activities && entry.activities.length > 0
                    ? 'border-2 border-green-400/30'
                    : isPast(day) && !isToday
                    ? 'border-2 border-red-400/30'
                    : 'border-2 border-transparent hover:border-purple-400/30'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {dayName}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {dayDate}
                    </div>
                    {isToday && (
                      <span className="badge badge-green text-xs">
                        ✨ Heute
                      </span>
                    )}
                    {isVacation && (
                      <span className="badge badge-vacation text-xs">
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
                
                {/* Activities Display with Click-to-Edit */}
                <div className="space-y-2">
                  {isVacation ? (
                    <div className="text-sm flex items-center gap-3 px-5 py-4 rounded-2xl" style={{ 
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
                      border: '2px solid #a78bfa'
                    }}>
                      <span className="text-2xl">🏖️</span>
                      <span className="font-bold text-base" style={{ color: '#7c3aed' }}>Ferientag</span>
                    </div>
                  ) : !isDayEnabled ? (
                    <div className="text-sm flex items-center gap-2 px-3 py-2 rounded-xl glass-strong" style={{ color: 'var(--text-tertiary)' }}>
                      <span className="not-italic">🚫</span>
                      <span className="italic">Dieser Wochentag ist deaktiviert</span>
                    </div>
                  ) : (
                    <>
                      {getActivitiesForDate(day).map((activityItem, index) => {
                        const isEditing = editingDate === `${format(day, 'yyyy-MM-dd')}-${index}`
                        const accentColor = index % 4 === 0 ? '#7c3aed' : 
                                          index % 4 === 1 ? '#ec4899' : 
                                          index % 4 === 2 ? '#14b8a6' : 
                                          '#f97316'
                        
                        return (
                          <div key={index} className="flex items-center gap-2">
                            {/* Colorful accent bar */}
                            <div className={`w-1 h-10 rounded-full ${
                              index % 4 === 0 ? 'accent-bar-purple' : 
                              index % 4 === 1 ? 'accent-bar-pink' : 
                              index % 4 === 2 ? 'accent-bar-teal' : 
                              'accent-bar-orange'
                            }`}></div>
                            
                            {isEditing ? (
                              /* Edit Mode */
                              <div 
                                className="flex-1 flex gap-2 items-center p-3 rounded-lg" 
                                style={{
                                  background: 'rgba(0, 0, 0, 0.03)',
                                  border: `2px solid ${accentColor}`
                                }}
                              >
                                <div className="flex-1 min-h-[1.25rem]">
                                  <input
                                    type="text"
                                    value={activityItem.description}
                                    onChange={(e) => updateActivityForDate(day, index, 'description', e.target.value)}
                                    onKeyDown={async (e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        // Save current entry if it has content
                                        if (activityItem.description.trim()) {
                                          await saveEntry(day, false)
                                          // Add new activity and focus it
                                          addActivityToDate(day)
                                          // Wait for new activity to be added
                                          await new Promise(resolve => setTimeout(resolve, 50))
                                          // Set editing to the new activity
                                          const newIndex = getActivitiesForDate(day).length - 1
                                          setEditingDate(`${format(day, 'yyyy-MM-dd')}-${newIndex}`)
                                        }
                                      } else if (e.key === 'Escape') {
                                        // Only close if current activity is empty, otherwise just exit edit mode
                                        if (!activityItem.description.trim()) {
                                          removeActivityFromDate(day, index)
                                        }
                                        setEditingDate(null)
                                      }
                                    }}
                                    placeholder="Tätigkeit eingeben..."
                                    className="w-full bg-transparent outline-none text-sm font-medium leading-tight"
                                    style={{ color: accentColor }}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                
                                {/* Duration Badge with Plus/Minus */}
                                <div className="flex items-center gap-1 px-3 py-1 rounded-full text-white" style={{
                                  background: accentColor,
                                  boxShadow: `0 2px 8px ${accentColor}40`
                                }}>
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                    }}
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      const newDuration = Math.max(0, (activityItem.duration || 0) - 0.5)
                                      updateActivityForDate(day, index, 'duration', newDuration || undefined)
                                      // Wait a bit for state to update before saving
                                      await new Promise(resolve => setTimeout(resolve, 50))
                                      saveEntry(day, false) // Don't close edit mode
                                    }}
                                    className="text-white hover:opacity-70 transition-opacity text-xs font-bold"
                                    title="Minus 0.5h"
                                    type="button"
                                  >
                                    −
                                  </button>
                                  <span className="text-xs font-bold min-w-[2rem] text-center">
                                    {activityItem.duration || 0}h
                                  </span>
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                    }}
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      const newDuration = Math.min(getWorkHoursForDay(day), (activityItem.duration || 0) + 0.5)
                                      updateActivityForDate(day, index, 'duration', newDuration)
                                      // Wait a bit for state to update before saving
                                      await new Promise(resolve => setTimeout(resolve, 50))
                                      saveEntry(day, false) // Don't close edit mode
                                    }}
                                    className="text-white hover:opacity-70 transition-opacity text-xs font-bold"
                                    title="Plus 0.5h"
                                    type="button"
                                  >
                                    +
                                  </button>
                                </div>
                                
                                <button
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                  }}
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    console.log('🗑️ DELETE BUTTON CLICKED')
                                    console.log('  Date:', format(day, 'yyyy-MM-dd'))
                                    console.log('  Index:', index)
                                    
                                    const currentActivities = getActivitiesForDate(day)
                                    console.log('  Current activities BEFORE delete:', currentActivities)
                                    
                                    // Calculate new activities directly
                                    const totalHours = getWorkHoursForDay(day)
                                    const newActivities = currentActivities.filter((_, i) => i !== index)
                                    console.log('  New activities (after filter):', newActivities)
                                    
                                    let activitiesToSave: ActivityEntry[]
                                    
                                    // Update state with calculated activities
                                    if (newActivities.length > 0) {
                                      const distributedHours = distributeHours(totalHours, newActivities.length)
                                      activitiesToSave = newActivities.map((activity, i) => ({
                                        ...activity,
                                        duration: distributedHours[i]
                                      }))
                                      console.log('  Activities with redistributed hours:', activitiesToSave)
                                      setActivitiesForDate(day, activitiesToSave)
                                    } else {
                                      console.log('  No activities remaining - setting empty array')
                                      activitiesToSave = []
                                      setActivitiesForDate(day, [])
                                    }
                                    
                                    // Save with the calculated activities (don't wait for state)
                                    console.log('  📤 Calling saveEntry with forced activities...')
                                    await saveEntry(day, true, activitiesToSave)
                                    console.log('  ✅ saveEntry completed')
                                    
                                    setEditingDate(null)
                                    console.log('  ✅ Edit mode closed')
                                  }}
                                  className="h-[26px] w-[26px] flex items-center justify-center text-white text-xs rounded-full hover:opacity-80 transition-opacity font-bold"
                                  style={{ 
                                    backgroundColor: accentColor,
                                    boxShadow: `0 2px 8px ${accentColor}40`
                                  }}
                                  title="Löschen"
                                  type="button"
                                >
                                  ✕
                                </button>
                                <button
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                  }}
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    // Add new activity
                                    addActivityToDate(day)
                                    // Wait for state to update
                                    await new Promise(resolve => setTimeout(resolve, 50))
                                    // Set editing to the new activity (last one)
                                    const newIndex = getActivitiesForDate(day).length - 1
                                    setEditingDate(`${format(day, 'yyyy-MM-dd')}-${newIndex}`)
                                  }}
                                  className="h-[26px] w-[26px] flex items-center justify-center text-white text-xs rounded-full hover:opacity-80 transition-opacity font-bold"
                                  style={{ 
                                    backgroundColor: accentColor,
                                    boxShadow: `0 2px 8px ${accentColor}40`
                                  }}
                                  title="Weitere Tätigkeit hinzufügen"
                                  type="button"
                                >
                                  <span style={{ transform: 'rotate(45deg)', display: 'inline-block' }}>✕</span>
                                </button>
                              </div>
                            ) : (
                              /* Display Mode - Click to Edit */
                              <div 
                                className="flex-1 flex justify-between items-center p-3 rounded-lg cursor-text transition-all hover:shadow-md"
                                style={{
                                  background: 'rgba(0, 0, 0, 0.02)',
                                  border: '2px solid rgba(0, 0, 0, 0.05)'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingDate(`${format(day, 'yyyy-MM-dd')}-${index}`)
                                }}
                              >
                                <span className="text-sm font-medium leading-tight min-h-[1.25rem] inline-block" style={{ 
                                  color: accentColor,
                                  textShadow: `0 0 30px ${accentColor}80, 0 0 15px ${accentColor}60, 0 0 8px ${accentColor}40, 0 1px 3px rgba(0,0,0,0.3)`
                                }}>
                                  {activityItem.description || '(leer)'}
                                </span>
                                {activityItem.duration && (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{
                                    background: accentColor,
                                    boxShadow: `0 2px 8px ${accentColor}40`
                                  }}>
                                    {activityItem.duration}h
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      {getActivitiesForDate(day).length === 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            addActivityToDate(day)
                          }}
                          className="w-full text-sm italic px-3 py-3 text-center rounded-lg transition-all hover:bg-purple-50" 
                          style={{ 
                            color: 'var(--text-tertiary)',
                            background: 'rgba(255, 255, 255, 0.5)',
                            border: '2px dashed #cbd5e0'
                          }}
                        >
                          + Tätigkeit hinzufügen
                        </button>
                      )}
                    </>
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
