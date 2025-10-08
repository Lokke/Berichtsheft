'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface VacationPeriod {
  id: string
  startDate: string
  endDate: string
  description: string | null
}

export default function VacationManager() {
  const [vacations, setVacations] = useState<VacationPeriod[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchVacations()
  }, [])

  const fetchVacations = async () => {
    try {
      const response = await fetch('/api/user/vacations')
      if (response.ok) {
        const data = await response.json()
        setVacations(data)
      }
    } catch (error) {
      console.error('Failed to fetch vacations:', error)
    }
  }

  const handleAddVacation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!startDate || !endDate) {
      setMessage('Bitte Start- und Enddatum auswählen')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      setMessage('Startdatum muss vor dem Enddatum liegen')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/user/vacations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          description: description.trim() || null
        })
      })

      if (response.ok) {
        setMessage('Ferienperiode erfolgreich hinzugefügt')
        setStartDate('')
        setEndDate('')
        setDescription('')
        fetchVacations()
      } else {
        const error = await response.json()
        setMessage(error.error || 'Fehler beim Hinzufügen')
      }
    } catch (error) {
      setMessage('Fehler beim Hinzufügen der Ferienperiode')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteVacation = async (id: string) => {
    if (!confirm('Möchtest du diese Ferienperiode wirklich löschen?')) {
      return
    }

    try {
      const response = await fetch(`/api/user/vacations?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMessage('Ferienperiode gelöscht')
        fetchVacations()
      } else {
        setMessage('Fehler beim Löschen')
      }
    } catch (error) {
      setMessage('Fehler beim Löschen der Ferienperiode')
      console.error(error)
    }
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    return `${format(startDate, 'dd.MM.yyyy', { locale: de })} - ${format(endDate, 'dd.MM.yyyy', { locale: de })}`
  }

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        🏖️ Ferienverwaltung
      </h2>

      {/* Formular zum Hinzufügen */}
      <form onSubmit={handleAddVacation} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Startdatum
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-medium p-3 rounded-lg border-2 transition-all"
              style={{
                background: 'rgba(0, 0, 0, 0.02)',
                borderColor: 'rgba(0, 0, 0, 0.1)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7c3aed'
                e.target.style.background = 'rgba(0, 0, 0, 0.03)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 0, 0, 0.1)'
                e.target.style.background = 'rgba(0, 0, 0, 0.02)'
              }}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Enddatum
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-medium p-3 rounded-lg border-2 transition-all"
              style={{
                background: 'rgba(0, 0, 0, 0.02)',
                borderColor: 'rgba(0, 0, 0, 0.1)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ec4899'
                e.target.style.background = 'rgba(0, 0, 0, 0.03)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 0, 0, 0.1)'
                e.target.style.background = 'rgba(0, 0, 0, 0.02)'
              }}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Beschreibung (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. Sommerferien"
              className="w-full bg-transparent outline-none text-sm font-medium p-3 rounded-lg border-2 transition-all"
              style={{
                background: 'rgba(0, 0, 0, 0.02)',
                borderColor: 'rgba(0, 0, 0, 0.1)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#14b8a6'
                e.target.style.background = 'rgba(0, 0, 0, 0.03)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 0, 0, 0.1)'
                e.target.style.background = 'rgba(0, 0, 0, 0.02)'
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: loading ? 'rgba(124, 58, 237, 0.5)' : 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
            color: 'white',
            boxShadow: loading ? 'none' : '0 4px 14px rgba(20, 184, 166, 0.4)'
          }}
        >
          {loading ? '⏳ Wird hinzugefügt...' : '➕ Ferienperiode hinzufügen'}
        </button>

        {message && (
          <div className={`mt-4 p-4 rounded-xl border-2`} style={{
            background: 'rgba(0, 0, 0, 0.02)',
            borderColor: message.includes('erfolgreich') ? '#10b981' : '#ef4444',
            boxShadow: message.includes('erfolgreich') 
              ? '0 2px 12px rgba(16, 185, 129, 0.2)' 
              : '0 2px 12px rgba(239, 68, 68, 0.2)'
          }}>
            <p className="text-sm font-medium flex items-center gap-2" style={{
              color: message.includes('erfolgreich') ? '#10b981' : '#ef4444'
            }}>
              <span>{message.includes('erfolgreich') ? '✓' : '⚠️'}</span>
              {message}
            </p>
          </div>
        )}
      </form>

      {/* Liste der Ferienperioden */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Eingetragene Ferien ({vacations.length})
        </h3>
        
        {vacations.length === 0 ? (
          <div className="text-center py-8 rounded-xl border-2 backdrop-blur-sm" style={{ 
            background: 'rgba(0, 0, 0, 0.03)',
            borderColor: 'rgba(0, 0, 0, 0.1)',
            color: 'var(--text-tertiary)' 
          }}>
            📭 Noch keine Ferienperioden eingetragen
          </div>
        ) : (
          <div className="space-y-3">
            {vacations.map((vacation, index) => {
              const color = index % 4 === 0 ? '#7c3aed' : 
                           index % 4 === 1 ? '#ec4899' : 
                           index % 4 === 2 ? '#14b8a6' : 
                           '#f97316'
              
              return (
                <div
                  key={vacation.id}
                  className="flex items-center justify-between p-4 rounded-xl transition-all hover:shadow-md"
                  style={{
                    background: 'rgba(0, 0, 0, 0.02)',
                    border: `2px solid ${color}40`
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold" style={{ color }}>
                        {formatDateRange(vacation.startDate, vacation.endDate)}
                      </span>
                      <span className="text-xs px-3 py-1 rounded-full font-bold text-white" style={{
                        background: color,
                        boxShadow: `0 2px 8px ${color}40`
                      }}>
                        {calculateDays(vacation.startDate, vacation.endDate)} Tage
                      </span>
                    </div>
                    {vacation.description && (
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {vacation.description}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleDeleteVacation(vacation.id)}
                    className="ml-4 h-[32px] w-[32px] flex items-center justify-center text-white rounded-full hover:opacity-80 transition-all font-bold"
                    style={{
                      backgroundColor: '#ef4444',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                    }}
                    title="Löschen"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 rounded-xl border-2 backdrop-blur-sm" style={{ 
        background: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 0.3)' 
      }}>
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
          <strong>💡 Hinweis:</strong> Ferientage werden im Dashboard markiert und im PDF mit 0 Stunden angezeigt.
        </p>
      </div>
    </div>
  )
}
