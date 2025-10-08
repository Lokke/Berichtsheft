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

type TabType = 'profile' | 'training' | 'vacation'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
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

  const tabs = [
    { id: 'profile' as TabType, label: 'Profil', icon: '👤' },
    { id: 'training' as TabType, label: 'Ausbildung', icon: '📚' },
    { id: 'vacation' as TabType, label: 'Urlaub', icon: '🏖️' }
  ]

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="glass-strong rounded-3xl p-6 mb-6 animate-slide-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                ⚙️ Einstellungen
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Verwalte deine persönlichen Daten und Arbeitszeiten
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-secondary px-4 py-2 text-sm"
            >
              ← Dashboard
            </button>
          </div>

          {/* Willkommens-Banner für neue Benutzer */}
          {isWelcome && (
            <div className="mt-6 p-4 rounded-2xl glass border-2 border-blue-400/30 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">💡</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Willkommen! Erste Einrichtung
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Bitte konfiguriere zuerst deine persönlichen Daten und Arbeitszeiten, 
                    bevor du mit dem Berichtsheft beginnen kannst.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          {!isWelcome && (
            <div className="flex gap-2 mt-6 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className="glass rounded-3xl p-6 animate-fade-in">
          <form onSubmit={handleSubmit}>
            {/* Profile Tab */}
            {(activeTab === 'profile' || isWelcome) && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Persönliche Daten
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Vorname *
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Nachname *
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.surname}
                      onChange={(e) => handleInputChange('surname', e.target.value)}
                      className="input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    E-Mail-Adresse
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    disabled
                    className="input w-full opacity-50 cursor-not-allowed"
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    E-Mail kann nicht geändert werden
                  </p>
                </div>
              </div>
            )}

            {/* Training Tab */}
            {(activeTab === 'training' || isWelcome) && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Ausbildungsdaten
                </h2>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
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
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Klasse
                    </label>
                    <input
                      type="text"
                      value={settings.trainingClass}
                      onChange={(e) => handleInputChange('trainingClass', e.target.value)}
                      placeholder="z.B. FI-AE-22A"
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Abteilung
                    </label>
                    <input
                      type="text"
                      value={settings.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className="input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Ausbildungsbeginn *
                  </label>
                  <input
                    type="date"
                    required
                    value={settings.trainingStartDate}
                    onChange={(e) => handleInputChange('trainingStartDate', e.target.value)}
                    className="input w-full"
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Wird zur Berechnung des Ausbildungsjahres verwendet
                  </p>
                </div>

                {/* Arbeitszeit-Konfiguration */}
                <div className="border-t pt-6 mt-6" style={{ borderColor: 'var(--border-color)' }}>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    Arbeitszeit-Konfiguration
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Konfiguriere deine Arbeitszeiten pro Wochentag. Deaktivierte Tage werden weder im Dashboard noch in den PDF-Berichten angezeigt.
                  </p>
                  
                  <div className="space-y-3">
                    {[
                      { key: 'monday', label: 'Montag', enabled: settings.mondayEnabled, hours: settings.mondayHours },
                      { key: 'tuesday', label: 'Dienstag', enabled: settings.tuesdayEnabled, hours: settings.tuesdayHours },
                      { key: 'wednesday', label: 'Mittwoch', enabled: settings.wednesdayEnabled, hours: settings.wednesdayHours },
                      { key: 'thursday', label: 'Donnerstag', enabled: settings.thursdayEnabled, hours: settings.thursdayHours },
                      { key: 'friday', label: 'Freitag', enabled: settings.fridayEnabled, hours: settings.fridayHours },
                      { key: 'saturday', label: 'Samstag', enabled: settings.saturdayEnabled, hours: settings.saturdayHours },
                      { key: 'sunday', label: 'Sonntag', enabled: settings.sundayEnabled, hours: settings.sundayHours }
                    ].map(({ key, label, enabled, hours }) => (
                      <div key={key} className="flex items-center gap-4 p-4 glass-strong rounded-xl">
                        <div className="flex items-center flex-1">
                          <input
                            type="checkbox"
                            id={`${key}Enabled`}
                            checked={enabled}
                            onChange={(e) => handleInputChange(`${key}Enabled` as keyof UserSettings, e.target.checked.toString())}
                            className="h-5 w-5 rounded border-2 text-purple-600 focus:ring-2 focus:ring-purple-500"
                          />
                          <label htmlFor={`${key}Enabled`} className="ml-3 text-sm font-medium w-28" style={{ color: 'var(--text-primary)' }}>
                            {label}
                          </label>
                        </div>
                        
                        <div className="flex items-center">
                          <select
                            value={hours}
                            disabled={!enabled}
                            onChange={(e) => handleInputChange(`${key}Hours` as keyof UserSettings, e.target.value)}
                            className="input px-3 py-2 text-sm disabled:opacity-40"
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
                  
                  <div className="mt-4 p-4 rounded-xl glass border-2 border-blue-400/20">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <strong>Hinweis:</strong> Die Stundenangaben werden automatisch gleichmäßig auf die Tätigkeiten verteilt. 
                      Die kleinste Unterteilung beträgt 0,5 Stunden.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Vacation Tab */}
            {activeTab === 'vacation' && !isWelcome && (
              <div>
                <VacationManager />
              </div>
            )}

            {/* Save Button and Message (except for vacation tab) */}
            {activeTab !== 'vacation' && (
              <>
                {message && (
                  <div className={`p-4 rounded-xl mb-4 ${
                    message.includes('erfolgreich') 
                      ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400/30' 
                      : 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-2 border-red-400/30'
                  }`}>
                    <p className="text-sm font-medium" style={{ 
                      color: message.includes('erfolgreich') ? 'var(--success-color)' : 'var(--error-color)' 
                    }}>
                      {message}
                    </p>
                  </div>
                )}

                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1 py-3 text-base font-semibold disabled:opacity-50"
                  >
                    {loading 
                      ? 'Speichern...' 
                      : isWelcome 
                        ? '✓ Einrichtung abschließen' 
                        : '💾 Einstellungen speichern'
                    }
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
