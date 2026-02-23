import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyD3E6BPhObT3bkgbtk0gRyF4zdi5dzuX6E',
  authDomain: 'kinshasa-research.firebaseapp.com',
  projectId: 'kinshasa-research',
  storageBucket: 'kinshasa-research.firebasestorage.app',
  messagingSenderId: '658504105676',
  appId: '1:658504105676:web:9109c37541a26fbece0c69',
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

// Enable offline persistence (best-effort — fails silently in some environments)
enableIndexedDbPersistence(db).catch(() => {
  // Multi-tab or unsupported browser — fallback to memory cache
})
