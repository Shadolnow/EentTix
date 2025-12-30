import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface PullToRefreshOptions {
    onRefresh: () => Promise<void>;
    threshold?: number;
}

/**
 * Enhanced Pull-to-Refresh Hook
 * Provides state and handlers for native-like pull to refresh on mobile
 */
export const usePullToRefresh = (options: PullToRefreshOptions | (() => Promise<void>)) => {
    // Support both object and function argument for backward compatibility
    const config = typeof options === 'function' ? { onRefresh: options } : options;
    const { onRefresh, threshold = 80 } = config;

    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (window.scrollY <= 0) {
            const touchY = e.touches[0].clientY;
            (window as any)._pullStart = touchY;
            setIsPulling(true);
        }
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        const startY = (window as any)._pullStart;
        if (startY === undefined || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const distance = Math.max(0, currentY - startY);

        // Applying resistance
        const resistance = 0.4;
        const pull = distance * resistance;

        if (pull > 0) {
            setPullDistance(pull);

            // Prevent body scroll when pulling
            if (pull > 10 && e.cancelable) {
                e.preventDefault();
            }
        }
    }, [isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        const startY = (window as any)._pullStart;
        if (startY === undefined) return;

        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            try {
                await onRefresh();
                toast.success('Refreshed successfully!');
            } catch (error) {
                console.error('Refresh failed:', error);
                toast.error('Failed to refresh');
            } finally {
                setIsRefreshing(false);
            }
        }

        // Reset state
        setPullDistance(0);
        setIsPulling(false);
        delete (window as any)._pullStart;
    }, [pullDistance, threshold, isRefreshing, onRefresh]);

    useEffect(() => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (!isMobile) return;

        window.addEventListener('touchstart', handleTouchStart, { passive: false });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    return {
        isPulling,
        pullDistance,
        isRefreshing,
        showIndicator: pullDistance > 0 || isRefreshing
    };
};

/**
 * HOC for pages that need pull-to-refresh
 */
export const withPullToRefresh = (Component: React.ComponentType<any>, onRefresh: () => Promise<void>) => {
    return (props: any) => {
        const { showIndicator, pullDistance, isRefreshing } = usePullToRefresh(onRefresh);

        return (
            <div className="relative">
                {showIndicator && (
                    <div
                        className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
                        style={{
                            height: isRefreshing ? '60px' : `${Math.min(pullDistance, 100)}px`,
                            opacity: Math.min(pullDistance / 50, 1),
                            transition: isRefreshing ? 'height 0.3s ease' : 'none'
                        }}
                    >
                        <div className="bg-background/80 backdrop-blur-md rounded-full p-2 shadow-lg border border-primary/20">
                            <div className={`w-6 h-6 border-2 border-primary border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`}
                                style={{ transform: !isRefreshing ? `rotate(${pullDistance * 2}deg)` : 'none' }} />
                        </div>
                    </div>
                )}
                <Component {...props} />
            </div>
        );
    };
};
