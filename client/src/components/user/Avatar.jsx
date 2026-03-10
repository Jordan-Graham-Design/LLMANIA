const COLORS = [
  '#1d9bf0', '#ff6b35', '#7c3aed', '#059669', '#dc2626',
  '#d97706', '#0891b2', '#be185d', '#065f46', '#1e40af',
]

function colorFromUsername(username) {
  let hash = 0
  for (const ch of (username || '?')) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return COLORS[Math.abs(hash) % COLORS.length]
}

function initials(displayName) {
  return (displayName || '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export default function Avatar({ user, size = 40 }) {
  const url = user?.avatar_url
  const style = { width: size, height: size, fontSize: size * 0.38 }

  if (url) {
    return <img className="avatar" src={url} alt={user?.display_name} style={style} />
  }

  return (
    <div
      className="avatar-placeholder"
      style={{ ...style, background: colorFromUsername(user?.username) }}
    >
      {initials(user?.display_name)}
    </div>
  )
}
