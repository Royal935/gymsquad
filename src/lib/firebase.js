import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAMfbBl4nFd2fGdWpD1ukmPhCpMBuoMQc0",
  authDomain: "gymsquad-dd414.firebaseapp.com",
  projectId: "gymsquad-dd414",
  storageBucket: "gymsquad-dd414.firebasestorage.app",
  messagingSenderId: "448146792168",
  appId: "1:448146792168:web:bc26baf049f2b28771b35d",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)