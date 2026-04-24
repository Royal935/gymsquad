import { useState, useEffect } from 'react'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

const MUSCLES = ['PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER', 'FULL BODY', 'CARDIO', 'REST']

export default function SplitPage({ user }) {
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(null) // index of day being edited
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setProfile(snap.data())
    })
    return unsub
  }, [user.uid])

  if (!profile) return <div className="spinner" />

  const split = profile.split || []

  async function updateDay(idx, field, value) {
    const newSplit = split.map((d, i) => i === idx ? { ...d, [field]: value } : d)
    setSaving(true)
    await updateDoc(doc(db, 'users', user.uid), { split: newSplit })
    setSaving(false)
  }

  async function addExercise(dayIdx) {
    const newEx = { name: 'New Exercise', sets: '3', reps: '10', muscle: '' }
    const newSplit = split.map((d, i) =>
      i === dayIdx ? { ...d, exercises: [...(d.exercises || []), newEx] } : d
    )
    await updateDoc(doc(db, 'users', user.uid), { split: newSplit })
  }

  async function updateExercise(dayIdx, exIdx, field, value) {
    const newSplit = split.map((d, i) => {
      if (i !== dayIdx) return d
      const newExs = d.exercises.map((ex, j) => j === exIdx ? { ...ex, [field]: value } : ex)
      return { ...d, exercises: newExs }
    })
    await updateDoc(doc(db, 'users', user.uid), { split: newSplit })
  }

  async function removeExercise(dayIdx, exIdx) {
    const newSplit = split.map((d, i) => {
      if (i !== dayIdx) return d
      return { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) }
    })
    await updateDoc(doc(db, 'users', user.uid), { split: newSplit })
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div className="page-label">Weekly</div>
        <div className="page-title">MY SPLIT</div>
      </div>

      {editing === null ? (
        // Grid view
        <>
          <div className="split-grid mb-2">
            {split.map((day, i) => (
              <div
                key={i}
                className="split-card"
                onClick={() => setEditing(i)}
              >
                <div className="split-day-label">{day.day}</div>
                <div className="split-muscle">{day.muscle}</div>
                <div className="split-exs">
                  {day.exercises?.length > 0
                    ? `${day.exercises.length} exercise${day.exercises.length !== 1 ? 's' : ''}`
                    : 'Rest'}
                </div>
              </div>
            ))}
          </div>
          <div className="p-page text-muted text-center">Tap a day to edit exercises</div>
        </>
      ) : (
        // Edit view for one day
        <div className="p-page">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
            <button
              className="btn-secondary"
              style={{ width: 'auto', padding: '8px 16px' }}
              onClick={() => setEditing(null)}
            >← Back</button>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gym-sub)', letterSpacing: 1, textTransform: 'uppercase' }}>
                {split[editing].day}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1 }}>
                {split[editing].muscle}
              </div>
            </div>
          </div>

          {/* Muscle type selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {MUSCLES.map(m => (
              <button
                key={m}
                onClick={() => updateDay(editing, 'muscle', m)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  border: '1px solid',
                  borderColor: split[editing].muscle === m ? 'var(--gym-accent)' : 'var(--gym-border)',
                  background: split[editing].muscle === m ? '#1a1f0a' : 'transparent',
                  color: split[editing].muscle === m ? 'var(--gym-accent)' : 'var(--gym-sub)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Exercises */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
            {(split[editing].exercises || []).map((ex, j) => (
              <div key={j} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="input"
                    value={ex.name}
                    onChange={e => updateExercise(editing, j, 'name', e.target.value)}
                    placeholder="Exercise name"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => removeExercise(editing, j)}
                    style={{ background: 'none', border: 'none', color: 'var(--gym-accent2)', fontSize: 18, padding: '4px 8px' }}
                  >×</button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--gym-sub)', marginBottom: 4 }}>SETS</div>
                    <input
                      className="input"
                      value={ex.sets}
                      onChange={e => updateExercise(editing, j, 'sets', e.target.value)}
                      style={{ padding: '8px 12px' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--gym-sub)', marginBottom: 4 }}>REPS</div>
                    <input
                      className="input"
                      value={ex.reps}
                      onChange={e => updateExercise(editing, j, 'reps', e.target.value)}
                      style={{ padding: '8px 12px' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--gym-sub)', marginBottom: 4 }}>MUSCLE</div>
                    <input
                      className="input"
                      value={ex.muscle}
                      onChange={e => updateExercise(editing, j, 'muscle', e.target.value)}
                      placeholder="e.g. Chest"
                      style={{ padding: '8px 12px' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {split[editing].muscle !== 'REST' && (
            <button className="btn-secondary" onClick={() => addExercise(editing)}>
              + Add Exercise
            </button>
          )}
        </div>
      )}
    </div>
  )
}
