
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

// Initialize Firebase with Fallback
let app: any;
let auth: any;
let db: any;
let isInitialized = false;

try {
    // Check if critical config is present to avoid "invalid-api-key" error before it happens?
    // Actually, initializeApp throws if apiKey is missing/invalid format, OR later calls do.
    // The user's error was "auth/invalid-api-key".

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Initialize Firestore with offline persistence
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });

    isInitialized = true;
    console.log("Firebase initialized successfully.");

} catch (error) {
    console.warn("⚠️ Firebase Initialization Failed - Starting in OFFLINE Mode.");
    console.warn("Error details:", error);

    // Mock objects to prevent immediate crashes on property access (like auth.currentUser)
    auth = {
        currentUser: null,
        // Mock onAuthStateChanged to immediately return 'null' user
        onAuthStateChanged: (cb: any) => { cb(null); return () => { }; }
    };
    db = {};
    isInitialized = false;
}

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

// Helper to check init
const checkInit = () => {
    if (!isInitialized) {
        throw new Error("Game is in OFFLINE mode. Cloud features are disabled.");
    }
};

export const FirebaseService = {
    auth,
    db,
    isInitialized, // Public flag

    // --- Auth ---
    loginWithGoogle: async () => {
        if (!isInitialized) {
            console.warn("Cannot login: Offline Mode");
            return null;
        }
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    },

    logout: async () => {
        if (!isInitialized) return;
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed", error);
            throw error;
        }
    },

    onAuthStateChanged: (callback: (user: User | null) => void) => {
        if (!isInitialized) {
            // Immediately callback with null
            callback(null);
            return () => { }; // Unsubscribe no-op
        }
        return onAuthStateChanged(auth, callback);
    },

    // --- Database ---
    saveGame: async (userId: string, slotName: string, data: any) => {
        checkInit();
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
        checkInit();
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
        checkInit();
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
        checkInit();
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
        if (!isInitialized) return false;
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
        checkInit();
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
        checkInit();
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
        checkInit();
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
    saveUserSettings: async (userId: string, settings: any) => {
        if (!isInitialized) return; // Silent fail for settings in offline mode? Or throw?
        // Silent is better for UX, just doesn't persist to cloud.
        try {
            const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
            await setDoc(settingsRef, settings, { merge: true });
            console.log('✓ User settings saved');
        } catch (error) {
            console.error('Error saving user settings:', error);
            // Don't throw, just log
        }
    },

    loadUserSettings: async (userId: string) => {
        if (!isInitialized) return null;
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
            return null; // Don't throw
        }
    }
};

// Expose for debugging in console
if (typeof window !== 'undefined') {
    (window as any).FirebaseService = FirebaseService;
}
