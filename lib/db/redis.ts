import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const ENABLE_REDIS = process.env.ENABLE_REDIS_CACHE === 'true'; // Only enable if explicitly set to 'true'

let redisClient: Redis | null = null;
let connectionAttempted = false;

export function getRedisClient(): Redis | null {
    if (!ENABLE_REDIS) {
        if (!connectionAttempted) {
            console.log('ℹ️  Redis is disabled (set ENABLE_REDIS_CACHE=true in .env.local to enable)');
            connectionAttempted = true;
        }
        return null;
    }

    if (redisClient) {
        return redisClient;
    }

    try {
        console.log('🔄 Connecting to Redis...');
        redisClient = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            enableOfflineQueue: false, // Don't queue commands if disconnected
            lazyConnect: true, // Don't connect immediately
            retryStrategy: (times) => {
                if (times > 3) {
                    console.log('⚠️  Redis connection failed after 3 attempts, disabling Redis features');
                    return null; // Stop retrying
                }
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            reconnectOnError: (err) => {
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) {
                    return true;
                }
                return false;
            },
        });

        redisClient.on('connect', () => {
            console.log('✅ Redis connected successfully');
        });

        redisClient.on('error', (err) => {
            console.error('❌ Redis error:', err.message);
        });

        redisClient.on('close', () => {
            console.log('📡 Redis connection closed');
        });

        // Try to connect
        redisClient.connect().catch((err) => {
            console.error('❌ Failed to connect to Redis:', err.message);
            redisClient = null;
        });

        return redisClient;
    } catch (error) {
        console.error('❌ Failed to create Redis client:', error);
        return null;
    }
}

export async function disconnectRedis(): Promise<void> {
    if (redisClient) {
        try {
            await redisClient.quit();
            redisClient = null;
            console.log('✅ Redis disconnected');
        } catch (error) {
            // Ignore errors during disconnect
            redisClient = null;
        }
    }
}

// Cache helper functions
export async function cacheGet<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        // Silently fail - caching is optional
        return null;
    }
}

export async function cacheSet(key: string, value: any, expirySeconds: number = 300): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
        await client.setex(key, expirySeconds, JSON.stringify(value));
        return true;
    } catch (error) {
        // Silently fail - caching is optional
        return false;
    }
}

export async function cacheDel(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
        await client.del(key);
        return true;
    } catch (error) {
        // Silently fail - caching is optional
        return false;
    }
}

// IP Blocking functions
export async function blockIP(ip: string, reason: string = 'Violation of terms'): Promise<boolean> {
    const client = getRedisClient();
    if (!client) {
        console.warn('⚠️  Cannot block IP: Redis is not enabled');
        return false;
    }

    try {
        const blockData = {
            ip,
            reason,
            blockedAt: Date.now(),
        };
        // Block for 30 days
        await client.setex(`blocked:ip:${ip}`, 30 * 24 * 60 * 60, JSON.stringify(blockData));
        return true;
    } catch (error) {
        console.error('Redis IP block error:', error);
        return false;
    }
}

export async function isIPBlocked(ip: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false; // If Redis is disabled, no IPs are blocked

    try {
        const blocked = await client.get(`blocked:ip:${ip}`);
        return blocked !== null;
    } catch (error) {
        // Silently fail - if Redis is down, don't block anyone
        return false;
    }
}

export async function unblockIP(ip: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) {
        console.warn('⚠️  Cannot unblock IP: Redis is not enabled');
        return false;
    }

    try {
        await client.del(`blocked:ip:${ip}`);
        return true;
    } catch (error) {
        console.error('Redis IP unblock error:', error);
        return false;
    }
}

// Note: Graceful shutdown (process.on) is not available in Next.js Edge Runtime
// The middleware uses Edge Runtime, so we can't use Node.js APIs like process.on here
