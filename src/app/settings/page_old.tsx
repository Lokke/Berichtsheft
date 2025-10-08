'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import TrainingProfessionSearch from '@/components/TrainingProfessionSearch'
import VacationManager from '@/components/VacationManager'

interface UserSettings {
  name: string
  surname: string
  email: string
  trainingClass: string
  trainingProfessionId: string | null
  trainingProfessionName: string
  trainingStartDate: string
  department: string
  // Arbeitszeit-Konfiguration
  mondayEnabled: boolean
  mondayHours: number
  tuesdayEnabled: boolean
  tuesdayHours: number
  wednesdayEnabled: boolean
  wednesdayHours: number
  thursdayEnabled: boolean
  thursdayHours: number
  fridayEnabled: boolean
  fridayHours: number
  saturdayEnabled: boolean
  saturdayHours: number
  sundayEnabled: boolean
  sundayHours: number
}

export default function SettingsPage() {
  const [isWelcome, setIsWelcome] = useState(false)
  const [settings, setSettings] = useState<UserSettings>({
    name: '',
    surname: '',
    email: '',
    trainingClass: '',
    trainingProfessionId: null,
    trainingProfessionName: '',
    trainingStartDate: '',
    department: 'EDV',
    // Arbeitszeit-Standardwerte
    mondayEnabled: true,
    mondayHours: 8.0,
    tuesdayEnabled: true,
    tuesdayHours: 8.0,
    wednesdayEnabled: true,
    wednesdayHours: 8.0,
    thursdayEnabled: true,
    thursdayHours: 8.0,
    fridayEnabled: true,
    fridayHours: 8.0,
    saturdayEnabled: false,
    saturdayHours: 8.0,
    sundayEnabled: false,
    sundayHours: 8.0
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const fetchUserSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/user/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings({
          name: data.user.name || '',
          surname: data.user.surname || '',
          email: data.user.email || '',
          trainingClass: data.user.trainingClass || '',
          trainingProfessionId: data.user.trainingProfessionId || null,
          trainingProfessionName: data.user.trainingProfession?.name || '',
          trainingStartDate: data.user.trainingStartDate 
            ? new Date(data.user.trainingStartDate).toISOString().split('T')[0] 
            : '',
          department: data.user.department || 'EDV',
          // Arbeitszeit-Konfiguration aus der Datenbank
          mondayEnabled: data.user.mondayEnabled ?? true,
          mondayHours: data.user.mondayHours ?? 8.0,
          tuesdayEnabled: data.user.tuesdayEnabled ?? true,
          tuesdayHours: data.user.tuesdayHours ?? 8.0,
          wednesdayEnabled: data.user.wednesdayEnabled ?? true,
          wednesdayHours: data.user.wednesdayHours ?? 8.0,
          thursdayEnabled: data.user.thursdayEnabled ?? true,
          thursdayHours: data.user.thursdayHours ?? 8.0,
          fridayEnabled: data.user.fridayEnabled ?? true,
          fridayHours: data.user.fridayHours ?? 8.0,
          saturdayEnabled: data.user.saturdayEnabled ?? false,
          saturdayHours: data.user.saturdayHours ?? 8.0,
          sundayEnabled: data.user.sundayEnabled ?? false,
          sundayHours: data.user.sundayHours ?? 8.0
        })
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }, [router])

  useEffect(() => {
    // Prüfe ob dies ein Willkommens-Besuch nach Registrierung ist
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('welcome') === 'true') {
      setIsWelcome(true)
    }
    
    fetchUserSettings()
  }, [fetchUserSettings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          trainingStartDate: settings.trainingStartDate ? new Date(settings.trainingStartDate) : null
        })
      })

      if (response.ok) {
        setMessage('Einstellungen erfolgreich gespeichert!')
        
        // Nach dem ersten Setup (Willkommens-Modus) zum Dashboard weiterleiten
        if (isWelcome) {
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500) // 1.5 Sekunden warten, damit die Erfolgsmeldung sichtbar ist
        }
      } else {
        const data = await response.json()
        setMessage(data.error || 'Fehler beim Speichern')
      }
    } catch {
      setMessage('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof UserSettings, value: string) => {
    setSettings(prev => {
      // Handle boolean fields (enabled checkboxes)
      if (field.endsWith('Enabled')) {
        return { ...prev, [field]: value === 'true' }
      }
      // Handle number fields (hours)
      if (field.endsWith('Hours')) {
        return { ...prev, [field]: parseFloat(value) }
      }
      // Handle string fields
      return { ...prev, [field]: value }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Willkommens-Banner für neue Benutzer */}
          {isWelcome && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-blue-900">
                    Willkommen! Einstellungen erforderlich
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    Bitte konfigurieren Sie zuerst Ihre persönlichen Daten und Arbeitszeiten, 
                    bevor Sie mit dem Berichtsheft beginnen können.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Zurück zum Dashboard
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vorname *
                </label>
                <input
                  type="text"
                  required
                  value={settings.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nachname *
                </label>
                <input
                  type="text"
                  required
                  value={settings.surname}
                  onChange={(e) => handleInputChange('surname', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse
              </label>
              <input
                type="email"
                value={settings.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">E-Mail kann nicht geändert werden</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ausbildungsberuf *
              </label>
              <TrainingProfessionSearch
                value={settings.trainingProfessionId}
                initialName={settings.trainingProfessionName}
                onChange={(professionId, professionName) => {
                  setSettings(prev => ({
                    ...prev,
                    trainingProfessionId: professionId,
                    trainingProfessionName: professionName
                  }))
                }}
                placeholder="Ausbildungsberuf suchen, z.B. Fachinformatiker..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Klasse
                </label>
                <input
                  type="text"
                  value={settings.trainingClass}
                  onChange={(e) => handleInputChange('trainingClass', e.target.value)}
                  placeholder="z.B. FI-AE-22A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Abteilung
                </label>
                <input
                  type="text"
                  value={settings.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ausbildungsbeginn *
              </label>
              <input
                type="date"
                required
                value={settings.trainingStartDate}
                onChange={(e) => handleInputChange('trainingStartDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Wird zur Berechnung des Ausbildungsjahres verwendet
              </p>
            </div>

            {/* Arbeitszeit-Konfiguration */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Arbeitszeit-Konfiguration
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Konfigurieren Sie Ihre Arbeitszeiten pro Wochentag. Deaktivierte Tage werden weder im Dashboard noch in den PDF-Berichten angezeigt.
              </p>
              
              <div className="space-y-4">
                {[
                  { key: 'monday', label: 'Montag', enabled: settings.mondayEnabled, hours: settings.mondayHours },
                  { key: 'tuesday', label: 'Dienstag', enabled: settings.tuesdayEnabled, hours: settings.tuesdayHours },
                  { key: 'wednesday', label: 'Mittwoch', enabled: settings.wednesdayEnabled, hours: settings.wednesdayHours },
                  { key: 'thursday', label: 'Donnerstag', enabled: settings.thursdayEnabled, hours: settings.thursdayHours },
                  { key: 'friday', label: 'Freitag', enabled: settings.fridayEnabled, hours: settings.fridayHours },
                  { key: 'saturday', label: 'Samstag', enabled: settings.saturdayEnabled, hours: settings.saturdayHours },
                  { key: 'sunday', label: 'Sonntag', enabled: settings.sundayEnabled, hours: settings.sundayHours }
                ].map(({ key, label, enabled, hours }) => (
                  <div key={key} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`${key}Enabled`}
                        checked={enabled}
                        onChange={(e) => handleInputChange(`${key}Enabled` as keyof UserSettings, e.target.checked.toString())}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`${key}Enabled`} className="ml-2 text-sm font-medium text-gray-700 w-20">
                        {label}
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <select
                        value={hours}
                        disabled={!enabled}
                        onChange={(e) => handleInputChange(`${key}Hours` as keyof UserSettings, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {Array.from({ length: 21 }, (_, i) => i * 0.5).map(value => (
                          <option key={value} value={value}>
                            {value.toFixed(1)}h
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Hinweis:</strong> Die Stundenangaben werden automatisch gleichmäßig auf die aktiven Tätigkeiten verteilt. 
                  Die kleinste Unterteilung beträgt 0,5 Stunden.
                </p>
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-md ${
                message.includes('erfolgreich') 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading 
                  ? 'Speichern...' 
                  : isWelcome 
                    ? 'Einrichtung abschließen' 
                    : 'Einstellungen speichern'
                }
              </button>
            </div>
          </form>
        </div>

        {/* Ferienverwaltung */}
        {!isWelcome && (
          <div className="mt-8">
            <VacationManager />
          </div>
        )}
      </div>
    </div>
  )
}