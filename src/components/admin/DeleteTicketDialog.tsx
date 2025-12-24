import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';

interface DeleteTicketDialogProps {
    ticketId: string;
    ticketCode: string;
    onSuccess?: () => void;
}

export const DeleteTicketDialog = ({ ticketId, ticketCode, onSuccess }: DeleteTicketDialogProps) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);

        try {
            // Call soft delete function
            const { data, error } = await supabase.rpc('soft_delete_ticket', {
                ticket_id: ticketId
            });

            if (error) throw error;

            if (data) {
                toast.success('Ticket moved to archive. Can be restored within 7 days.');
                setOpen(false);
                onSuccess?.();
            } else {
                toast.error('Failed to delete ticket');
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete ticket');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                variant="destructive"
                size="sm"
                onClick={() => setOpen(true)}
            >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
            </Button>

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Ticket?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete ticket <strong>{ticketCode}</strong>?
                            <br /><br />
                            The ticket will be moved to archive and can be restored within <strong>7 days</strong>.
                            After 7 days, it will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            disabled={loading}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {loading ? 'Deleting...' : 'Yes, Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
