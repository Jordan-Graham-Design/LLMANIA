import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import Spinner from '../common/Spinner'
import TweetCard from './TweetCard'

export default function TweetFeed({ endpoint, search = '', extraTweets = [] }) {
  const [tweets,     setTweets]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [newCount,   setNewCount]   = useState(0)
  const latestIdRef = useRef(0)
  const pendingRef  = useRef([])

  const buildUrl = useCallback((params = {}) => {
    const p = new URLSearchParams()
    if (search)       p.set('search', search)
    if (params.after) p.set('after',  params.after)
    const qs = p.toString()
    return endpoint + (qs ? `?${qs}` : '')
  }, [endpoint, search])

  // Initial load
  useEffect(() => {
    setLoading(true)
    setTweets([])
    setNewCount(0)
    pendingRef.current = []
    latestIdRef.current = 0

    api.get(buildUrl())
      .then(data => {
        setTweets(data)
        if (data.length > 0) latestIdRef.current = data[0].id
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [buildUrl])

  // Prepend extraTweets (from composer)
  useEffect(() => {
    if (!extraTweets.length) return
    setTweets(prev => {
      const existing = new Set(prev.map(t => t.id))
      const fresh = extraTweets.filter(t => !existing.has(t.id))
      return fresh.length ? [...fresh, ...prev] : prev
    })
  }, [extraTweets])

  // 30s polling for new tweets
  useEffect(() => {
    if (!latestIdRef.current) return
    const id = setInterval(async () => {
      try {
        const fresh = await api.get(buildUrl({ after: latestIdRef.current }))
        if (fresh.length > 0) {
          pendingRef.current = fresh
          setNewCount(fresh.length)
        }
      } catch { /* ignore */ }
    }, 30_000)
    return () => clearInterval(id)
  }, [buildUrl])

  function showNewTweets() {
    if (!pendingRef.current.length) return
    const fresh = pendingRef.current
    pendingRef.current = []
    setNewCount(0)
    setTweets(prev => {
      const existing = new Set(prev.map(t => t.id))
      const unique = fresh.filter(t => !existing.has(t.id))
      if (unique.length) latestIdRef.current = unique[0].id
      return [...unique, ...prev]
    })
  }

  function handleDelete(id) {
    setTweets(prev => prev.filter(t => t.id !== id))
  }

  if (loading) return <Spinner />

  return (
    <div>
      {newCount > 0 && (
        <div className="new-tweets-banner" onClick={showNewTweets}>
          Show {newCount} new post{newCount > 1 ? 's' : ''}
        </div>
      )}

      {tweets.length === 0 ? (
        <div className="empty-state">
          <h3>No posts yet</h3>
          <p>When posts appear, they'll show up here.</p>
        </div>
      ) : (
        tweets.map(t => (
          <TweetCard key={t.id} tweet={t} onDelete={handleDelete} />
        ))
      )}
    </div>
  )
}
