// backend/utils/firebaseAdmin.js
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define possible paths for the service account key file
const POSSIBLE_KEY_PATHS = [
    join(__dirname, '..', 'config', 'firebase-service-account.json'),
    join(__dirname, '..', 'firebase-service-account.json'),
    join(__dirname, 'firebase-service-account.json')
];

let app;

try {
    // Try to load service account from file
    let serviceAccount;
    for (const keyPath of POSSIBLE_KEY_PATHS) {
        try {
            console.log('Trying to load Firebase service account from:', keyPath);
            const keyFileContent = readFileSync(keyPath, 'utf8');
            serviceAccount = JSON.parse(keyFileContent);
            console.log('Successfully loaded Firebase service account from:', keyPath);
            break;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('Service account file not found at:', keyPath);
                continue;
            }
            throw error;
        }
    }

    if (!serviceAccount) {
        // If no service account file found, try environment variables
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                console.log('Loaded Firebase service account from environment variable');
            } catch (error) {
                console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', error);
            }
        }
    }

    if (!serviceAccount) {
        throw new Error('No Firebase service account configuration found');
    }

    // Initialize Firebase Admin
    if (!admin.apps.length) {
        app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });
        console.log('Firebase Admin initialized successfully');
    } else {
        app = admin.app();
        console.log('Using existing Firebase Admin instance');
    }
} catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw error; // Always throw in production
}

// Export a function to verify Firebase ID tokens
export const verifyFirebaseToken = async (idToken) => {
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        console.error('Error verifying Firebase token:', error);
        throw error;
    }
};

export default admin; 