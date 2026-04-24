import { useState } from 'react'
import TodayPage from './TodayPage'
import SplitPage from './SplitPage'
import SquadPage from './SquadPage'
import WeightPage from './WeightPage'
import ProfilePage from './ProfilePage'

export default function MainApp({ user }) {
  const [tab, setTab] = useState('today')

  return (
    <div className="app-shell">
      {tab === 'today' && <TodayPage user={user} />}
      {tab === 'split' && <SplitPage user={user} />}
      {tab === 'squad' && <SquadPage user={user} />}
      {tab === 'weight' && <WeightPage user={user} />}
      {tab === 'profile' && <ProfilePage user={user} />}

      <nav className="bottom-nav">
        <button className={`nav-item ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Today
        </button>
        <button className={`nav-item ${tab === 'split' ? 'active' : ''}`} onClick={() => setTab('split')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Split
        </button>
        <button className={`nav-item ${tab === 'squad' ? 'active' : ''}`} onClick={() => setTab('squad')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Squad
        </button>
        <button className={`nav-item ${tab === 'weight' ? 'active' : ''}`} onClick={() => setTab('weight')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 12h8M12 8v8"/>
          </svg>
          Weight
        </button>
        <button className={`nav-item ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          Profile
        </button>
      </nav>
    </div>
  )
}
