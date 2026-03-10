import { useState } from 'react'
import { api } from '../../api/client'

export default function FollowButton({ username, initialFollowing, onToggle }) {
  const [following, setFollowing] = useState(initialFollowing)
  const [hover, setHover] = useState(false)
  const [loading, setLoading] = useState(false)

  async function toggle(e) {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    const was = following
    setFollowing(!was)
    try {
      if (was) await api.delete(`/follows/${username}`)
      else      await api.post(`/follows/${username}`)
      onToggle?.(!was)
    } catch {
      setFollowing(was)
    } finally {
      setLoading(false)
    }
  }

  const label = following
    ? (hover ? 'Unfollow' : 'Following')
    : 'Follow'

  return (
    <button
      className={`follow-btn ${following ? 'following' : 'not-following'}`}
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={loading}
    >
      {label}
    </button>
  )
}
