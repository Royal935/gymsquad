import { useState, useEffect } from 'react'
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../lib/firebase'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const AVATAR_COLORS = [
  ['#2a1f3a', '#c4a0f5'],
  ['#1a2f45', '#7ab8f5'],
  ['#1f2e18', '#a0d870'],
  ['#3a2015', '#f5a070'],
  ['#2a2015', '#f5d070'],
  ['#1a2a35', '#70d5f5'],
]

export default function WeightPage({ user }) {
  const [profile, setProfile] = useState(null)
  const [friends, setFriends] = useState([])
  const [weightInput, setWeightInput] = useState('')
  const [goalInput, setGoalInput] = useState('')
  const [editingGoal, setEditingGoal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [unit, setUnit] = useState('lbs') // 'lbs' | 'kg'

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) {
        const data = snap.data()
        setProfile(data)
        if (data.weightUnit) setUnit(data.weightUnit)
      }
    })
    return unsub
  }, [user.uid])

  // Real-time friends
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
    return () => unsubs.forEach(u => u())
  }, [profile?.friendIds?.join(',')])

  if (!profile) return <div className="spinner" />

  const weightLog = profile.weightLog || []
  const latestWeight = weightLog.length > 0 ? weightLog[weightLog.length - 1].weight : null
  const firstWeight = weightLog.length > 0 ? weightLog[0].weight : null
  const goalWeight = profile.goalWeight || null
  const loggedToday = weightLog.some(e => e.date === todayKey())

  async function logWeight() {
    const w = parseFloat(weightInput)
    if (!w || isNaN(w)) return
    setSaving(true)
    await updateDoc(doc(db, 'users', user.uid), {
      weightLog: arrayUnion({ date: todayKey(), weight: w }),
      currentWeight: w,
      weightUnit: unit,
    })
    setWeightInput('')
    setSaving(false)
  }

  async function saveGoal() {
    const g = parseFloat(goalInput)
    if (!g || isNaN(g)) return
    setSaving(true)
    await updateDoc(doc(db, 'users', user.uid), { goalWeight: g, weightUnit: unit })
    setGoalInput('')
    setEditingGoal(false)
    setSaving(false)
  }

  // Progress calculation: how far from start toward goal (0-100%)
  function calcProgress(person) {
    const log = person.weightLog || []
    if (!log.length || !person.goalWeight) return null
    const start = log[0].weight
    const current = log[log.length - 1].weight
    const goal = person.goalWeight
    if (start === goal) return 100
    const pct = Math.round(((start - current) / (start - goal)) * 100)
    return Math.min(100, Math.max(0, pct))
  }

  // Build squad list including self
  const selfEntry = {
    ...profile,
    uid: user.uid,
    name: profile.name + ' (you)',
    isSelf: true,
  }
  const squadWithSelf = [selfEntry, ...friends].filter(p =>
    (p.weightLog || []).length > 0 && p.goalWeight
  )
  squadWithSelf.sort((a, b) => (calcProgress(b) || 0) - (calcProgress(a) || 0))

  const change = latestWeight && firstWeight ? (latestWeight - firstWeight).toFixed(1) : null

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div className="page-label">Track & compare</div>
        <div className="page-title">WEIGHT</div>
      </div>

      <div className="p-page" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Unit toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          {['lbs', 'kg'].map(u => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              style={{
                padding: '5px 16px', borderRadius: 20, border: '1px solid',
                borderColor: unit === u ? 'var(--gym-accent)' : 'var(--gym-border)',
                background: unit === u ? '#1a1f0a' : 'transparent',
                color: unit === u ? 'var(--gym-accent)' : 'var(--gym-sub)',
                fontSize: 12, cursor: 'pointer',
              }}
            >
              {u}
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Current', value: latestWeight ? `${latestWeight} ${unit}` : '—' },
            { label: 'Goal', value: goalWeight ? `${goalWeight} ${unit}` : '—' },
            { label: 'Change', value: change ? `${change > 0 ? '+' : ''}${change} ${unit}` : '—' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 22,
                color: s.label === 'Change' && change
                  ? (parseFloat(change) < 0 ? 'var(--gym-accent)' : '#ff6b6b')
                  : 'var(--gym-accent)'
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gym-sub)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Log weight */}
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--gym-sub)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            {loggedToday ? 'Update today\'s weight' : 'Log today\'s weight'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              type="number"
              placeholder={`Weight in ${unit}`}
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && logWeight()}
              style={{ flex: 1 }}
            />
            <button
              className="btn-primary"
              onClick={logWeight}
              disabled={saving || !weightInput}
              style={{ width: 'auto', padding: '12px 18px', fontSize: 14, letterSpacing: 1 }}
            >
              LOG
            </button>
          </div>
        </div>

        {/* Goal setter */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingGoal ? 10 : 0 }}>
            <div style={{ fontSize: 12, color: 'var(--gym-sub)', letterSpacing: 1, textTransform: 'uppercase' }}>
              Weight goal
            </div>
            <button
              onClick={() => { setEditingGoal(!editingGoal); setGoalInput(goalWeight || '') }}
              style={{ background: 'none', border: 'none', color: 'var(--gym-accent)', fontSize: 12, cursor: 'pointer' }}
            >
              {editingGoal ? 'Cancel' : goalWeight ? 'Edit' : 'Set goal'}
            </button>
          </div>

          {!editingGoal && goalWeight && (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gym-accent)', marginTop: 6 }}>
              {goalWeight} {unit}
            </div>
          )}

          {!editingGoal && !goalWeight && (
            <div style={{ color: 'var(--gym-muted)', fontSize: 13, marginTop: 6 }}>
              No goal set yet — tap "Set goal" to add one
            </div>
          )}

          {editingGoal && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                type="number"
                placeholder={`Target weight in ${unit}`}
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveGoal()}
                style={{ flex: 1 }}
              />
              <button
                className="btn-primary"
                onClick={saveGoal}
                disabled={saving || !goalInput}
                style={{ width: 'auto', padding: '12px 18px', fontSize: 14, letterSpacing: 1 }}
              >
                SAVE
              </button>
            </div>
          )}
        </div>

        {/* Weight log history */}
        {weightLog.length > 0 && (
          <div className="card">
            <div style={{ fontSize: 12, color: 'var(--gym-sub)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              Recent entries
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...weightLog].reverse().slice(0, 7).map((entry, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0', borderBottom: '1px solid var(--gym-border)' }}>
                  <span style={{ color: 'var(--gym-sub)' }}>{entry.date}</span>
                  <span style={{ fontWeight: 500 }}>{entry.weight} {unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Squad leaderboard */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 10, letterSpacing: 1 }}>
            SQUAD PROGRESS
          </div>

          {squadWithSelf.length === 0 ? (
            <div className="card text-center" style={{ padding: '1.5rem' }}>
              <div style={{ color: 'var(--gym-sub)', fontSize: 13 }}>
                Once you and your squad set goals and log weight, the leaderboard will appear here.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {squadWithSelf.map((person, i) => {
                const pct = calcProgress(person) || 0
                const [bg, fg] = AVATAR_COLORS[i % AVATAR_COLORS.length]
                const personLatest = (person.weightLog || []).slice(-1)[0]?.weight
                const personGoal = person.goalWeight

                return (
                  <div key={person.uid} className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      {/* Rank */}
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: i === 0 ? '#1a1f0a' : 'var(--gym-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 500,
                        color: i === 0 ? 'var(--gym-accent)' : 'var(--gym-muted)',
                        flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>
                      <div className="avatar" style={{ width: 36, height: 36, fontSize: 14, background: bg, color: fg }}>
                        {initials(person.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{person.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--gym-sub)' }}>
                          {personLatest} → {personGoal} {person.weightUnit || unit}
                        </div>
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 20,
                        color: pct >= 100 ? 'var(--gym-accent)' : 'var(--gym-text)',
                      }}>
                        {pct}%
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{
                      height: 8, background: 'var(--gym-border)', borderRadius: 4, overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: pct >= 100
                          ? 'var(--gym-accent)'
                          : `linear-gradient(90deg, #3d4d0f, var(--gym-accent))`,
                        borderRadius: 4,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
