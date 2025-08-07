// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import axios from "axios";
import config from "../config";

const AuthContext = createContext();

// Retry function with exponential backoff
const retryWithBackoff = async (fn, retries = config.retryAttempts, delay = config.retryDelay) => {
    try {
        return await fn();
    } catch (error) {
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(fn, retries - 1, delay * 2);
    }
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));

    // Function to get a fresh Firebase token
    const getFreshFirebaseToken = useCallback(async (currentUser) => {
        try {
            return await retryWithBackoff(() => currentUser.getIdToken(true));
        } catch (error) {
            console.error("Error getting fresh Firebase token:", error);
            throw new Error("Failed to refresh Firebase token");
        }
    }, []);

    // Function to get JWT token from backend
    const getJWTToken = useCallback(async (firebaseToken) => {
        try {
            const response = await retryWithBackoff(() => 
                axios.post(
                    `${config.backendUrl}${config.apiEndpoints.auth}/token`,
                    { firebaseToken },
                    {
                        ...config.axiosConfig,
                        headers: {
                            ...config.axiosConfig.headers,
                            'Authorization': `Bearer ${firebaseToken}`
                        }
                    }
                )
            );
            
            return response.data.token;
        } catch (error) {
            console.error("Error getting JWT token:", error);
            if (error.response) {
                throw new Error(error.response.data.message || "Failed to get JWT token");
            }
            throw new Error("Network error while getting JWT token");
        }
    }, []);

    // Function to refresh tokens
    const refreshTokens = useCallback(async (currentUser) => {
        try {
            const firebaseToken = await getFreshFirebaseToken(currentUser);
            const jwtToken = await getJWTToken(firebaseToken);
            
            localStorage.setItem('token', jwtToken);
            setToken(jwtToken);
            
            return { firebaseToken, jwtToken };
        } catch (error) {
            console.error("Token refresh error:", error);
            // Clear tokens on error
            localStorage.removeItem('token');
            setToken(null);
            throw error;
        }
    }, [getFreshFirebaseToken, getJWTToken]);

    // Set up auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            try {
                if (currentUser) {
                    const { jwtToken } = await refreshTokens(currentUser);
                    
                    setUser({
                        ...currentUser,
                        token: jwtToken
                    });
                    setError(null);
                } else {
                    setUser(null);
                    setToken(null);
                    localStorage.removeItem('token');
                }
            } catch (error) {
                console.error("Auth state change error:", error);
                setError(error.message);
                setUser(null);
                setToken(null);
                localStorage.removeItem('token');
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [refreshTokens]);

    // Set up token refresh interval
    useEffect(() => {
        if (!user) return;

        const refreshInterval = setInterval(async () => {
            try {
                await refreshTokens(user);
            } catch (error) {
                console.error("Token refresh interval error:", error);
                // Only set error if it's a critical error
                if (error.message.includes("Network error")) {
                    setError("Network error. Please check your connection.");
                }
            }
        }, config.tokenRefreshInterval);

        return () => clearInterval(refreshInterval);
    }, [user, refreshTokens]);

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setToken(null);
            localStorage.removeItem('token');
            setError(null);
        } catch (error) {
            console.error("Logout error:", error);
            setError(error.message);
        }
    };

    const value = {
        user,
        token,
        loading,
        error,
        logout,
        refreshTokens,
        isAuthenticated: !!user && !!token
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
