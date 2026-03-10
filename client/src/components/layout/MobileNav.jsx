import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUnreadCount } from '../../hooks/useNotifications'

export default function MobileNav() {
  const { user } = useAuth()
  const unread = useUnreadCount()

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        <NavLink to="/" end className="mobile-nav-link" title="Home">🏠</NavLink>
        <NavLink to="/search" className="mobile-nav-link" title="Search">🔍</NavLink>
        <NavLink to="/notifications" className="mobile-nav-link" title="Notifications">
          🔔
          {unread > 0 && <span className="nav-badge">{unread > 9 ? '9+' : unread}</span>}
        </NavLink>
        <NavLink to={`/profile/${user?.username}`} className="mobile-nav-link" title="Profile">👤</NavLink>
      </div>
    </nav>
  )
}
