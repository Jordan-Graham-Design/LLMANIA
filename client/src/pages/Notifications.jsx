import { useEffect, useState } from 'react'
import { api } from '../api/client'
import NotificationItem from '../components/notifications/NotificationItem'
import Spinner from '../components/common/Spinner'

export default function Notifications() {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/notifications')
      .then(data => {
        setNotifs(data)
        // Mark all as read
        api.patch('/notifications/read-all').catch(() => {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <>
      <div className="page-header"><h1>Notifications</h1></div>
      <Spinner />
    </>
  )

  return (
    <div>
      <div className="page-header"><h1>Notifications</h1></div>

      {notifs.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing yet</h3>
          <p>When someone likes, reposts, or follows you, it'll show up here.</p>
        </div>
      ) : (
        notifs.map(n => <NotificationItem key={n.id} notif={n} />)
      )}
    </div>
  )
}
