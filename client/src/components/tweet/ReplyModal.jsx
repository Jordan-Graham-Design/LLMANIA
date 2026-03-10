import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../user/Avatar'

const MAX = 280

export default function ReplyModal({ tweet, onClose, onReply }) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const textareaRef = useRef(null)

  // Determine the actual tweet to reply to (if it's a retweet, reply to the original)
  const replyTargetId = tweet.retweet_of_id ?? tweet.id
  const displayContent = tweet.retweet_of_id ? tweet.orig_content : tweet.content
  const displayUsername = tweet.retweet_of_id ? tweet.orig_username : tweet.username
  const displayName = tweet.retweet_of_id ? tweet.orig_display_name : tweet.display_name
  const displayAvatar = tweet.retweet_of_id ? tweet.orig_avatar_url : tweet.avatar_url

  useEffect(() => { textareaRef.current?.focus() }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const remaining = MAX - content.length
  const canPost = content.trim().length > 0 && remaining >= 0
  const counterClass = remaining <= 0 ? 'danger' : remaining <= 20 ? 'warning' : ''

  async function handleReply() {
    if (!canPost || posting) return
    setPosting(true)
    try {
      const reply = await api.post(`/tweets/${replyTargetId}/reply`, { content: content.trim() })
      onReply?.(reply)
      onClose()
    } catch { /* ignore */ }
    finally { setPosting(false) }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply()
  }

  const previewUser = { username: displayUsername, display_name: displayName, avatar_url: displayAvatar }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Original tweet preview */}
        <div className="modal-original-tweet">
          <div className="modal-original-avatar">
            <Avatar user={previewUser} size={40} />
            <div className="thread-line" />
          </div>
          <div className="modal-original-body">
            <div className="tweet-header">
              <span className="tweet-display-name">{displayName}</span>
              <span className="tweet-username">@{displayUsername}</span>
            </div>
            <div className="tweet-body" style={{ fontSize: '0.95rem' }}>{displayContent}</div>
            <div className="modal-replying-to">
              Replying to <span className="accent-text">@{displayUsername}</span>
            </div>
          </div>
        </div>

        {/* Reply composer */}
        <div className="modal-composer">
          <Avatar user={user} size={40} />
          <div className="composer-body">
            <textarea
              ref={textareaRef}
              className="composer-textarea"
              placeholder="Post your reply"
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX + 10}
              rows={3}
            />
            <div className="composer-footer">
              {content.length > 0 && (
                <span className={`char-counter ${counterClass}`}>{remaining}</span>
              )}
              <button
                className="btn btn-accent"
                style={{ padding: '0.5rem 1.25rem' }}
                onClick={handleReply}
                disabled={!canPost || posting}
              >
                {posting ? '…' : 'Reply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
