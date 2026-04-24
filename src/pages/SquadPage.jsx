import { useState, useEffect } from 'react'
import {
  doc, onSnapshot, updateDoc, arrayUnion, arrayRemove,
  collection, query, where, getDocs
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

const AVATAR_COLORS = [
  ['#1a1f0a', '#e8ff47'],
  ['#2a1f3a', '#c4a0f5'],
  ['#1a2f45', '#7ab8f5'],
  ['#1f2e18', '#a0d870'],
  ['#3a2015', '#f5a070'],
  ['#2a2015', '#f5d070'],
  ['#1a2a35', '#70d5f5'],
]

export default function SquadPage({ user }) {
  const [profile, setProfile] = useState(null)
  const [friends, setFriends] = useState([])
  const [addEmail, setAddEmail] = useState('')
  const [addMsg, setAddMsg] = useState('')
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)

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
        style={isSelf ? { border: '1px solid var(--gym-accent)', background: '#111' } : {}}
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
              }}>
                you
              </span>
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

      {/* Roster — self always pinned at top */}
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
    </div>
  )
}
