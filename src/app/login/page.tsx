'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const formEmail = formData.get('email') as string
    const formPassword = formData.get('password') as string

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const body = { email: formEmail, password: formPassword }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok) {
        const checkCookie = async () => {
          const checkResponse = await fetch('/api/auth/check')
          const checkData = await checkResponse.json()
          return checkData.authenticated
        }
        
        await new Promise(resolve => setTimeout(resolve, 300))
        const isAuth = await checkCookie()
        
        if (!isAuth) {
          await new Promise(resolve => setTimeout(resolve, 500))
          const isAuthRetry = await checkCookie()
          if (!isAuthRetry) {
            setError('Login erfolgreich, aber Session konnte nicht gesetzt werden. Bitte lade die Seite neu.')
            setLoading(false)
            return
          }
        }
        
        if (isLogin) {
          window.location.href = '/dashboard'
        } else {
          window.location.href = '/settings?welcome=true'
        }
      } else {
        setError(data.error || 'Ein Fehler ist aufgetreten')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
         }}>
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md animate-slide-in">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            📝 Berichtsheft
          </h1>
          <p className="text-white/80 text-lg">
            Deine digitale Ausbildungsdokumentation
          </p>
        </div>

        {/* Main Form Card */}
        <div className="glass-strong rounded-3xl p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {isLogin ? 'Willkommen zurück' : 'Konto erstellen'}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
              {isLogin ? 'Melde dich an, um fortzufahren' : 'Erstelle dein kostenloses Konto'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="deine@email.de"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Passwort
              </label>
              <input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="glass rounded-xl p-3 text-red-600 text-sm text-center animate-fade-in"
                   style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Wird verarbeitet...
                </span>
              ) : (
                isLogin ? 'Anmelden' : 'Registrieren'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              className="text-sm transition-colors"
              style={{ color: 'var(--primary)' }}
            >
              {isLogin ? (
                <>Noch kein Konto? <span className="font-semibold">Jetzt registrieren</span></>
              ) : (
                <>Bereits ein Konto? <span className="font-semibold">Jetzt anmelden</span></>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white/60 text-sm">
          <p>© 2025 Berichtsheft • Professionell & Modern</p>
        </div>
      </div>
    </div>
  )
}