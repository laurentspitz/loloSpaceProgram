
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    deleteDoc,
    Timestamp
} from 'firebase/firestore';
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from 'firebase/firestore';

// Configuration will be loaded from environment variables
// VITE_ prefix is required for Vite to expose them
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with offline persistence
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

// Auth Providers
const googleProvider = new GoogleAuthProvider();

export interface GameState {
    version: number;
    timestamp: number;
    rocket: any; // Serialized rocket data
    camera: any; // Camera position/zoom
    simulation: {
        timeScale: number;
        paused: boolean;
    };
}

export const FirebaseService = {
    auth,
    db,

    // --- Auth ---
    loginWithGoogle: async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    },

    logout: async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed", error);
            throw error;
        }
    },

    onAuthStateChanged: (callback: (user: User | null) => void) => {
        return onAuthStateChanged(auth, callback);
    },

    // --- Database ---
    saveGame: async (userId: string, slotName: string, data: any) => {
        try {
            const gameRef = doc(db, 'users', userId, 'saves', slotName);
            await setDoc(gameRef, {
                ...data,
                updatedAt: Timestamp.now()
            });
            console.log("Game saved successfully!");
        } catch (error) {
            console.error("Error saving game:", error);
            throw error;
        }
    },

    loadGame: async (userId: string, slotName: string) => {
        try {
            const gameRef = doc(db, 'users', userId, 'saves', slotName);
            const docSnap = await getDoc(gameRef);

            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                console.log("No such save file!");
                return null;
            }
        } catch (error) {
            console.error("Error loading game:", error);
            throw error;
        }
    },

    listSaves: async (userId: string) => {
        try {
            const savesRef = collection(db, 'users', userId, 'saves');
            const querySnapshot = await getDocs(savesRef);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error listing saves:", error);
            throw error;
        }
    },

    deleteGame: async (userId: string, slotName: string) => {
        try {
            const gameRef = doc(db, 'users', userId, 'saves', slotName);
            await deleteDoc(gameRef);
            console.log(`Game slot "${slotName}" deleted successfully!`);
        } catch (error) {
            console.error("Error deleting game:", error);
            throw error;
        }
    },

    checkConnection: async () => {
        try {
            // Try to read a non-existent document just to test connection
            const testRef = doc(db, 'system', 'ping');
            await getDoc(testRef);
            return true;
        } catch (error: any) {
            return false;
        }
    },

    // --- Hangar Rockets ---
    saveRocket: async (userId: string, rocketId: string, rocketData: any) => {
        try {
            const rocketRef = doc(db, 'users', userId, 'rockets', rocketId);
            await setDoc(rocketRef, {
                ...rocketData,
                updatedAt: Timestamp.now()
            });
            console.log("Rocket saved to cloud!");
        } catch (error) {
            console.error("Error saving rocket:", error);
            throw error;
        }
    },

    loadRockets: async (userId: string) => {
        try {
            const rocketsRef = collection(db, 'users', userId, 'rockets');
            const querySnapshot = await getDocs(rocketsRef);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error loading rockets:", error);
            throw error;
        }
    },

    deleteRocket: async (userId: string, rocketId: string) => {
        try {
            const rocketRef = doc(db, 'users', userId, 'rockets', rocketId);
            await deleteDoc(rocketRef);
            console.log("Rocket deleted from cloud!");
        } catch (error) {
            console.error("Error deleting rocket:", error);
            throw error;
        }
    },

    // --- User Settings ---
    /**
     * Save user settings (keyboard controls, preferences, etc.)
     */
    saveUserSettings: async (userId: string, settings: any) => {
        try {
            const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
            await setDoc(settingsRef, settings, { merge: true });
            console.log('✓ User settings saved');
        } catch (error) {
            console.error('Error saving user settings:', error);
            throw error;
        }
    },

    /**
     * Load user settings
     */
    loadUserSettings: async (userId: string) => {
        try {
            const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
            const docSnap = await getDoc(settingsRef);

            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                console.log('No saved settings found');
                return null;
            }
        } catch (error) {
            console.error('Error loading user settings:', error);
            throw error;
        }
    }
};

// Expose for debugging in console
if (typeof window !== 'undefined') {
    (window as any).FirebaseService = FirebaseService;
}
