// agriconnect2.0/backend/server.js
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { sessionClient, PROJECT_ID, isDialogflowEnabled } from './dialogflowConfig.js';
import WeatherService from './WeatherService.js';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import forumRoutes from './routes/forum.js';
import net from 'net';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Default configuration values
const config = {
    port: process.env.PORT || 5003,
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/agriconnect',
    jwtSecret: process.env.JWT_SECRET || 'default-dev-secret-change-in-production',
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    logLevel: process.env.LOG_LEVEL || 'info'
};

// Function to check if a port is in use
const isPortInUse = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer()
            .once('error', () => resolve(true))
            .once('listening', () => {
                server.close();
                resolve(false);
            })
            .listen(port);
    });
};

// Function to find an available port
const findAvailablePort = async (startPort) => {
    let port = startPort;
    while (await isPortInUse(port)) {
        port++;
        if (port > startPort + 100) { // Limit the port range
            throw new Error('No available ports found in range');
        }
    }
    return port;
};

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false
}));

// CORS configuration
app.use(cors({
    origin: config.clientOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400 // 24 hours
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan(config.logLevel === 'debug' ? 'dev' : 'combined'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/forum', forumRoutes);

// Weather API routes
app.get('/api/weather/current/:city', async (req, res) => {
    try {
        const { city } = req.params;
        if (!city) {
            return res.status(400).json({ message: 'City parameter is required' });
        }
        const weatherData = await WeatherService.getCurrentWeather(city);
        res.json(weatherData);
    } catch (error) {
        console.error('Weather API error:', error);
        res.status(error.message.includes('not configured') ? 503 : 500)
           .json({ message: error.message });
    }
});

app.get('/api/weather/forecast/:city', async (req, res) => {
    try {
        const { city } = req.params;
        if (!city) {
            return res.status(400).json({ message: 'City parameter is required' });
        }
        const forecastData = await WeatherService.getFiveDayForecast(city);
        res.json(forecastData);
    } catch (error) {
        console.error('Forecast API error:', error);
        res.status(error.message.includes('not configured') ? 503 : 500)
           .json({ message: error.message });
    }
});

// Chatbot route
app.post('/api/dialogflow', async (req, res) => {
    try {
        const { message, languageCode = 'en', sessionId } = req.body;

        if (!message) {
            return res.status(400).json({ 
                message: 'Message is required',
                error: 'MISSING_MESSAGE'
            });
        }

        if (!isDialogflowEnabled) {
            return res.status(503).json({
                message: 'Dialogflow service is not configured',
                error: 'SERVICE_DISABLED'
            });
        }

        if (!sessionClient) {
            return res.status(503).json({
                message: 'Dialogflow client is not initialized',
                error: 'CLIENT_ERROR'
            });
        }

        const sessionPath = sessionClient.projectAgentSessionPath(
            PROJECT_ID,
            sessionId || 'default-session'
        );

        const request = {
            session: sessionPath,
            queryInput: {
                text: {
                    text: message,
                    languageCode: languageCode
                }
            }
        };

        const [response] = await sessionClient.detectIntent(request);
        const result = response.queryResult;

        res.json({
            message: result.fulfillmentText,
            intent: result.intent.displayName,
            confidence: result.intentDetectionConfidence,
            parameters: result.parameters.fields
        });
    } catch (error) {
        console.error('Dialogflow error:', error);
        
        if (error.code === 'ENOENT') {
            return res.status(503).json({
                message: 'Dialogflow service is not configured',
                error: 'MISSING_CONFIG'
            });
        }

        if (error.code === 7) {
            return res.status(401).json({
                message: 'Dialogflow authentication failed',
                error: 'AUTH_ERROR'
            });
        }

        res.status(500).json({
            message: 'Error processing your request',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        error: config.nodeEnv === 'development' ? err : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server function
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Find available port
        const port = await findAvailablePort(config.port);
        
        // Start server
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
            // Write port to file for frontend
            fs.writeFileSync('backend-port.txt', port.toString());
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});

// Start the server
startServer();
