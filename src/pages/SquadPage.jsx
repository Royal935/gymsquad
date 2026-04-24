import { useState, useEffect } from 'react'
import {
  doc, onSnapshot, updateDoc, arrayUnion, arrayRemove,
  collection, query, where, getDocs
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function last7Keys() {
  const keys = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return keys
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function calcStreak(days = []) {
  if (!days.length) return 0
  const sorted = [...days].sort().reverse()
  let streak = 0
  const today = todayKey()
  let check = today
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

// Build a 12-week grid (84 days) ending today
function buildGrid() {
  const cells = []
  const today = new Date()
  // Go back to the Sunday of 11 weeks ago
  const start = new Date(today)
  start.setDate(start.getDate() - 83)
  // align to Sunday
  start.setDate(start.getDate() - start.getDay())

  for (let i = 0; i < 84; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const isFuture = d > today
    cells.push({ key, date: d, isFuture, dayOfWeek: d.getDay(), month: d.getMonth(), day: d.getDate() })
  }
  return cells
}

const AVATAR_COLORS = [
  ['#1a1f0a', '#e8ff47'],
  ['#2a1f3a', '#c4a0f5'],
  ['#1a2f45', '#7ab8f5'],
  ['#1f2e18', '#a0d870'],
  ['#3a2015', '#f5a070'],
  ['#2a2015', '#f5d070'],
  ['#1a2a35', '#70d5f5'],
]

function HabitModal({ person, isSelf, colorIndex, onClose }) {
  const [bg, fg] = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
  const doneDays = new Set(person.streakDays || [])
  const streak = calcStreak(person.streakDays || [])
  const total = (person.streakDays || []).length
  const grid = buildGrid()

  // Group into weeks (columns of 7)
  const weeks = []
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7))
  }

  // Month labels — show month name at first cell of each month
  const monthLabels = weeks.map(week => {
    const firstOfMonth = week.find(c => c.day === 1)
    return firstOfMonth ? MONTH_NAMES[firstOfMonth.month] : ''
  })

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 200, padding: '0',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#181818', borderRadius: '16px 16px 0 0',
          border: '1px solid #2a2a2a', width: '100%', maxWidth: 480,
          padding: '1.25rem 1rem 2rem',
          maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 1.25rem' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 20, background: bg, color: fg }}>
            {initials(person.name)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 500 }}>
              {person.name}
              {isSelf && (
                <span style={{
                  marginLeft: 8, fontSize: 10, padding: '2px 7px', borderRadius: 20,
                  background: '#1a1f0a', color: 'var(--gym-accent)', border: '1px solid #3d4d0f',
                }}>you</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gym-sub)', marginTop: 2 }}>Check-in history</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gym-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: '1.25rem' }}>
          {[
            { label: 'Streak', value: `${streak}d` },
            { label: 'Total', value: total },
            { label: 'This month', value: (person.streakDays || []).filter(d => d.startsWith(todayKey().slice(0, 7))).length },
          ].map(s => (
            <div key={s.label} style={{
              background: '#1f1f1f', border: '1px solid #2a2a2a',
              borderRadius: 10, padding: '10px 8px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--gym-accent)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--gym-sub)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Day labels */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 4, paddingLeft: 28 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} style={{ width: 14, fontSize: 9, color: 'var(--gym-muted)', textAlign: 'center' }}>{d}</div>
          ))}
        </div>

        {/* Habit grid — columns = weeks, rows = days of week */}
        <div style={{ display: 'flex', gap: 3 }}>
          {/* Month labels on left */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', width: 24, flexShrink: 0 }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ height: 17, fontSize: 8, color: 'var(--gym-muted)', display: 'flex', alignItems: 'center' }}>
                {monthLabels[wi]}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
            {[0,1,2,3,4,5,6].map(dayOfWeek => (
              <div key={dayOfWeek} style={{ display: 'flex', gap: 3 }}>
                {weeks.map((week, wi) => {
                  const cell = week[dayOfWeek]
                  if (!cell) return <div key={wi} style={{ width: 14, height: 14 }} />
                  const done = doneDays.has(cell.key)
                  const isToday = cell.key === todayKey()
                  return (
                    <div
                      key={wi}
                      title={cell.key}
                      style={{
                        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                        background: cell.isFuture
                          ? 'transparent'
                          : done
                            ? 'var(--gym-accent)'
                            : '#2a2a2a',
                        border: isToday ? '1px solid var(--gym-accent)' : '1px solid transparent',
                        opacity: cell.isFuture ? 0.2 : 1,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 10, color: 'var(--gym-muted)' }}>Less</span>
          {['#2a2a2a', '#3d4d0f', '#6a8a1f', '#a0c830', '#e8ff47'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
          ))}
          <span style={{ fontSize: 10, color: 'var(--gym-muted)' }}>More</span>
        </div>
      </div>
    </div>
  )
}

export default function SquadPage({ user }) {
  const [profile, setProfile] = useState(null)
  const [friends, setFriends] = useState([])
  const [addEmail, setAddEmail] = useState('')
  const [addMsg, setAddMsg] = useState('')
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState(null) // { person, isSelf, colorIndex }

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) setProfile(snap.data())
    })
    return unsub
  }, [user.uid])

  useEffect(() => {
    if (!profile?.friendIds?.length) { setFriends([]); return }
    const unsubs = profile.friendIds.map(fid =>
      onSnapshot(doc(db, 'users', fid), snap => {
        if (!snap.exists()) return
        setFriends(prev => {
          const data = { ...snap.data(), uid: fid }
          const idx = prev.findIndex(f => f.uid === fid)
          if (idx === -1) return [...prev, data]
          const next = [...prev]; next[idx] = data; return next
        })
      })
    )
    setFriends(prev => prev.filter(f => profile.friendIds.includes(f.uid)))
    return () => unsubs.forEach(u => u())
  }, [profile?.friendIds?.join(',')])

  async function addFriend() {
    setAddMsg(''); setAddError(''); setAdding(true)
    const q = query(collection(db, 'users'), where('email', '==', addEmail.toLowerCase().trim()))
    const snap = await getDocs(q)
    if (snap.empty) { setAddError('No user found with that email.'); setAdding(false); return }
    const found = snap.docs[0]
    if (found.id === user.uid) { setAddError("That's you!"); setAdding(false); return }
    if (profile.friendIds?.includes(found.id)) { setAddError('Already in your squad.'); setAdding(false); return }
    await updateDoc(doc(db, 'users', user.uid), { friendIds: arrayUnion(found.id) })
    await updateDoc(doc(db, 'users', found.id), { friendIds: arrayUnion(user.uid) })
    setAddEmail('')
    setAddMsg(`${found.data().name} added to your squad!`)
    setAdding(false)
  }

  async function removeFriend(fid) {
    await updateDoc(doc(db, 'users', user.uid), { friendIds: arrayRemove(fid) })
    await updateDoc(doc(db, 'users', fid), { friendIds: arrayRemove(user.uid) })
    setFriends(prev => prev.filter(f => f.uid !== fid))
  }

  if (!profile) return <div className="spinner" />

  const week7 = last7Keys()
  const today = todayKey()
  const todayName = DAYS[new Date().getDay()]
  const selfDoneToday = (profile.streakDays || []).includes(today)
  const friendsDoneToday = friends.filter(f => (f.streakDays || []).includes(today)).length
  const totalCheckedIn = (selfDoneToday ? 1 : 0) + friendsDoneToday
  const totalMembers = 1 + friends.length

  function MemberCard({ f, isSelf, colorIndex }) {
    const [bg, fg] = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
    const doneDays = new Set(f.streakDays || [])
    const doneToday = doneDays.has(today)
    const todaySlot = f.split?.find(s => s.day === todayName)
    const splitLabel = todaySlot?.muscle || 'REST'

    return (
      <div
        className="friend-card"
        onClick={() => setSelected({ person: f, isSelf, colorIndex })}
        style={{
          cursor: 'pointer',
          ...(isSelf ? { border: '1px solid var(--gym-accent)', background: '#111' } : {}),
        }}
      >
        <div className="avatar" style={{ background: bg, color: fg }}>
          {initials(f.name)}
        </div>
        <div className="friend-info">
          <div className="friend-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {f.name}
            {isSelf && (
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 20,
                background: '#1a1f0a', color: 'var(--gym-accent)', border: '1px solid #3d4d0f',
              }}>you</span>
            )}
          </div>
          <div className="friend-split">{splitLabel} today</div>
        </div>
        <div className="friend-status">
          <div className={`done-pill ${doneToday ? 'yes' : 'no'}`}>
            {doneToday ? '✓ Done' : '– Not yet'}
          </div>
          <div className="mini-streak">
            {week7.map(k => (
              <div key={k} className={`mini-dot ${doneDays.has(k) ? 'lit' : ''}`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div className="page-label">Live updates</div>
        <div className="page-title">SQUAD</div>
        <div style={{ color: 'var(--gym-sub)', fontSize: 13, marginTop: 6 }}>
          {totalCheckedIn}/{totalMembers} checked in today
        </div>
      </div>

      {/* Add friend */}
      <div className="p-page mb-2">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="Add friend by email"
            value={addEmail}
            onChange={e => setAddEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addFriend()}
            style={{ flex: 1 }}
          />
          <button
            className="btn-primary"
            onClick={addFriend}
            disabled={adding || !addEmail}
            style={{ width: 'auto', padding: '12px 18px', fontSize: 14, letterSpacing: 1 }}
          >
            ADD
          </button>
        </div>
        {addMsg && <div style={{ color: 'var(--gym-accent)', fontSize: 13, marginTop: 6 }}>{addMsg}</div>}
        {addError && <div className="error-msg" style={{ marginTop: 6 }}>{addError}</div>}
      </div>

      {/* Roster */}
      <div className="section-gap">
        <MemberCard f={profile} isSelf={true} colorIndex={0} />
        {friends.length === 0 ? (
          <div className="card text-center" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏋️</div>
            <div style={{ color: 'var(--gym-sub)', fontSize: 14 }}>
              Add friends by email to see their workouts
            </div>
          </div>
        ) : (
          friends.map((f, i) => (
            <MemberCard key={f.uid} f={f} isSelf={false} colorIndex={i + 1} />
          ))
        )}
      </div>

      {/* Manage squad */}
      {friends.length > 0 && (
        <div className="p-page" style={{ marginTop: '1.5rem' }}>
          <div style={{ fontSize: 12, color: 'var(--gym-sub)', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
            Manage squad
          </div>
          {friends.map(f => (
            <div key={f.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--gym-border)' }}>
              <span style={{ fontSize: 14 }}>{f.name}</span>
              <button
                onClick={() => removeFriend(f.uid)}
                style={{ background: 'none', border: 'none', color: 'var(--gym-muted)', fontSize: 12, cursor: 'pointer' }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <HabitModal
          person={selected.person}
          isSelf={selected.isSelf}
          colorIndex={selected.colorIndex}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
