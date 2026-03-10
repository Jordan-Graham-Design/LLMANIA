import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import RightPanel from './components/layout/RightPanel'
import Home from './pages/Home'
import Search from './pages/Search'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import TweetDetail from './pages/TweetDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Spinner from './components/common/Spinner'

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <Spinner />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"                     element={<Home />} />
          <Route path="/search"               element={<Search />} />
          <Route path="/notifications"        element={<Notifications />} />
          <Route path="/profile/:username"    element={<Profile />} />
          <Route path="/tweet/:id"            element={<TweetDetail />} />
          <Route path="*"                     element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <RightPanel />
      <MobileNav />
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/*"        element={<ProtectedLayout />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}
