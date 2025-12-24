import { useState } from 'react';
import { checkRateLimit, ticketClaimRateLimiter, getUserIdentifier } from '@/lib/rateLimit';
import { toast } from 'sonner';

interface UseRateLimitResult {
    checkLimit: (userId?: string) => Promise<boolean>;
    isRateLimited: boolean;
    resetTime: Date | null;
}

export function useRateLimit(action: 'ticket' | 'event' | 'login' | 'api'): UseRateLimitResult {
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [resetTime, setResetTime] = useState<Date | null>(null);

    const limiters = {
        ticket: ticketClaimRateLimiter,
        event: ticketClaimRateLimiter, // Reusing for now, create eventCreationRateLimiter if needed
        login: ticketClaimRateLimiter,
        api: ticketClaimRateLimiter,
    };

    const checkLimit = async (userId?: string): Promise<boolean> => {
        const identifier = getUserIdentifier(userId);
        const limiter = limiters[action];

        try {
            const result = await checkRateLimit(limiter, identifier);

            if (!result.success) {
                setIsRateLimited(true);
                setResetTime(result.reset);

                const minutesUntilReset = Math.ceil((result.reset.getTime() - Date.now()) / 60000);
                toast.error(
                    `Rate limit exceeded. Please try again in ${minutesUntilReset} minute${minutesUntilReset > 1 ? 's' : ''}.`
                );

                return false;
            }

            setIsRateLimited(false);
            setResetTime(null);
            return true;
        } catch (error) {
            console.error('Rate limit check failed:', error);
            // In case of error, allow the action (fail open)
            return true;
        }
    };

    return {
        checkLimit,
        isRateLimited,
        resetTime,
    };
}
