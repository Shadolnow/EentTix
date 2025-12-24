import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { RefreshCw, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface ArchivedItem {
    id: string;
    original_data: any;
    deleted_at: string;
    restore_before: string;
}

export const ArchiveManager = () => {
    const [archivedTickets, setArchivedTickets] = useState<ArchivedItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchArchived();
    }, []);

    const fetchArchived = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('archived_tickets')
            .select('*')
            .order('deleted_at', { ascending: false });

        if (error) {
            console.error('Error fetching archived:', error);
        } else {
            setArchivedTickets(data || []);
        }
        setLoading(false);
    };

    const handleRestore = async (ticketId: string) => {
        const { data, error } = await supabase.rpc('restore_ticket', {
            ticket_id: ticketId
        });

        if (error) {
            toast.error('Failed to restore ticket');
            console.error(error);
        } else if (data) {
            toast.success('Ticket restored successfully!');
            fetchArchived();
        }
    };

    const downloadArchive = () => {
        const dataStr = JSON.stringify(archivedTickets, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `archive-${format(new Date(), 'yyyy-MM-dd')}.json`;
        link.click();
        toast.success('Archive downloaded');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Archive Management</CardTitle>
                <CardDescription>
                    Deleted items are kept for 7 days before permanent deletion
                </CardDescription>
                <div className="flex gap-2">
                    <Button onClick={fetchArchived} variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={downloadArchive} variant="outline" size="sm" disabled={archivedTickets.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Archive
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Loading...</p>
                ) : archivedTickets.length === 0 ? (
                    <p className="text-muted-foreground">No archived items</p>
                ) : (
                    <div className="space-y-4">
                        {archivedTickets.map((item) => (
                            <div key={item.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">
                                            {item.original_data.ticket_code || item.original_data.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Deleted: {format(new Date(item.deleted_at), 'PPp')}
                                        </p>
                                        <p className="text-sm text-yellow-600">
                                            Restore before: {format(new Date(item.restore_before), 'PPp')}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleRestore(item.id)}
                                            variant="outline"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Restore
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
