import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Enter your name'); setLoading(false); return }
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: name.trim() })
        // Create user doc in Firestore
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          name: name.trim(),
          email: email.toLowerCase(),
          split: defaultSplit,
          streakDays: [],
          friendIds: [],
          createdAt: serverTimestamp(),
        })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (e) {
      const messages = {
        'auth/email-already-in-use': 'Email already in use.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/user-not-found': 'No account found for that email.',
        'auth/wrong-password': 'Wrong password.',
        'auth/invalid-credential': 'Invalid email or password.',
      }
      setError(messages[e.code] || e.message)
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">GYMSQUAD</div>
      <div className="auth-sub">
        {mode === 'login' ? 'Log back in. Time to grind.' : 'Create your account. Welcome to the squad.'}
      </div>

      <div className="form-group">
        {mode === 'signup' && (
          <div>
            <div className="form-label" style={{ marginBottom: 6 }}>Name</div>
            <input
              className="input"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        )}
        <div>
          <div className="form-label" style={{ marginBottom: 6 }}>Email</div>
          <input
            className="input"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <div>
          <div className="form-label" style={{ marginBottom: 6 }}>Password</div>
          <input
            className="input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? '...' : mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
        </button>
        <button
          className="btn-secondary"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  )
}

const defaultSplit = [
  { day: 'Mon', muscle: 'PUSH', exercises: [
    { name: 'Bench Press', sets: '4', reps: '8', muscle: 'Chest' },
    { name: 'Overhead Press', sets: '3', reps: '10', muscle: 'Shoulders' },
    { name: 'Tricep Pushdowns', sets: '3', reps: '12', muscle: 'Triceps' },
  ]},
  { day: 'Tue', muscle: 'PULL', exercises: [
    { name: 'Pull-Ups', sets: '4', reps: '8', muscle: 'Back' },
    { name: 'Barbell Row', sets: '3', reps: '10', muscle: 'Back' },
    { name: 'Bicep Curls', sets: '3', reps: '12', muscle: 'Biceps' },
  ]},
  { day: 'Wed', muscle: 'LEGS', exercises: [
    { name: 'Squats', sets: '4', reps: '8', muscle: 'Quads' },
    { name: 'Romanian Deadlift', sets: '3', reps: '10', muscle: 'Hamstrings' },
    { name: 'Calf Raises', sets: '4', reps: '15', muscle: 'Calves' },
  ]},
  { day: 'Thu', muscle: 'REST', exercises: [] },
  { day: 'Fri', muscle: 'PUSH', exercises: [
    { name: 'Incline DB Press', sets: '3', reps: '12', muscle: 'Chest' },
    { name: 'Lateral Raises', sets: '4', reps: '15', muscle: 'Shoulders' },
    { name: 'Skull Crushers', sets: '3', reps: '10', muscle: 'Triceps' },
  ]},
  { day: 'Sat', muscle: 'PULL', exercises: [
    { name: 'Deadlift', sets: '3', reps: '5', muscle: 'Back' },
    { name: 'Face Pulls', sets: '3', reps: '15', muscle: 'Rear Delts' },
    { name: 'Hammer Curls', sets: '3', reps: '12', muscle: 'Biceps' },
  ]},
  { day: 'Sun', muscle: 'REST', exercises: [] },
]
