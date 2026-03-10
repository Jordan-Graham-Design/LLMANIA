import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SearchBar({ onSearch, defaultValue = '', autoFocus = false }) {
  const [value, setValue] = useState(defaultValue)
  const navigate = useNavigate()
  const timerRef = useRef(null)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  function handleChange(e) {
    const v = e.target.value
    setValue(v)
    if (onSearch) {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onSearch(v), 300)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !onSearch) {
      navigate(`/search?q=${encodeURIComponent(value)}`)
    }
  }

  return (
    <div className="search-bar-wrap">
      <span className="search-icon">🔍</span>
      <input
        className="search-input"
        type="text"
        placeholder="Search LLMANIA"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
      />
    </div>
  )
}
