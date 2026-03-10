import { useNavigate } from 'react-router-dom'
import Avatar from '../user/Avatar'

const TYPE_ICONS  = { like: '❤️', retweet: '🔁', follow: '👤', reply: '💬' }
const TYPE_LABELS = { like: 'liked your post', retweet: 'reposted your post', follow: 'followed you', reply: 'replied to your post' }

function timeAgo(unix) {
  const d = Date.now() / 1000 - unix
  if (d < 60)    return 'now'
  if (d < 3600)  return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}

export default function NotificationItem({ notif }) {
  const navigate = useNavigate()
  const actor = {
    id: notif.actor_id,
    username: notif.actor_username,
    display_name: notif.actor_display_name,
    avatar_url: notif.actor_avatar_url,
  }

  return (
    <div
      className={`notif-item ${notif.is_read ? '' : 'unread'}`}
      onClick={() => notif.type === 'follow'
        ? navigate(`/profile/${notif.actor_username}`)
        : navigate(`/tweet/${notif.tweet_id}`)
      }
      style={{ cursor: 'pointer' }}
    >
      <div className="notif-icon">{TYPE_ICONS[notif.type]}</div>
      <Avatar user={actor} size={36} />
      <div className="notif-text" style={{ flex: 1 }}>
        <span className="notif-actor">{notif.actor_display_name}</span>
        {' '}{TYPE_LABELS[notif.type]}
        {notif.tweet_preview && (
          <div className="notif-preview">"{notif.tweet_preview}"</div>
        )}
      </div>
      <div className="notif-time">{timeAgo(notif.created_at)}</div>
    </div>
  )
}
