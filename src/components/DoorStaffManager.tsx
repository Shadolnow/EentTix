import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Users, Plus, Trash2, Copy, CheckCircle, XCircle, RefreshCw, QrCode } from 'lucide-react';
import { format } from 'date-fns';

interface DoorStaffManagerProps {
    eventId: string;
}

export const DoorStaffManager = ({ eventId }: DoorStaffManagerProps) => {
    const [doorStaff, setDoorStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', pin: '' });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchDoorStaff();
    }, [eventId]);

    const fetchDoorStaff = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('door_staff')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDoorStaff(data || []);
        } catch (error) {
            console.error('Error fetching door staff:', error);
            toast.error('Failed to load door staff');
        } finally {
            setLoading(false);
        }
    };

    const handleAddStaff = async () => {
        if (!newStaff.email.trim()) {
            toast.error('Please enter an email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newStaff.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        setAdding(true);
        try {
            // Use custom PIN or generate one
            let code = newStaff.pin;
            if (!code || code.length < 4) {
                code = Math.floor(100000 + Math.random() * 900000).toString();
            }

            const payload: any = {
                event_id: eventId,
                user_email: newStaff.email.toLowerCase(),
                access_code: code,
                // Try to insert new fields (if schema supports it)
                name: newStaff.name || null,
                phone: newStaff.phone || null
            };

            const { error } = await supabase
                .from('door_staff')
                .insert(payload);

            if (error) {
                // Determine if error is due to missing columns or duplicate email
                if (error.code === '42703') { // Undefined column
                    console.warn("Schema missing name/phone columns. Inserting basic info only.");
                    // Retry without new fields
                    delete payload.name;
                    delete payload.phone;
                    const { error: retryError } = await supabase.from('door_staff').insert(payload);
                    if (retryError) throw retryError;
                } else {
                    throw error;
                }
            }

            toast.success(`Door staff added! PIN: ${code}`, {
                description: 'Staff can now login at /staff-login',
                duration: 10000
            });

            setNewStaff({ name: '', email: '', phone: '', pin: '' });
            setAddDialogOpen(false);
            fetchDoorStaff();
        } catch (error: any) {
            console.error('Error adding door staff:', error);
            if (error.code === '23505') {
                toast.error('This email already has access to this event');
            } else {
                toast.error('Failed to add door staff: ' + error.message);
            }
        } finally {
            setAdding(false);
        }
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success('Access code copied to clipboard!');
    };

    const handleToggleActive = async (staffId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('door_staff')
                .update({ is_active: !currentStatus })
                .eq('id', staffId);

            if (error) throw error;

            toast.success(currentStatus ? 'Access disabled' : 'Access enabled');
            fetchDoorStaff();
        } catch (error) {
            console.error('Error toggling staff status:', error);
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (staffId: string, email: string) => {
        const confirmed = window.confirm(
            `Remove door staff access for ${email}?\n\nThey will no longer be able to scan tickets.`
        );

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('door_staff')
                .delete()
                .eq('id', staffId);

            if (error) throw error;

            toast.success('Door staff access removed');
            fetchDoorStaff();
        } catch (error) {
            console.error('Error deleting door staff:', error);
            toast.error('Failed to remove access');
        }
    };

    const isExpired = (expiresAt: string) => {
        return new Date(expiresAt) < new Date();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Door Staff Management
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Grant temporary QR scanner access to staff and volunteers
                            </CardDescription>
                        </div>
                        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Door Staff
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Door Staff</DialogTitle>
                                    <DialogDescription>
                                        Enter the staff member's email. They'll receive a 6-digit access code to use the scanner.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="staff-name">Staff Name</Label>
                                            <Input
                                                id="staff-name"
                                                placeholder="Name"
                                                value={newStaff.name}
                                                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="staff-phone">Phone Number</Label>
                                            <Input
                                                id="staff-phone"
                                                placeholder="Phone"
                                                value={newStaff.phone}
                                                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="staff-email">Staff Email Address *</Label>
                                        <Input
                                            id="staff-email"
                                            type="email"
                                            placeholder="staff@example.com"
                                            value={newStaff.email}
                                            onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="staff-pin">Access PIN (Leave empty to auto-generate)</Label>
                                        <Input
                                            id="staff-pin"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder="6-digit PIN"
                                            value={newStaff.pin}
                                            onChange={(e) => setNewStaff({ ...newStaff, pin: e.target.value.replace(/\D/g, '') })}
                                        />
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="text-sm font-semibold text-blue-900 mb-1">How it works:</p>
                                        <ul className="text-xs text-blue-800 space-y-1">
                                            <li>• Staff member login: <strong>/staff-login</strong></li>
                                            <li>• Use Email and PIN to validation</li>
                                            <li>• Access expires after 7 days (can be extended)</li>
                                        </ul>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleAddStaff} disabled={adding}>
                                        {adding ? 'Adding...' : 'Add Staff Member'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {doorStaff.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Door Staff Added</h3>
                            <p className="text-muted-foreground mb-6">
                                Add staff members to grant them temporary scanner access
                            </p>
                            <Button onClick={() => setAddDialogOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add First Staff Member
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {doorStaff.map((staff) => {
                                const expired = isExpired(staff.expires_at);
                                const isActive = staff.is_active && !expired;

                                return (
                                    <Card key={staff.id} className={expired ? 'opacity-60' : ''}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <p className="font-semibold">{staff.user_email}</p>
                                                        {isActive ? (
                                                            <Badge className="bg-green-500">
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                Active
                                                            </Badge>
                                                        ) : expired ? (
                                                            <Badge variant="destructive">
                                                                <XCircle className="w-3 h-3 mr-1" />
                                                                Expired
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline">
                                                                <XCircle className="w-3 h-3 mr-1" />
                                                                Disabled
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <QrCode className="w-4 h-4" />
                                                            <code className="bg-gray-100 px-2 py-1 rounded font-mono font-bold text-lg">
                                                                {staff.access_code}
                                                            </code>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleCopyCode(staff.access_code)}
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                                        <div>
                                                            <span className="font-semibold">Created:</span>{' '}
                                                            {format(new Date(staff.created_at), 'MMM d, yyyy')}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold">Expires:</span>{' '}
                                                            {format(new Date(staff.expires_at), 'MMM d, yyyy h:mm a')}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold">Total Scans:</span> {staff.total_scans || 0}
                                                        </div>
                                                        {staff.last_scan_at && (
                                                            <div>
                                                                <span className="font-semibold">Last Scan:</span>{' '}
                                                                {format(new Date(staff.last_scan_at), 'MMM d, h:mm a')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 ml-4">
                                                    {!expired && (
                                                        <Button
                                                            size="sm"
                                                            variant={staff.is_active ? 'outline' : 'default'}
                                                            onClick={() => handleToggleActive(staff.id, staff.is_active)}
                                                        >
                                                            {staff.is_active ? 'Disable' : 'Enable'}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDelete(staff.id, staff.user_email)}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
                <CardHeader>
                    <CardTitle className="text-sm text-yellow-900">💡 Quick Tips</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-yellow-800 space-y-2">
                    <p>• Share the 6-digit code via WhatsApp, SMS, or email</p>
                    <p>• Staff don't need to create an account - just enter the code</p>
                    <p>• Access expires automatically after 7 days for security</p>
                    <p>• You can disable access anytime if needed</p>
                    <p>• Monitor scan activity to ensure proper usage</p>
                </CardContent>
            </Card>
        </div>
    );
};
