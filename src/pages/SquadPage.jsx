import { useState, useEffect } from 'react'
import {
  doc, onSnapshot, updateDoc, arrayUnion, arrayRemove,
  collection, query, where, getDocs
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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

// Build a calendar grid for a given year+month
function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  // leading empty cells so week starts on Sunday
  const startOffset = firstDay.getDay()
  const cells = []

  for (let i = 0; i < startOffset; i++) {
    cells.push(null)
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ key, day: d, isFuture: date > today })
  }

  return cells
}

// Get all year+month combos from earliest checkin to now
function getAvailableMonths(streakDays = []) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  if (!streakDays.length) {
    return [{ year: currentYear, month: currentMonth }]
  }

  const sorted = [...streakDays].sort()
  const earliest = new Date(sorted[0])
  const startYear = earliest.getFullYear()
  const startMonth = earliest.getMonth()

  const months = []
  let y = startYear
  let m = startMonth
  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    months.push({ year: y, month: m })
    m++
    if (m > 11) { m = 0; y++ }
  }
  return months.reverse() // newest first
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
  const now = new Date()
  const [bg, fg] = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
  const doneDays = new Set(person.streakDays || [])
  const streak = calcStreak(person.streakDays || [])
  const total = (person.streakDays || []).length
  const availableMonths = getAvailableMonths(person.streakDays || [])
  const [selectedIdx, setSelectedIdx] = useState(0) // 0 = most recent

  const { year, month } = availableMonths[selectedIdx]
  const grid = buildMonthGrid(year, month)
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthTotal = (person.streakDays || []).filter(d => d.startsWith(monthKey)).length
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const daysSoFar = isCurrentMonth ? now.getDate() : daysInMonth

  // group grid into weeks
  const weeks = []
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7))
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#181818', borderRadius: '16px 16px 0 0',
          border: '1px solid #2a2a2a', width: '100%', maxWidth: 480,
          padding: '1.25rem 1rem 2.5rem',
          maxHeight: '90vh', overflowY: 'auto',
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
            <div style={{ fontSize: 17, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
              {person.name}
              {isSelf && (
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 20,
                  background: '#1a1f0a', color: 'var(--gym-accent)', border: '1px solid #3d4d0f',
                }}>you</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gym-sub)', marginTop: 2 }}>Check-in history</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gym-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Overall stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1.25rem' }}>
          {[
            { label: 'Current streak', value: `${streak} days` },
            { label: 'Total check-ins', value: total },
          ].map(s => (
            <div key={s.label} style={{
              background: '#1f1f1f', border: '1px solid #2a2a2a',
              borderRadius: 10, padding: '10px 12px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--gym-accent)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--gym-sub)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button
            onClick={() => setSelectedIdx(i => Math.min(i + 1, availableMonths.length - 1))}
            disabled={selectedIdx >= availableMonths.length - 1}
            style={{
              background: 'none', border: '1px solid var(--gym-border)', borderRadius: 8,
              color: selectedIdx >= availableMonths.length - 1 ? 'var(--gym-border)' : 'var(--gym-text)',
              fontSize: 18, width: 36, height: 36, cursor: selectedIdx >= availableMonths.length - 1 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >‹</button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--gym-accent)', letterSpacing: 1 }}>
              {MONTH_NAMES[month].toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gym-sub)' }}>{year}</div>
          </div>

          <button
            onClick={() => setSelectedIdx(i => Math.max(i - 1, 0))}
            disabled={selectedIdx <= 0}
            style={{
              background: 'none', border: '1px solid var(--gym-border)', borderRadius: 8,
              color: selectedIdx <= 0 ? 'var(--gym-border)' : 'var(--gym-text)',
              fontSize: 18, width: 36, height: 36, cursor: selectedIdx <= 0 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >›</button>
        </div>

        {/* Month stat */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#1f1f1f', border: '1px solid #2a2a2a',
          borderRadius: 10, padding: '10px 14px', marginBottom: '1rem',
        }}>
          <span style={{ fontSize: 13, color: 'var(--gym-sub)' }}>
            {MONTH_SHORT[month]} {year} check-ins
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gym-accent)' }}>
            {monthTotal} / {daysSoFar}
          </span>
        </div>

        {/* Day of week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--gym-muted)', fontWeight: 500 }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {week.map((cell, di) => {
                if (!cell) return <div key={di} />
                const done = doneDays.has(cell.key)
                const isToday = cell.key === todayKey()
                return (
                  <div
                    key={di}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 6,
                      background: cell.isFuture
                        ? 'transparent'
                        : done
                          ? 'var(--gym-accent)'
                          : '#2a2a2a',
                      border: isToday
                        ? '2px solid var(--gym-accent)'
                        : '2px solid transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11,
                      color: done ? '#000' : cell.isFuture ? 'transparent' : 'var(--gym-muted)',
                      fontWeight: done ? 500 : 400,
                      opacity: cell.isFuture ? 0.3 : 1,
                    }}
                  >
                    {cell.day}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Year quick-jump if multiple years */}
        {availableMonths.some(m => m.year !== now.getFullYear()) && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ fontSize: 11, color: 'var(--gym-sub)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              Jump to year
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[...new Set(availableMonths.map(m => m.year))].map(y => (
                <button
                  key={y}
                  onClick={() => {
                    const idx = availableMonths.findIndex(m => m.year === y && (y < now.getFullYear() ? m.month === 11 : m.month === now.getMonth()))
                    setSelectedIdx(idx >= 0 ? idx : availableMonths.findIndex(m => m.year === y))
                  }}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: '1px solid',
                    borderColor: year === y ? 'var(--gym-accent)' : 'var(--gym-border)',
                    background: year === y ? '#1a1f0a' : 'transparent',
                    color: year === y ? 'var(--gym-accent)' : 'var(--gym-sub)',
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}
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
  const [selected, setSelected] = useState(null)

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
