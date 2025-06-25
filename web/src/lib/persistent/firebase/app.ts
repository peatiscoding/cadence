import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore/lite'
import config from '../../../firebase.config'

const app = initializeApp(config)
const db = getFirestore(app)

// Start the Firebase Application
//
