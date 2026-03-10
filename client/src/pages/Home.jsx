import { useState } from 'react'
import TweetComposer from '../components/tweet/TweetComposer'
import TweetFeed from '../components/tweet/TweetFeed'

export default function Home() {
  const [tab, setTab] = useState('foryou')
  const [newTweets, setNewTweets] = useState([])

  function handlePost(tweet) {
    setNewTweets(prev => [tweet, ...prev])
  }

  const endpoint = tab === 'following' ? '/tweets/following' : '/tweets'

  return (
    <div>
      <div className="page-header">
        <h1>Home</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${tab === 'foryou' ? 'active' : ''}`}
          onClick={() => { setTab('foryou'); setNewTweets([]) }}
        >
          For you
        </button>
        <button
          className={`tab ${tab === 'following' ? 'active' : ''}`}
          onClick={() => { setTab('following'); setNewTweets([]) }}
        >
          Following
        </button>
      </div>

      <TweetComposer onPost={handlePost} />
      <TweetFeed key={tab} endpoint={endpoint} extraTweets={newTweets} />
    </div>
  )
}
