// agriconnect2.0/backend/dialogflowConfig.js

import dialogflow from '@google-cloud/dialogflow';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define possible paths for the key file
const POSSIBLE_KEY_PATHS = [
    join(__dirname, '..', 'config', 'dialogflow-key.json'),
    join(__dirname, 'config', 'dialogflow-key.json'),
    join(__dirname, 'dialogflow-key.json')
];

const PROJECT_ID = process.env.DIALOGFLOW_PROJECT_ID || 'agriconnect-a0e1c';

let sessionClient = null;
let isDialogflowEnabled = false;
let credentials = null;
let errorMessage = null;

// Try to load credentials from multiple possible locations
for (const keyPath of POSSIBLE_KEY_PATHS) {
    try {
        console.log('Trying to load Dialogflow key from:', keyPath);
        const keyFileContent = readFileSync(keyPath, 'utf8');
        credentials = JSON.parse(keyFileContent);
        
        // Validate required fields
        if (!credentials.type || !credentials.project_id || !credentials.private_key || !credentials.client_email) {
            throw new Error('Key file is missing required fields');
        }
        
        // Validate project ID matches
        if (credentials.project_id !== PROJECT_ID) {
            throw new Error(`Project ID mismatch. Expected ${PROJECT_ID}, got ${credentials.project_id}`);
        }
        
        // If we get here, we found a valid key file
        console.log('Successfully loaded Dialogflow key from:', keyPath);
        break;
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File not found, try next path
            console.log('Key file not found at:', keyPath);
            continue;
        }
        errorMessage = `Error loading key file: ${error.message}`;
        console.error(errorMessage);
        break;
    }
}

// Initialize Dialogflow client if we have valid credentials
if (credentials) {
    try {
        sessionClient = new dialogflow.SessionsClient({ credentials });
        isDialogflowEnabled = true;
        console.log('Dialogflow service initialized successfully');
    } catch (error) {
        errorMessage = `Dialogflow client initialization failed: ${error.message}`;
        console.warn(errorMessage);
    }
} else if (!errorMessage) {
    errorMessage = 'No valid Dialogflow key file found in any of the expected locations';
    console.error(errorMessage);
}

// Export configuration and status
export {
    sessionClient,
    PROJECT_ID,
    isDialogflowEnabled,
    credentials,
    errorMessage
};