import { useRef, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../user/Avatar'

const MAX = 280

export default function TweetComposer({ onPost, replyToId = null, placeholder = "What's happening?!" }) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const textareaRef = useRef(null)

  const remaining = MAX - content.length
  const canPost   = content.trim().length > 0 && remaining >= 0

  async function handlePost() {
    if (!canPost || posting) return
    setPosting(true)
    try {
      const tweet = replyToId
        ? await api.post(`/tweets/${replyToId}/reply`, { content: content.trim() })
        : await api.post('/tweets', { content: content.trim() })
      setContent('')
      textareaRef.current?.focus()
      onPost?.(tweet)
    } catch { /* ignore */ }
    finally { setPosting(false) }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost()
  }

  const counterClass = remaining <= 0 ? 'danger' : remaining <= 20 ? 'warning' : ''

  return (
    <div className="composer">
      <Avatar user={user} size={44} />
      <div className="composer-body">
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          placeholder={placeholder}
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
            onClick={handlePost}
            disabled={!canPost || posting}
          >
            {posting ? '…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
