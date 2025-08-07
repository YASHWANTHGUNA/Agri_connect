import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';
import admin from '../utils/firebaseAdmin.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-dev-secret-change-in-production';

// Verify JWT token
const verifyJWTToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('JWT token has expired');
        }
        throw new Error('Invalid JWT token');
    }
};

// Main authentication middleware
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ 
                message: 'No authorization header',
                code: 'NO_AUTH_HEADER'
            });
        }

        const [authType, token] = authHeader.split(' ');
        if (!token) {
            return res.status(401).json({ 
                message: 'No token provided',
                code: 'NO_TOKEN'
            });
        }

        let userData;
        if (authType === 'Bearer') {
            // Handle JWT token
            try {
                userData = verifyJWTToken(token);
                req.user = userData;
            } catch (error) {
                if (error.message.includes('expired')) {
                    return res.status(401).json({ 
                        message: 'Token has expired',
                        code: 'TOKEN_EXPIRED'
                    });
                }
                return res.status(401).json({ 
                    message: 'Invalid token',
                    code: 'INVALID_TOKEN'
                });
            }
        } else if (authType === 'Firebase') {
            // Handle Firebase token
            try {
                const firebaseUser = await admin.auth().verifyIdToken(token);
                const user = await User.findOne({ firebaseUid: firebaseUser.uid });
                
                if (!user) {
                    return res.status(404).json({ 
                        message: 'User not found in database',
                        code: 'USER_NOT_FOUND'
                    });
                }

                req.user = {
                    userId: user._id,
                    email: user.email,
                    role: user.role,
                    firebaseUid: firebaseUser.uid
                };
            } catch (error) {
                console.error('Firebase token verification error:', error);
                if (error.code === 'auth/id-token-expired') {
                    return res.status(401).json({ 
                        message: 'Firebase token has expired',
                        code: 'TOKEN_EXPIRED'
                    });
                }
                return res.status(401).json({ 
                    message: 'Invalid Firebase token',
                    code: 'INVALID_FIREBASE_TOKEN'
                });
            }
        } else {
            return res.status(401).json({ 
                message: 'Invalid authorization type',
                code: 'INVALID_AUTH_TYPE'
            });
        }

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ 
            message: error.message || 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
};

// Role-based access control middleware
export const checkRole = (roles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ 
                    message: 'Authentication required',
                    code: 'NO_USER'
                });
            }

            const user = await User.findById(req.user.userId);
            if (!user) {
                return res.status(404).json({ 
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            if (!roles.includes(user.role)) {
                return res.status(403).json({ 
                    message: 'Insufficient permissions',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    requiredRoles: roles,
                    userRole: user.role
                });
            }

            next();
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({ 
                message: 'Server error during role check',
                code: 'ROLE_CHECK_ERROR'
            });
        }
    };
};

// Firebase-specific authentication middleware
export const authenticateFirebaseToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided or invalid format'
            });
        }

        const idToken = authHeader.split('Bearer ')[1];
        
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            req.user = decodedToken;
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            
            if (error.code === 'auth/id-token-expired') {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Token has expired'
                });
            }
            
            if (error.code === 'auth/invalid-id-token') {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Invalid token'
                });
            }
            
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid authentication token'
            });
        }
    } catch (error) {
        console.error('Authentication middleware error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Error processing authentication'
        });
    }
}; 