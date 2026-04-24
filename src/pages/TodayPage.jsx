import { useState, useEffect } from 'react'
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore'
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

export default function TodayPage({ user }) {
  const [profile, setProfile] = useState(null)
  const [checked, setChecked] = useState(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setProfile(snap.data())
    })
    return unsub
  }, [user.uid])

  if (!profile) return <div className="spinner" />

  const todayName = DAYS[new Date().getDay()]
  const todaySlot = profile.split?.find(s => s.day === todayName) || { muscle: 'REST', exercises: [] }
  const streak7 = last7Keys()
  const doneDays = new Set(profile.streakDays || [])
  const alreadyDoneToday = doneDays.has(todayKey())
  const exercises = todaySlot.exercises || []

  function toggleEx(i) {
    if (alreadyDoneToday) return
    setChecked(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  async function markDone() {
    if (saving || alreadyDoneToday) return
    setSaving(true)
    const ref = doc(db, 'users', user.uid)
    await updateDoc(ref, {
      streakDays: arrayUnion(todayKey()),
      lastCheckin: {
        date: todayKey(),
        muscle: todaySlot.muscle,
      }
    })
    setSaving(false)
  }

  const pct = exercises.length > 0 ? Math.round((checked.size / exercises.length) * 100) : 0

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div className="page-label">{todayName} • {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>
        <div className="page-title">{todaySlot.muscle}</div>
        {exercises.length > 0 && (
          <div style={{
            display: 'inline-block',
            marginTop: 8,
            background: '#1f1f1f',
            border: '1px solid #2a2a2a',
            color: '#888',
            fontSize: 11,
            padding: '4px 10px',
            borderRadius: 20,
          }}>
            {exercises.map(e => e.muscle).filter((v,i,a) => a.indexOf(v) === i).join(' · ')}
          </div>
        )}
      </div>

      {/* Streak bar */}
      <div className="streak-bar">
        {streak7.map(k => (
          <div key={k} className={`streak-day ${doneDays.has(k) ? 'done' : ''}`} />
        ))}
      </div>

      {/* Exercises */}
      <div className="section-gap mb-2">
        {exercises.length === 0 ? (
          <div className="card text-center" style={{ padding: '2rem' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🛌</div>
            <div style={{ color: 'var(--gym-sub)', fontSize: 14 }}>Rest day. Recover hard.</div>
          </div>
        ) : (
          exercises.map((ex, i) => (
            <div
              key={i}
              className={`exercise-item ${checked.has(i) || alreadyDoneToday ? 'done' : ''}`}
              onClick={() => toggleEx(i)}
            >
              <div className="ex-check">
                {(checked.has(i) || alreadyDoneToday) && '✓'}
              </div>
              <div className="ex-info">
                <div className="ex-name">{ex.name}</div>
                <div className="ex-detail">{ex.sets} sets × {ex.reps} reps</div>
              </div>
              <div className="ex-muscle">{ex.muscle}</div>
            </div>
          ))
        )}
      </div>

      {/* CTA */}
      <div className="p-page">
        {exercises.length > 0 && (
          alreadyDoneToday ? (
            <button className="btn-primary" style={{ background: '#1a1f0a', color: 'var(--gym-accent)', border: '1px solid #3d4d0f' }} disabled>
              ✓ DAY LOGGED
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={markDone}
              disabled={checked.size === 0 || saving}
            >
              {saving ? '...' : checked.size === exercises.length ? 'MARK DAY DONE' : `MARK DONE  (${pct}%)`}
            </button>
          )
        )}
      </div>
    </div>
  )
}
