import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Upstash Redis client
// You'll need to set these environment variables in Vercel/Supabase:
// VITE_UPSTASH_REDIS_REST_URL
// VITE_UPSTASH_REDIS_REST_TOKEN

const redis = new Redis({
    url: (import.meta as any).env.VITE_UPSTASH_REDIS_REST_URL || '',
    token: (import.meta as any).env.VITE_UPSTASH_REDIS_REST_TOKEN || '',
});

// Create different rate limiters for different use cases

// API calls - 10 requests per 10 seconds
export const apiRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 s'),
    analytics: true,
    prefix: '@upstash/ratelimit/api',
});

// Ticket claims - 5 per minute
export const ticketClaimRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    analytics: true,
    prefix: '@upstash/ratelimit/ticket',
});

// Event creation - 10 per hour
export const eventCreationRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '3600 s'),
    analytics: true,
    prefix: '@upstash/ratelimit/event',
});

// Login attempts - 5 per 5 minutes
export const loginRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '300 s'),
    analytics: true,
    prefix: '@upstash/ratelimit/login',
});

// Helper function to check rate limit
export async function checkRateLimit(
    limiter: Ratelimit,
    identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: Date }> {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    return {
        success,
        limit,
        remaining,
        reset: new Date(reset),
    };
}

// Helper to get user identifier (IP or user ID)
export function getUserIdentifier(userId?: string): string {
    // Use user ID if available, otherwise use a placeholder
    // In production, you'd get the actual IP address from the request
    return userId || 'anonymous';
}

export { redis };
