import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../user/Avatar'
import ReplyModal from './ReplyModal'

function timeAgo(unixSeconds) {
  const diff = Date.now() / 1000 - unixSeconds
  if (diff < 60)     return 'now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(unixSeconds * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export default function TweetCard({ tweet, onDelete, onReply, isDetailView = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [liked,       setLiked]       = useState(tweet.viewer_liked === 1)
  const [likeCount,   setLikeCount]   = useState(tweet.like_count)
  const [retweeted,   setRetweeted]   = useState(tweet.viewer_retweeted === 1)
  const [rtCount,     setRtCount]     = useState(tweet.retweet_count)
  const [replyCount,  setReplyCount]  = useState(tweet.reply_count ?? 0)
  const [showReply,   setShowReply]   = useState(false)

  const isRetweet = tweet.retweet_of_id !== null
  const isReply   = tweet.reply_to_id !== null && !isRetweet
  const isOwn     = user?.id === tweet.user_id

  async function handleLike(e) {
    e.stopPropagation()
    if (!user) return
    const was = liked
    setLiked(!was)
    setLikeCount(c => was ? c - 1 : c + 1)
    try {
      if (was) await api.delete(`/likes/${tweet.id}`)
      else     await api.post(`/likes/${tweet.id}`)
    } catch {
      setLiked(was)
      setLikeCount(c => was ? c + 1 : c - 1)
    }
  }

  async function handleRetweet(e) {
    e.stopPropagation()
    if (!user) return
    const was = retweeted
    setRetweeted(!was)
    setRtCount(c => was ? c - 1 : c + 1)
    try {
      if (was) await api.delete(`/tweets/${tweet.id}/retweet`)
      else     await api.post(`/tweets/${tweet.id}/retweet`)
    } catch {
      setRetweeted(was)
      setRtCount(c => was ? c + 1 : c - 1)
    }
  }

  async function handleDelete(e) {
    e.stopPropagation()
    if (!confirm('Delete this post?')) return
    try {
      await api.delete(`/tweets/${tweet.id}`)
      onDelete?.(tweet.id)
    } catch { /* ignore */ }
  }

  function handleReplyClick(e) {
    e.stopPropagation()
    if (!user) return
    setShowReply(true)
  }

  function handleReplySubmitted(newReply) {
    setReplyCount(c => c + 1)
    onReply?.(newReply)
  }

  function goToProfile(e) {
    e.stopPropagation()
    navigate(`/profile/${tweet.username}`)
  }

  function handleCardClick() {
    if (isDetailView) return
    navigate(`/tweet/${tweet.id}`)
  }

  const authorUser = {
    id: tweet.user_id,
    username: tweet.username,
    display_name: tweet.display_name,
    avatar_url: tweet.avatar_url,
  }

  const actions = (
    <div className={isDetailView ? 'detail-focal-actions' : 'tweet-actions'}>
      <button className="action-btn" onClick={handleReplyClick} title="Reply">
        <span className="action-icon">💬</span>
        {replyCount > 0 && <span>{replyCount}</span>}
      </button>

      <button
        className={`action-btn ${liked ? 'liked' : ''}`}
        onClick={handleLike}
        title="Like"
      >
        <span className="action-icon">{liked ? '❤️' : '🤍'}</span>
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>

      <button
        className={`action-btn ${retweeted ? 'retweeted' : ''}`}
        onClick={handleRetweet}
        title="Repost"
      >
        <span className="action-icon">🔁</span>
        {rtCount > 0 && <span>{rtCount}</span>}
      </button>

      {isOwn && (
        <button className="action-btn delete-btn" onClick={handleDelete} title="Delete">
          <span className="action-icon">🗑️</span>
        </button>
      )}
    </div>
  )

  return (
    <>
      <article
        className={`tweet-card${isDetailView ? ' detail-focal' : ''}`}
        onClick={handleCardClick}
      >
        <div className="tweet-card-inner">
          <button onClick={goToProfile} style={{ alignSelf: 'flex-start' }}>
            <Avatar user={authorUser} size={44} />
          </button>

          <div className="tweet-content-col">
            {isRetweet && (
              <div className="retweet-indicator">
                🔁 <span>{tweet.display_name} reposted</span>
              </div>
            )}

            {isReply && (
              <div className="reply-indicator">
                Replying to <span className="accent-text">@{tweet.parent_username}</span>
              </div>
            )}

            <div className="tweet-header">
              <button className="tweet-display-name" onClick={goToProfile}>
                {tweet.display_name}
              </button>
              <span className="tweet-username">@{tweet.username}</span>
              {!isDetailView && (
                <span className="tweet-time">{timeAgo(tweet.created_at)}</span>
              )}
            </div>

            {isDetailView && (
              <span className="tweet-time">{new Date(tweet.created_at * 1000).toLocaleString('en', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit'
              })}</span>
            )}

            {isRetweet ? (
              <div className="retweet-quote" onClick={e => { e.stopPropagation(); navigate(`/tweet/${tweet.retweet_of_id}`) }}>
                <div className="retweet-quote-author">
                  @{tweet.orig_username} — {tweet.orig_display_name}
                </div>
                <div>{tweet.orig_content}</div>
              </div>
            ) : (
              <div className="tweet-body">{tweet.content}</div>
            )}

            {actions}
          </div>
        </div>
      </article>

      {showReply && (
        <ReplyModal
          tweet={tweet}
          onClose={() => setShowReply(false)}
          onReply={handleReplySubmitted}
        />
      )}
    </>
  )
}
