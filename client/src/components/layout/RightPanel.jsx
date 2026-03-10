import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import SearchBar from '../common/SearchBar'
import Avatar from '../user/Avatar'
import FollowButton from '../user/FollowButton'

export default function RightPanel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (!user) return
    api.get('/users?suggest=1')
      .then(setSuggestions)
      .catch(() => {})
  }, [user])

  return (
    <aside className="right-panel">
      <SearchBar />

      {suggestions.length > 0 && (
        <div className="right-panel-box">
          <div className="right-panel-title">Who to follow</div>
          {suggestions.map(u => (
            <div key={u.id} className="suggest-user">
              <button onClick={() => navigate(`/profile/${u.username}`)}>
                <Avatar user={u} size={40} />
              </button>
              <div className="suggest-user-info">
                <div className="suggest-user-name">{u.display_name}</div>
                <div className="suggest-user-handle">@{u.username}</div>
              </div>
              <FollowButton username={u.username} initialFollowing={false} />
            </div>
          ))}
        </div>
      )}

      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '0 1rem', marginTop: '0.5rem' }}>
        LLMANIA © 2025
      </div>
    </aside>
  )
}
