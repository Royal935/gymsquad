import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function calcStreak(days = []) {
  if (!days.length) return 0
  const sorted = [...days].sort().reverse()
  let streak = 0
  let check = todayKey()
  for (const day of sorted) {
    if (day === check) {
      streak++
      const d = new Date(check)
      d.setDate(d.getDate() - 1)
      check = d.toISOString().slice(0, 10)
    } else break
  }
  return streak
}

export default function ProfilePage({ user }) {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) setProfile(snap.data())
    })
    return unsub
  }, [user.uid])

  if (!profile) return <div className="spinner" />

  const streak = calcStreak(profile.streakDays)
  const total = (profile.streakDays || []).length

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-label">Account</div>
        <div className="page-title">PROFILE</div>
      </div>

      <div className="p-page">
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#1a1f0a', border: '2px solid var(--gym-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gym-accent)',
          }}>
            {(profile.name || '?').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 500 }}>{profile.name}</div>
            <div style={{ fontSize: 13, color: 'var(--gym-sub)' }}>{profile.email}</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.5rem' }}>
          {[
            { label: 'Current streak', value: `${streak} days` },
            { label: 'Total workouts', value: total },
            { label: 'Friends', value: profile.friendIds?.length || 0 },
            { label: 'Split days', value: (profile.split || []).filter(d => d.muscle !== 'REST').length },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--gym-accent)' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--gym-sub)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Invite */}
        <div className="card mb-2">
          <div style={{ fontSize: 12, color: 'var(--gym-sub)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            Invite friends
          </div>
          <div style={{ fontSize: 14, color: 'var(--gym-text)', marginBottom: 10 }}>
            Share your email so friends can add you to their squad:
          </div>
          <div style={{
            padding: '10px 14px',
            background: '#0e0e0e',
            borderRadius: 8,
            fontFamily: 'monospace',
            fontSize: 14,
            color: 'var(--gym-accent)',
            userSelect: 'all',
          }}>
            {profile.email}
          </div>
        </div>

        <button
          className="btn-secondary"
          onClick={() => signOut(auth)}
          style={{ color: 'var(--gym-accent2)', borderColor: '#3d1f1f' }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
