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
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Ferienverwaltung</h2>

      {/* Formular zum Hinzufügen */}
      <form onSubmit={handleAddVacation} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Startdatum
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enddatum
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. Sommerferien"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Wird hinzugefügt...' : 'Ferienperiode hinzufügen'}
        </button>

        {message && (
          <p className={`mt-4 text-sm ${message.includes('erfolgreich') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </form>

      {/* Liste der Ferienperioden */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Eingetragene Ferien ({vacations.length})</h3>
        
        {vacations.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Noch keine Ferienperioden eingetragen
          </p>
        ) : (
          <div className="space-y-3">
            {vacations.map((vacation) => (
              <div
                key={vacation.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {formatDateRange(vacation.startDate, vacation.endDate)}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {calculateDays(vacation.startDate, vacation.endDate)} Tage
                    </span>
                  </div>
                  {vacation.description && (
                    <p className="text-sm text-gray-600">{vacation.description}</p>
                  )}
                </div>
                
                <button
                  onClick={() => handleDeleteVacation(vacation.id)}
                  className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Löschen"
                >
                  🗑️ Löschen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Hinweis:</strong> Ferientage werden im Dashboard markiert und im PDF mit 0 Stunden angezeigt.
        </p>
      </div>
    </div>
  )
}
