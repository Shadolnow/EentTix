import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * SiteAnalytics Tracker
 * Automatically records page views and visitor interaction
 */
export const useAnalytics = () => {
    const location = useLocation();

    useEffect(() => {
        const trackVisit = async () => {
            // Get or create visitor ID from localStorage
            let visitorId = localStorage.getItem('site_visitor_id');
            if (!visitorId) {
                visitorId = uuidv4();
                localStorage.setItem('site_visitor_id', visitorId);
            }

            try {
                const { error } = await supabase
                    .from('site_visits')
                    .insert({
                        visitor_id: visitorId,
                        page_path: location.pathname + location.search,
                        referrer: document.referrer || null,
                        user_agent: navigator.userAgent,
                        metadata: {
                            screen_resolution: `${window.screen.width}x${window.screen.height}`,
                            language: navigator.language,
                        }
                    });

                if (error) {
                    // Silently fail to not interrupt user experience
                    console.debug('Analytics error:', error);
                }
            } catch (err) {
                console.debug('Analytics tracking failed:', err);
            }
        };

        trackVisit();
    }, [location.pathname, location.search]);
};

export const AnalyticsTracker = () => {
    useAnalytics();
    return null;
};
