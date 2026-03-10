import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import TweetCard from '../components/tweet/TweetCard'
import TweetComposer from '../components/tweet/TweetComposer'
import Spinner from '../components/common/Spinner'

export default function TweetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tweet,   setTweet]   = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    Promise.all([
      api.get(`/tweets/${id}`),
      api.get(`/tweets/${id}/replies`),
    ])
      .then(([t, r]) => {
        setTweet(t)
        setReplies(r)
      })
      .catch(err => { if (err.status === 404) setNotFound(true) })
      .finally(() => setLoading(false))
  }, [id])

  function handleReply(newReply) {
    setReplies(prev => [...prev, newReply])
    setTweet(prev => prev ? { ...prev, reply_count: (prev.reply_count ?? 0) + 1 } : prev)
  }

  function handleDeleteFocal() {
    navigate(-1)
  }

  function handleDeleteReply(replyId) {
    setReplies(prev => prev.filter(r => r.id !== replyId))
    setTweet(prev => prev ? { ...prev, reply_count: Math.max(0, (prev.reply_count ?? 1) - 1) } : prev)
  }

  if (loading) return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Post</h1>
      </div>
      <Spinner />
    </>
  )

  if (notFound || !tweet) return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Post</h1>
      </div>
      <div className="empty-state">
        <h3>Post not found</h3>
        <p>It may have been deleted.</p>
      </div>
    </>
  )

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Post</h1>
      </div>

      <TweetCard
        tweet={tweet}
        isDetailView={true}
        onDelete={handleDeleteFocal}
        onReply={handleReply}
      />

      <TweetComposer onPost={handleReply} replyToId={parseInt(id, 10)} placeholder="Post your reply" />

      <div className="thread-divider" />

      {replies.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No replies yet. Be the first!</p>
        </div>
      ) : (
        replies.map(r => (
          <TweetCard key={r.id} tweet={r} onDelete={handleDeleteReply} onReply={() => {}} />
        ))
      )}
    </div>
  )
}
