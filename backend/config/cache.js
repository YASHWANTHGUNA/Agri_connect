import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
    // Redis Client Connected
});

// Cache middleware
export const cacheMiddleware = (duration) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }

        const key = `__express__${req.originalUrl || req.url}`;

        try {
            const cachedResponse = await redisClient.get(key);
            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }
        } catch (error) {
            console.error('Cache Error:', error);
        }

        res.sendResponse = res.json;
        res.json = (body) => {
            redisClient.setex(key, duration, JSON.stringify(body))
                .catch(err => console.error('Cache Set Error:', err));
            res.sendResponse(body);
        };
        next();
    };
};

// Cache invalidation
export const invalidateCache = async (pattern) => {
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    } catch (error) {
        console.error('Cache Invalidation Error:', error);
    }
};

export default redisClient; 