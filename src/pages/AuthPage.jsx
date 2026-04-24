import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingVerification, setPendingVerification] = useState(false)

  async function handleSubmit() {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Enter your name'); setLoading(false); return }
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: name.trim() })
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          name: name.trim(),
          email: email.toLowerCase(),
          split: defaultSplit,
          streakDays: [],
          friendIds: [],
          createdAt: serverTimestamp(),
        })
        await sendEmailVerification(cred.user)
        await signOut(auth)
        setPendingVerification(true)
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email)
        setSuccess('Reset email sent! Check your inbox.')
        setLoading(false)
        return
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        if (!cred.user.emailVerified) {
          await signOut(auth)
          setError('Please verify your email before logging in. Check your inbox.')
          setLoading(false)
          return
        }
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

  async function resendVerification() {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(cred.user)
      await signOut(auth)
      setSuccess('Verification email resent! Check your inbox.')
    } catch (e) {
      setError('Could not resend email. Try logging in again.')
    }
    setLoading(false)
  }

  function switchMode(newMode) {
    setMode(newMode)
    setError('')
    setSuccess('')
    setPendingVerification(false)
  }

  // Verification pending screen
  if (pendingVerification) {
    return (
      <div className="auth-page">
        <div className="auth-logo">GYMSQUAD</div>
        <div style={{
          background: '#1a1f0a', border: '1px solid #3d4d0f',
          borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📧</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gym-accent)', marginBottom: 8 }}>
            CHECK YOUR EMAIL
          </div>
          <div style={{ fontSize: 14, color: 'var(--gym-sub)', lineHeight: 1.6 }}>
            We sent a verification link to <strong style={{ color: 'var(--gym-text)' }}>{email}</strong>.
            Click the link in the email to activate your account, then log in.
          </div>
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 10 }}>{error}</div>}
        {success && <div style={{ color: 'var(--gym-accent)', fontSize: 13, marginBottom: 10 }}>{success}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn-primary" onClick={() => switchMode('login')}>
            GO TO LOGIN
          </button>
          <button className="btn-secondary" onClick={resendVerification} disabled={loading}>
            {loading ? '...' : 'Resend verification email'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">GYMSQUAD</div>
      <div className="auth-sub">
        {mode === 'login' && 'Log back in. Time to grind.'}
        {mode === 'signup' && 'Create your account. Welcome to the squad.'}
        {mode === 'reset' && "Enter your email and we'll send a reset link."}
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
        {mode !== 'reset' && (
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
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div style={{ color: 'var(--gym-accent)', fontSize: 13, marginTop: '0.5rem' }}>{success}</div>}

      <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? '...' : mode === 'login' ? 'LOG IN' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SEND RESET EMAIL'}
        </button>

        {mode === 'login' && (
          <>
            <button className="btn-secondary" onClick={() => switchMode('signup')}>
              Don't have an account? Sign up
            </button>
            <button
              onClick={() => switchMode('reset')}
              style={{ background: 'none', border: 'none', color: 'var(--gym-sub)', fontSize: 13, cursor: 'pointer', marginTop: 4 }}
            >
              Forgot password?
            </button>
          </>
        )}

        {mode === 'signup' && (
          <button className="btn-secondary" onClick={() => switchMode('login')}>
            Already have an account? Log in
          </button>
        )}

        {mode === 'reset' && (
          <button className="btn-secondary" onClick={() => switchMode('login')}>
            ← Back to login
          </button>
        )}
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
