import { useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import SearchBar from '../components/common/SearchBar'
import TweetFeed from '../components/tweet/TweetFeed'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  useEffect(() => {
    const q = searchParams.get('q') || ''
    setQuery(q)
  }, [searchParams])

  function handleSearch(q) {
    setQuery(q)
    if (q) setSearchParams({ q })
    else setSearchParams({})
  }

  return (
    <div>
      <div className="page-header">
        <h1>Search</h1>
      </div>
      <SearchBar onSearch={handleSearch} defaultValue={query} autoFocus />
      {query ? (
        <TweetFeed key={query} endpoint="/tweets" search={query} />
      ) : (
        <div className="empty-state">
          <h3>Search LLMANIA</h3>
          <p>Try searching for people, topics, or keywords.</p>
        </div>
      )}
    </div>
  )
}
