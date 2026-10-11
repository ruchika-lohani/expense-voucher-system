import { useEffect, useState } from 'react'
import api, { TOKEN_KEY, USER_KEY } from '../lib/api'
import { AuthContext } from './auth'

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(readStoredUser)
  const [ready, setReady] = useState(() => !localStorage.getItem(TOKEN_KEY))

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  useEffect(() => {
    const handleUnauthorized = () => logout()
    window.addEventListener('voucherdesk:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('voucherdesk:unauthorized', handleUnauthorized)
  }, [])

  useEffect(() => {
    if (!token) return undefined
    let active = true

    api.get('/auth/me')
      .then(({ data }) => {
        if (!active) return
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        setUser(data.user)
      })
      .catch(() => {
        if (!active) return
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        if (active) setReady(true)
      })

    return () => { active = false }
  }, [token])

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const updateUser = (nextUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  return (
    <AuthContext.Provider value={{ token, user, ready, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

