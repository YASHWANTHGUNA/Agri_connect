import { auth } from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile
} from 'firebase/auth';

class AuthService {
    constructor() {
        this.auth = auth;
        this.currentUser = null;
        this.authStateListeners = new Set();
        
        // Set up auth state listener
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            this.notifyAuthStateListeners(user);
        });
    }

    // Add auth state listener
    addAuthStateListener(listener) {
        this.authStateListeners.add(listener);
        // Immediately notify with current state
        if (this.currentUser) {
            listener(this.currentUser);
        }
        return () => this.authStateListeners.delete(listener);
    }

    // Notify all listeners of auth state change
    notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(listener => listener(user));
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get ID token
    async getIdToken() {
        if (!this.currentUser) {
            throw new Error('No user is currently signed in');
        }
        try {
            return await this.currentUser.getIdToken(true);
        } catch (error) {
            console.error('Error getting ID token:', error);
            throw error;
        }
    }

    // Sign in with email and password
    async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw this.handleAuthError(error);
        }
    }

    // Sign up with email and password
    async signUp(email, password, displayName) {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            if (displayName) {
                await updateProfile(userCredential.user, { displayName });
            }
            return userCredential.user;
        } catch (error) {
            console.error('Sign up error:', error);
            throw this.handleAuthError(error);
        }
    }

    // Sign out
    async signOut() {
        try {
            await signOut(this.auth);
        } catch (error) {
            console.error('Sign out error:', error);
            throw this.handleAuthError(error);
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(this.auth, email);
        } catch (error) {
            console.error('Password reset error:', error);
            throw this.handleAuthError(error);
        }
    }

    // Handle Firebase auth errors
    handleAuthError(error) {
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return new Error('Invalid email or password');
            case 'auth/email-already-in-use':
                return new Error('Email is already in use');
            case 'auth/weak-password':
                return new Error('Password is too weak');
            case 'auth/invalid-email':
                return new Error('Invalid email address');
            case 'auth/too-many-requests':
                return new Error('Too many attempts. Please try again later');
            default:
                return new Error('An error occurred during authentication');
        }
    }
}

export const authService = new AuthService();
export default authService; 