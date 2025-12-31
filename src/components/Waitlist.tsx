import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, Users, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface WaitlistButtonProps {
    eventId: string;
    eventTitle: string;
}

export const WaitlistButton = ({ eventId, eventTitle }: WaitlistButtonProps) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
    });

    const handleJoinWaitlist = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('event_waitlist')
                .insert([{
                    event_id: eventId,
                    user_email: formData.email,
                    user_name: formData.name,
                    user_phone: formData.phone || null,
                }])
                .select()
                .single();

            if (error) {
                // Check if already on waitlist
                if (error.code === '23505') {
                    toast.error('You\'re already on the waitlist for this event!');
                    return;
                }
                throw error;
            }

            // Success celebration
            confetti({
                particleCount: 60,
                spread: 50,
                origin: { y: 0.7 },
                colors: ['#00E5FF', '#B400FF']
            });

            toast.success(`🎉 You're #${data.position} on the waitlist!`, {
                description: 'We\'ll email you when tickets become available',
                duration: 6000,
            });

            setOpen(false);
            setFormData({ name: '', email: '', phone: '' });
        } catch (error: any) {
            console.error('Waitlist join error:', error);
            toast.error('Failed to join waitlist. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="w-full border-primary/50 hover:bg-primary/10">
                    <Bell className="w-5 h-5 mr-2" />
                    Join Waitlist
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" />
                        Join Waitlist
                    </DialogTitle>
                    <CardDescription>
                        Get notified when tickets become available for <strong>{eventTitle}</strong>
                    </CardDescription>
                </DialogHeader>

                <form onSubmit={handleJoinWaitlist} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Your Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="john@example.com"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            We'll send you an email when tickets are available
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone (Optional)</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+91 9876543210"
                        />
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                        <Clock className="w-5 h-5 text-primary mt-0.5" />
                        <div className="flex-1 text-sm">
                            <p className="font-medium mb-1">How it works:</p>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                <li>Join the waitlist (free)</li>
                                <li>We'll email you when tickets are available</li>
                                <li>You get priority booking access</li>
                                <li>Book your ticket before it sells out again!</li>
                            </ol>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={loading}>
                            {loading ? 'Joining...' : 'Join Waitlist'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};


// Waitlist Summary Component for Event Creators
interface WaitlistSummaryProps {
    eventId: string;
}

export const WaitlistSummary = ({ eventId }: WaitlistSummaryProps) => {
    const [summary, setSummary] = useState<any>(null);
    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWaitlist = async () => {
        try {
            // Get summary
            const { data: summaryData } = await supabase
                .rpc('get_waitlist_summary', { p_event_id: eventId });

            if (summaryData && summaryData.length > 0) {
                setSummary(summaryData[0]);
            }

            // Get full waitlist
            const { data: waitlistData } = await supabase
                .from('event_waitlist')
                .select('*')
                .eq('event_id', eventId)
                .order('position');

            if (waitlistData) {
                setWaitlist(waitlistData);
            }
        } catch (error) {
            console.error('Fetch waitlist error:', error);
        } finally {
            setLoading(false);
        }
    };

    useState(() => {
        fetchWaitlist();
    });

    if (loading) {
        return <div className="text-center text-muted-foreground">Loading waitlist...</div>;
    }

    if (!summary || summary.total_waiting === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No one on the waitlist yet</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Waiting</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{summary.total_waiting}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Notified</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">{summary.total_notified}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Converted</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-500">{summary.total_converted}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Waitlist ({waitlist.length})</CardTitle>
                    <CardDescription>People waiting for tickets</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {waitlist.map((entry) => (
                            <div
                                key={entry.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                                        #{entry.position}
                                    </div>
                                    <div>
                                        <p className="font-medium">{entry.user_name}</p>
                                        <p className="text-sm text-muted-foreground">{entry.user_email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(entry.created_at).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs font-medium capitalize">{entry.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
