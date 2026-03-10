import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUnreadCount } from '../../hooks/useNotifications'
import Avatar from '../user/Avatar'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const unread = useUnreadCount()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="sidebar">
      <span className="sidebar-logo">
        <span style={{ color: 'var(--text-primary)' }}>LL</span>
        <span>MANIA</span>
      </span>

      <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">🏠</span>
        <span>Home</span>
      </NavLink>

      <NavLink to="/search" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">🔍</span>
        <span>Search</span>
      </NavLink>

      <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">🔔</span>
        <span>Notifications</span>
        {unread > 0 && <span className="nav-badge">{unread > 99 ? '99+' : unread}</span>}
      </NavLink>

      <NavLink to={`/profile/${user?.username}`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">👤</span>
        <span>Profile</span>
      </NavLink>

      <div className="sidebar-user" onClick={() => navigate(`/profile/${user?.username}`)}>
        <Avatar user={user} size={40} />
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.display_name}</div>
          <div className="sidebar-user-handle">@{user?.username}</div>
        </div>
        <button
          className="logout-btn"
          onClick={e => { e.stopPropagation(); handleLogout() }}
          title="Log out"
        >
          ↩
        </button>
      </div>
    </nav>
  )
}
