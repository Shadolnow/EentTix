import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { AlertTriangle, Archive, Trash2, CheckCircle2 } from 'lucide-react';

interface BulkDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedTickets: any[];
    eventId: string;
    onSuccess: () => void;
}

export const BulkDeleteDialog = ({ open, onOpenChange, selectedTickets, eventId, onSuccess }: BulkDeleteDialogProps) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [confirmText, setConfirmText] = useState('');
    const [reason, setReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const expectedText = `DELETE ${selectedTickets.length} TICKETS`;

    const handleFirstConfirmation = () => {
        if (!reason.trim()) {
            toast.error('Please provide a reason for deletion');
            return;
        }
        setStep(2);
    };

    const handleFinalDeletion = async () => {
        if (confirmText !== expectedText) {
            toast.error(`Please type exactly: ${expectedText}`);
            return;
        }

        setIsDeleting(true);

        try {
            let successCount = 0;
            let errorCount = 0;

            // Archive each ticket
            for (const ticket of selectedTickets) {
                try {
                    const { error } = await supabase.rpc('archive_ticket', {
                        ticket_id: ticket.id,
                        reason: reason
                    });

                    if (error) throw error;
                    successCount++;
                } catch (error) {
                    console.error('Error archiving ticket:', error);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`🗃️ ${successCount} ticket${successCount > 1 ? 's' : ''} archived`, {
                    description: 'Tickets will be auto-deleted in 14 days. View Archive to restore.',
                    duration: 8000
                });
            }

            if (errorCount > 0) {
                toast.error(`Failed to archive ${errorCount} ticket${errorCount > 1 ? 's' : ''}`);
            }

            // Reset and close
            setStep(1);
            setConfirmText('');
            setReason('');
            onOpenChange(false);
            onSuccess();

        } catch (error) {
            console.error('Bulk delete error:', error);
            toast.error('Failed to archive tickets');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancel = () => {
        setStep(1);
        setConfirmText('');
        setReason('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                {step === 1 ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-yellow-600">
                                <AlertTriangle className="w-6 h-6" />
                                Confirm Bulk Deletion (Step 1 of 2)
                            </DialogTitle>
                            <DialogDescription>
                                You are about to archive <strong>{selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''}</strong>.
                                This action will move them to the archive for 14 days.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                                <p className="text-sm font-semibold text-blue-900">What happens:</p>
                                <ul className="text-xs text-blue-800 space-y-1">
                                    <li>✓ Tickets moved to Archive (not permanently deleted)</li>
                                    <li>✓ Stored safely for 14 days</li>
                                    <li>✓ Can be restored anytime within 14 days</li>
                                    <li>✓ Auto-deleted after 14 days</li>
                                </ul>
                            </div>

                            {/* Reason Field */}
                            <div className="space-y-2">
                                <Label htmlFor="reason">
                                    Reason for Deletion *
                                </Label>
                                <Textarea
                                    id="reason"
                                    placeholder="e.g., Duplicate entries, Event cancelled, Fraudulent purchase..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    This will be logged for audit purposes
                                </p>
                            </div>

                            {/* Selected Tickets Preview */}
                            <div className="max-h-32 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                                <p className="text-xs font-semibold mb-2">Selected Tickets:</p>
                                {selectedTickets.slice(0, 5).map((ticket) => (
                                    <p key={ticket.id} className="text-xs text-muted-foreground">
                                        • {ticket.ticket_code} - {ticket.attendee_name}
                                    </p>
                                ))}
                                {selectedTickets.length > 5 && (
                                    <p className="text-xs text-muted-foreground italic">
                                        ...and {selectedTickets.length - 5} more
                                    </p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleFirstConfirmation}
                                disabled={!reason.trim()}
                            >
                                Continue to Step 2
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <Trash2 className="w-6 h-6" />
                                Final Confirmation (Step 2 of 2)
                            </DialogTitle>
                            <DialogDescription>
                                This is your final chance to cancel. Type the text below to proceed.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Warning Box */}
                            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                                <p className="text-sm font-bold text-red-900 mb-2">⚠️ IMPORTANT</p>
                                <p className="text-xs text-red-800">
                                    You are about to archive <strong>{selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''}</strong>.
                                    They will be recoverable for 14 days from the Archive page.
                                </p>
                            </div>

                            {/* Confirmation Text */}
                            <div className="space-y-2">
                                <Label htmlFor="confirm">
                                    Type this exactly to confirm:{' '}
                                    <code className="bg-gray-200 px-2 py-1 rounded text-sm font-mono">
                                        {expectedText}
                                    </code>
                                </Label>
                                <Input
                                    id="confirm"
                                    type="text"
                                    placeholder="Type here..."
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    className="font-mono"
                                />
                            </div>

                            {/* Reason Display */}
                            <div className="bg-gray-100 rounded-lg p-3">
                                <p className="text-xs font-semibold mb-1">Deletion Reason:</p>
                                <p className="text-xs text-gray-700">{reason}</p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep(1)}>
                                ← Back to Step 1
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleFinalDeletion}
                                disabled={confirmText !== expectedText || isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Archive className="w-4 h-4 mr-2 animate-pulse" />
                                        Archiving...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Archive {selectedTickets.length} Ticket{selectedTickets.length > 1 ? 's' : ''}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};
