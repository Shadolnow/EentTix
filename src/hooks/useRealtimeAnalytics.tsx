import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';

// Generate a unique session ID for this browser session
const getSessionId = () => {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
};

interface UseRealtimePresenceOptions {
    eventId?: string;
    pageUrl?: string;
    pingInterval?: number; // milliseconds
}

export const useRealtimePresence = (options: UseRealtimePresenceOptions = {}) => {
    const {
        eventId,
        pageUrl = window.location.pathname,
        pingInterval = 30000, // 30 seconds
    } = options;

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const updatePresence = async () => {
        try {
            const sessionId = getSessionId();

            // Use any type to bypass TypeScript restrictions
            await (supabase.rpc as any)('update_active_session', {
                p_session_id: sessionId,
                p_page_url: pageUrl,
                p_event_id: eventId || null,
                p_user_agent: navigator.userAgent,
                p_ip_address: null, // IP will be captured server-side if needed
            });
        } catch (error) {
            console.error('Error updating presence:', error);
        }
    };

    useEffect(() => {
        // Initial ping
        updatePresence();

        // Set up interval for periodic pings
        intervalRef.current = setInterval(updatePresence, pingInterval);

        // Ping on visibility change (when tab becomes active)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updatePresence();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [eventId, pageUrl, pingInterval]);

    return { updatePresence };
};

// Hook to fetch real-time analytics for an event
export const useEventAnalytics = (eventId: string | undefined) => {
    const [analytics, setAnalytics] = useState({
        activeUsersNow: 0,
        totalVisitsToday: 0,
        totalVisitsAllTime: 0,
        uniqueVisitorsToday: 0,
        uniqueVisitorsAllTime: 0,
        loading: true,
    });

    useEffect(() => {
        if (!eventId) return;

        const fetchAnalytics = async () => {
            try {
                // Use any type to bypass TypeScript restrictions
                const { data, error } = await (supabase.rpc as any)('get_event_analytics', { p_event_id: eventId });

                if (error) throw error;

                if (data && Array.isArray(data) && data.length > 0) {
                    const result = data[0];
                    setAnalytics({
                        activeUsersNow: Number(result.active_users_now) || 0,
                        totalVisitsToday: Number(result.total_visits_today) || 0,
                        totalVisitsAllTime: Number(result.total_visits_all_time) || 0,
                        uniqueVisitorsToday: Number(result.unique_visitors_today) || 0,
                        uniqueVisitorsAllTime: Number(result.unique_visitors_all_time) || 0,
                        loading: false,
                    });
                }
            } catch (error) {
                console.error('Error fetching event analytics:', error);
                setAnalytics(prev => ({ ...prev, loading: false }));
            }
        };

        // Initial fetch
        fetchAnalytics();

        // Refresh every 10 seconds
        const interval = setInterval(fetchAnalytics, 10000);

        return () => clearInterval(interval);
    }, [eventId]);

    return analytics;
};

// Hook to fetch global real-time analytics
export const useGlobalAnalytics = () => {
    const [analytics, setAnalytics] = useState({
        activeUsersNow: 0,
        totalPageViewsToday: 0,
        uniqueVisitorsToday: 0,
        totalEventsViewedToday: 0,
        loading: true,
    });

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Use any type to bypass TypeScript restrictions
                const { data, error } = await (supabase.rpc as any)('get_global_analytics');

                if (error) throw error;

                if (data && Array.isArray(data) && data.length > 0) {
                    const result = data[0];
                    setAnalytics({
                        activeUsersNow: Number(result.active_users_now) || 0,
                        totalPageViewsToday: Number(result.total_page_views_today) || 0,
                        uniqueVisitorsToday: Number(result.unique_visitors_today) || 0,
                        totalEventsViewedToday: Number(result.total_events_viewed_today) || 0,
                        loading: false,
                    });
                }
            } catch (error) {
                console.error('Error fetching global analytics:', error);
                setAnalytics(prev => ({ ...prev, loading: false }));
            }
        };

        // Initial fetch
        fetchAnalytics();

        // Refresh every 5 seconds for real-time feel
        const interval = setInterval(fetchAnalytics, 5000);

        return () => clearInterval(interval);
    }, []);

    return analytics;
};

