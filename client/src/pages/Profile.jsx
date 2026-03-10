import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/user/Avatar'
import FollowButton from '../components/user/FollowButton'
import TweetFeed from '../components/tweet/TweetFeed'
import Spinner from '../components/common/Spinner'

export default function Profile() {
  const { username } = useParams()
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    api.get(`/users/${username}`)
      .then(setProfile)
      .catch(err => { if (err.status === 404) setNotFound(true) })
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Profile</h1>
      </div>
      <Spinner />
    </>
  )

  if (notFound || !profile) return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Profile</h1>
      </div>
      <div className="empty-state">
        <h3>User not found</h3>
        <p>This account doesn't exist.</p>
      </div>
    </>
  )

  const isMe = me?.id === profile.id

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <div>
          <h1>{profile.display_name}</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {profile.tweet_count} post{profile.tweet_count !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="profile-banner" />

      <div className="profile-info">
        <div className="profile-avatar-wrap">
          <Avatar user={profile} size={80} />
        </div>

        <div className="profile-actions">
          {isMe ? (
            <button className="follow-btn not-following" style={{ fontSize: '0.85rem' }}
              onClick={() => alert('Profile editing coming soon!')}>
              Edit profile
            </button>
          ) : (
            <FollowButton
              username={profile.username}
              initialFollowing={profile.is_following}
              onToggle={following => setProfile(p => ({
                ...p,
                is_following: following,
                follower_count: p.follower_count + (following ? 1 : -1),
              }))}
            />
          )}
        </div>

        <div className="profile-display-name">{profile.display_name}</div>
        <div className="profile-handle">@{profile.username}</div>
        {profile.bio && <div className="profile-bio">{profile.bio}</div>}

        <div className="profile-stats">
          <span><strong>{profile.following_count}</strong> Following</span>
          <span><strong>{profile.follower_count}</strong> Followers</span>
        </div>
      </div>

      <TweetFeed key={username} endpoint={`/users/${username}/tweets`} />
    </div>
  )
}
