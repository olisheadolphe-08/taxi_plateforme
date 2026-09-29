import { createContext, useContext, useEffect, useState } from 'react'
import { api, ApiError } from '../services/api'

const AuthContext = createContext(null)

/** Vérifie sommairement qu'un token JWT a la forme attendue (3 segments base64). */
function isTokenWellFormed(token) {
  return typeof token === 'string' && token.split('.').length === 3
}

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('taxi_admin_token')

    if (!token || !isTokenWellFormed(token)) {
      // Pas de token ou token manifestement invalide : nettoyage immédiat,
      // aucun appel réseau, aucun 401 en console.
      if (token) localStorage.removeItem('taxi_admin_token')
      setLoading(false)
      return
    }

    api
      .me()
      .then((res) => setAdmin(res.data))
      .catch((err) => {
        // Token expiré / révoqué côté serveur → nettoyage silencieux
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem('taxi_admin_token')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const res = await api.login(email, password)
    localStorage.setItem('taxi_admin_token', res.data.token)
    setAdmin(res.data.admin)
    return res.data.admin
  }

  function logout() {
    localStorage.removeItem('taxi_admin_token')
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}
