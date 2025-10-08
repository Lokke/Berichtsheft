'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import TrainingProfessionSearch from '@/components/TrainingProfessionSearch'
import VacationManager from '@/components/VacationManager'
import ThemeToggle from '@/components/ThemeToggle'

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
    <div className="min-h-screen px-3 md:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header - identisch zum Dashboard */}
        <div className="glass rounded-2xl p-4 mb-4 animate-slide-in">
          <div className="flex items-center justify-between mb-4">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-2">
              <div className="text-2xl">⚙️</div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  Einstellungen
                </h1>
                <div className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Persönliche Daten und Konfiguration
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3 py-1.5 text-sm flex items-center gap-1.5 rounded-xl transition-all"
                style={{
                  background: 'rgba(0, 0, 0, 0.02)',
                  border: '2px solid rgba(0, 0, 0, 0.1)',
                  color: 'var(--text-secondary)'
                }}
                title="Zurück zum Dashboard"
              >
                <span>←</span>
                <span className="hidden md:inline">Dashboard</span>
              </button>
            </div>
          </div>

          {/* Willkommens-Banner für neue Benutzer */}
          {isWelcome && (
            <div className="mt-4 p-4 rounded-xl glass-strong border-2 border-blue-400/30 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)'
                  }}>
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
            <div className="flex gap-2 mt-4 pt-3 border-t overflow-x-auto" style={{ borderColor: 'var(--border-color)' }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                  style={activeTab === tab.id ? {
                    background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                    color: 'white',
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
                  } : {
                    background: 'rgba(0, 0, 0, 0.02)',
                    border: '2px solid rgba(0, 0, 0, 0.1)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
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
                    className="w-full bg-transparent outline-none text-sm font-medium p-3 rounded-lg border-2 opacity-50 cursor-not-allowed"
                    style={{
                      background: 'rgba(0, 0, 0, 0.02)',
                      borderColor: 'rgba(0, 0, 0, 0.1)',
                      color: 'var(--text-primary)'
                    }}
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

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Ausbildungsbeginn *
                  </label>
                  <input
                    type="date"
                    required
                    value={settings.trainingStartDate}
                    onChange={(e) => handleInputChange('trainingStartDate', e.target.value)}
                    className="w-full bg-transparent outline-none text-sm font-medium p-3 rounded-lg border-2 transition-all"
                    style={{
                      background: 'rgba(0, 0, 0, 0.02)',
                      borderColor: 'rgba(0, 0, 0, 0.1)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#f97316'
                      e.target.style.background = 'rgba(0, 0, 0, 0.03)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0, 0, 0, 0.1)'
                      e.target.style.background = 'rgba(0, 0, 0, 0.02)'
                    }}
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
                      { key: 'monday', label: 'Montag', enabled: settings.mondayEnabled, hours: settings.mondayHours, color: '#7c3aed' },
                      { key: 'tuesday', label: 'Dienstag', enabled: settings.tuesdayEnabled, hours: settings.tuesdayHours, color: '#ec4899' },
                      { key: 'wednesday', label: 'Mittwoch', enabled: settings.wednesdayEnabled, hours: settings.wednesdayHours, color: '#14b8a6' },
                      { key: 'thursday', label: 'Donnerstag', enabled: settings.thursdayEnabled, hours: settings.thursdayHours, color: '#f97316' },
                      { key: 'friday', label: 'Freitag', enabled: settings.fridayEnabled, hours: settings.fridayHours, color: '#7c3aed' },
                      { key: 'saturday', label: 'Samstag', enabled: settings.saturdayEnabled, hours: settings.saturdayHours, color: '#ec4899' },
                      { key: 'sunday', label: 'Sonntag', enabled: settings.sundayEnabled, hours: settings.sundayHours, color: '#14b8a6' }
                    ].map(({ key, label, enabled, hours, color }) => (
                      <div key={key} className="flex items-center gap-4 p-4 rounded-xl transition-all" style={{
                        background: enabled ? 'rgba(0, 0, 0, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                        border: `2px solid ${enabled ? color + '40' : 'rgba(0, 0, 0, 0.05)'}`
                      }}>
                        <div className="flex items-center flex-1">
                          <input
                            type="checkbox"
                            id={`${key}Enabled`}
                            checked={enabled}
                            onChange={(e) => handleInputChange(`${key}Enabled` as keyof UserSettings, e.target.checked.toString())}
                            className="h-5 w-5 rounded border-2 focus:ring-2 cursor-pointer transition-all"
                            style={{
                              accentColor: color,
                              borderColor: enabled ? color : 'rgba(0, 0, 0, 0.2)'
                            }}
                          />
                          <label htmlFor={`${key}Enabled`} className="ml-3 text-sm font-medium w-28 cursor-pointer" style={{ 
                            color: enabled ? color : 'var(--text-tertiary)'
                          }}>
                            {label}
                          </label>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!enabled}
                            onClick={() => {
                              const newHours = Math.max(0, hours - 0.5)
                              handleInputChange(`${key}Hours` as keyof UserSettings, newHours.toString())
                            }}
                            className="h-8 w-8 flex items-center justify-center rounded-lg font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                              background: enabled ? color : 'transparent',
                              color: enabled ? 'white' : 'var(--text-tertiary)',
                              boxShadow: enabled ? `0 2px 8px ${color}40` : 'none'
                            }}
                          >
                            −
                          </button>
                          
                          <div className="px-3 py-2 min-w-[4rem] text-center text-sm rounded-lg border-2 font-bold transition-all"
                            style={{
                              background: enabled ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                              borderColor: enabled ? color + '40' : 'rgba(0, 0, 0, 0.1)',
                              color: enabled ? color : 'var(--text-tertiary)'
                            }}
                          >
                            {hours.toFixed(1)}h
                          </div>
                          
                          <button
                            type="button"
                            disabled={!enabled}
                            onClick={() => {
                              const newHours = Math.min(10, hours + 0.5)
                              handleInputChange(`${key}Hours` as keyof UserSettings, newHours.toString())
                            }}
                            className="h-8 w-8 flex items-center justify-center rounded-lg font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                              background: enabled ? color : 'transparent',
                              color: enabled ? 'white' : 'var(--text-tertiary)',
                              boxShadow: enabled ? `0 2px 8px ${color}40` : 'none'
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-4 rounded-xl border-2 backdrop-blur-sm" style={{ 
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderColor: 'rgba(59, 130, 246, 0.3)' 
                  }}>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      <strong>💡 Hinweis:</strong> Die Stundenangaben werden automatisch gleichmäßig auf die Tätigkeiten verteilt. 
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
                  <div className="p-4 rounded-xl mb-4 border-2 backdrop-blur-sm" style={{
                    background: message.includes('erfolgreich') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    borderColor: message.includes('erfolgreich') ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
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

                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 text-base font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: loading ? 'rgba(124, 58, 237, 0.5)' : 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                      color: 'white',
                      boxShadow: loading ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.4)'
                    }}
                  >
                    {loading 
                      ? '💾 Speichern...' 
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
