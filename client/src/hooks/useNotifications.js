import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export function useUnreadCount() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) return

    const fetch = () => {
      api.get('/notifications/unread-count')
        .then(d => setCount(d.count))
        .catch(() => {})
    }

    fetch()
    const id = setInterval(fetch, 30_000)
    return () => clearInterval(id)
  }, [user])

  return count
}
