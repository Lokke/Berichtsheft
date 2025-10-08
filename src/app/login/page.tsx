'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Get values directly from form to handle browser autofill
    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const formEmail = formData.get('email') as string
    const formPassword = formData.get('password') as string
    const formName = formData.get('name') as string

    console.log('📝 Submitting login form:', { email: formEmail, isLogin })

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const body = isLogin 
        ? { email: formEmail, password: formPassword } 
        : { email: formEmail, password: formPassword, name: formName }

      console.log('🌐 Calling:', endpoint, 'with data:', { email: formEmail, hasPassword: !!formPassword })

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()
      console.log('📦 Response:', { status: response.status, ok: response.ok, data })

      if (response.ok) {
        console.log('✅ Login successful!')
        
        // Check if cookie was set by trying to read it
        const checkCookie = async () => {
          const checkResponse = await fetch('/api/auth/check')
          const checkData = await checkResponse.json()
          console.log('🔍 Auth check after login:', checkData)
          return checkData.authenticated
        }
        
        // Wait for cookie to be set and verify
        await new Promise(resolve => setTimeout(resolve, 300))
        const isAuth = await checkCookie()
        
        if (!isAuth) {
          console.error('❌ Cookie not set properly, retrying...')
          await new Promise(resolve => setTimeout(resolve, 500))
          const isAuthRetry = await checkCookie()
          if (!isAuthRetry) {
            console.error('❌ Cookie still not set after retry')
            setError('Login erfolgreich, aber Session konnte nicht gesetzt werden. Bitte lade die Seite neu.')
            setLoading(false)
            return
          }
        }
        
        // Nach Registrierung direkt zu Einstellungen, nach Login zum Dashboard
        if (isLogin) {
          console.log('➡️ Redirecting to /dashboard')
          window.location.href = '/dashboard'
        } else {
          // Nach Registrierung zu Einstellungen für initiale Konfiguration
          console.log('➡️ Redirecting to /settings')
          window.location.href = '/settings?welcome=true'
        }
      } else {
        console.error('❌ Login failed:', data.error)
        setError(data.error || 'Something went wrong')
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Anmelden' : 'Registrieren'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Berichtsheft Generator
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {!isLogin && (
              <div>
                <input
                  type="text"
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Name"
                />
              </div>
            )}
            <div>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${
                  isLogin ? 'rounded-t-md' : ''
                } focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="E-Mail"
              />
            </div>
            <div>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Passwort"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Wird verarbeitet...' : (isLogin ? 'Anmelden' : 'Registrieren')}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 hover:text-indigo-500"
            >
              {isLogin ? 'Noch kein Konto? Registrieren' : 'Bereits ein Konto? Anmelden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}