import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Eye, Activity, TrendingUp } from 'lucide-react';
import { useEventAnalytics, useGlobalAnalytics } from '@/hooks/useRealtimeAnalytics';
import { Badge } from '@/components/ui/badge';

interface RealtimeAnalyticsProps {
    eventId?: string;
    showGlobal?: boolean;
}

export const RealtimeAnalytics: React.FC<RealtimeAnalyticsProps> = ({ eventId, showGlobal = false }) => {
    const eventAnalytics = useEventAnalytics(eventId);
    const globalAnalytics = useGlobalAnalytics();

    if (showGlobal) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Activity className="h-4 w-4 text-primary animate-pulse" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{globalAnalytics.activeUsersNow}</div>
                        <p className="text-xs text-muted-foreground">Currently viewing</p>
                        <Badge variant="secondary" className="mt-2">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2"></span>
                            Live
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Page Views Today</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{globalAnalytics.totalPageViewsToday}</div>
                        <p className="text-xs text-muted-foreground">Total views</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{globalAnalytics.uniqueVisitorsToday}</div>
                        <p className="text-xs text-muted-foreground">Today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Events Viewed</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{globalAnalytics.totalEventsViewedToday}</div>
                        <p className="text-xs text-muted-foreground">Unique events</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!eventId || eventAnalytics.loading) {
        return null;
    }

    return (
        <Card className="border-2 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary animate-pulse" />
                    Real-Time Event Analytics
                </CardTitle>
                <CardDescription>Live visitor data and statistics</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Active Now</span>
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2"></span>
                                Live
                            </Badge>
                        </div>
                        <div className="text-3xl font-bold text-primary">
                            {eventAnalytics.activeUsersNow}
                        </div>
                        <p className="text-xs text-muted-foreground">Viewing this event right now</p>
                    </div>

                    <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Today's Visits</div>
                        <div className="text-3xl font-bold">{eventAnalytics.totalVisitsToday}</div>
                        <p className="text-xs text-muted-foreground">
                            {eventAnalytics.uniqueVisitorsToday} unique visitors
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">All-Time</div>
                        <div className="text-3xl font-bold">{eventAnalytics.totalVisitsAllTime}</div>
                        <p className="text-xs text-muted-foreground">
                            {eventAnalytics.uniqueVisitorsAllTime} unique visitors
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
