import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/safeClient';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AuditLog {
    id: string;
    user_id: string;
    action: string;
    table_name: string;
    record_id: string;
    ip_address: string;
    created_at: string;
}

export const AuditLogViewer = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Error fetching logs:', error);
        } else {
            setLogs(data || []);
        }
        setLoading(false);
    };

    const getActionBadge = (action: string) => {
        const variants: Record<string, "default" | "destructive" | "secondary"> = {
            'SOFT_DELETE': 'destructive',
            'RESTORE': 'secondary',
            'PERMANENT_DELETE': 'destructive',
            'CREATE': 'default',
            'UPDATE': 'secondary',
        };

        return (
            <Badge variant={variants[action] || 'default'}>
                {action}
            </Badge>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>
                    Track all administrative actions (Last 100 entries)
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Loading logs...</p>
                ) : logs.length === 0 ? (
                    <p className="text-muted-foreground">No audit logs found</p>
                ) : (
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                            {logs.map((log) => (
                                <div key={log.id} className="border rounded-lg p-3 text-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        {getActionBadge(log.action)}
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(log.created_at), 'PPp')}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">Table:</span> {log.table_name}
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Record:</span> {log.record_id?.substring(0, 8)}...
                                        </div>
                                        {log.ip_address && (
                                            <div>
                                                <span className="text-muted-foreground">IP:</span> {log.ip_address}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
};
