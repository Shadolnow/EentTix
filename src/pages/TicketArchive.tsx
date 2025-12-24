import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/safeClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Archive, RefreshCw, Undo2, Trash2, Calendar, User, Mail, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const TicketArchive = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [archivedTickets, setArchivedTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        fetchArchivedTickets();
    }, [user]);

    const fetchArchivedTickets = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('archived_tickets')
                .select('*')
                .order('archived_at', { ascending: false });

            if (error) throw error;
            setArchivedTickets(data || []);
        } catch (error) {
            console.error('Error fetching archived tickets:', error);
            toast.error('Failed to load archive');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (archivedTicketId: string) => {
        setRestoring(archivedTicketId);
        try {
            const { error } = await supabase.rpc('restore_ticket', {
                archived_ticket_id: archivedTicketId
            });

            if (error) throw error;

            toast.success('Ticket restored successfully!');
            fetchArchivedTickets(); // Refresh list
        } catch (error) {
            console.error('Error restoring ticket:', error);
            toast.error('Failed to restore ticket');
        } finally {
            setRestoring(null);
        }
    };

    const handlePermanentDelete = async (archivedTicketId: string, ticketCode: string) => {
        const confirmed = window.confirm(
            `⚠️ PERMANENT DELETE\n\nAre you sure you want to permanently delete ticket ${ticketCode}?\n\nThis action CANNOT be undone!`
        );

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('archived_tickets')
                .delete()
                .eq('id', archivedTicketId);

            if (error) throw error;

            toast.success('Ticket permanently deleted');
            fetchArchivedTickets();
        } catch (error) {
            console.error('Error permanently deleting ticket:', error);
            toast.error('Failed to delete ticket');
        }
    };

    const getDaysUntilDeletion = (autoDeleteAt: string) => {
        const deleteDate = new Date(autoDeleteAt);
        const now = new Date();
        const diffTime = deleteDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Archive className="w-8 h-8 text-primary" />
                            Ticket Archive
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Deleted tickets stored for 14 days
                        </p>
                    </div>
                    <Button onClick={fetchArchivedTickets} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Total Archived</CardDescription>
                            <CardTitle className="text-3xl">{archivedTickets.length}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Expiring Soon</CardDescription>
                            <CardTitle className="text-3xl text-orange-600">
                                {archivedTickets.filter(t => getDaysUntilDeletion(t.auto_delete_at) <= 3).length}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Archive Status</CardDescription>
                            <CardTitle className="text-lg">
                                <Badge variant="outline" className="text-sm">
                                    Active Retention
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                {/* Archived Tickets List */}
                {archivedTickets.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Archive className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Archived Tickets</h3>
                        <p className="text-muted-foreground">
                            Deleted tickets will appear here and can be restored within 14 days
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {archivedTickets.map((ticket) => {
                            const daysLeft = getDaysUntilDeletion(ticket.auto_delete_at);
                            const isExpiringSoon = daysLeft <= 3;

                            return (
                                <Card key={ticket.id} className={isExpiringSoon ? 'border-orange-500' : ''}>
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-3 flex-1">
                                                {/* Ticket Code and Status */}
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <code className="text-lg font-mono font-bold bg-gray-100 px-3 py-1 rounded">
                                                        {ticket.ticket_code}
                                                    </code>
                                                    {isExpiringSoon && (
                                                        <Badge variant="destructive">
                                                            Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}!
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline">
                                                        Archived {format(new Date(ticket.archived_at), 'MMM d, yyyy')}
                                                    </Badge>
                                                </div>

                                                {/* Attendee Info */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-muted-foreground" />
                                                        <span>{ticket.attendee_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                                        <span className="truncate">{ticket.attendee_email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                                        <span>{ticket.attendee_phone}</span>
                                                    </div>
                                                </div>

                                                {/* Deletion Reason */}
                                                {ticket.deletion_reason && (
                                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                                        <p className="text-xs font-semibold text-yellow-900 mb-1">
                                                            Deletion Reason:
                                                        </p>
                                                        <p className="text-sm text-yellow-800">{ticket.deletion_reason}</p>
                                                    </div>
                                                )}

                                                {/* Timeline */}
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        Auto-deletes: {format(new Date(ticket.auto_delete_at), 'MMM d, yyyy h:mm a')}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2 ml-4">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleRestore(ticket.id)}
                                                    disabled={restoring === ticket.id}
                                                    className="whitespace-nowrap"
                                                >
                                                    {restoring === ticket.id ? (
                                                        <>
                                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                            Restoring...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Undo2 className="w-4 h-4 mr-2" />
                                                            Restore
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handlePermanentDelete(ticket.id, ticket.ticket_code)}
                                                    className="whitespace-nowrap"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete Now
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketArchive;
