import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, ArrowRight, ShieldCheck, Mail } from 'lucide-react';

const StaffLogin = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const redirectParams = searchParams.get('redirect');

    useEffect(() => {
        // Check if already logged in
        const session = sessionStorage.getItem('staff_session');
        if (session) {
            if (redirectParams) {
                navigate(redirectParams);
            } else {
                // Find recent event logic or stay here
            }
        }
    }, [navigate, redirectParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !pin) {
            toast.error('Please enter email and PIN');
            return;
        }

        setIsLoading(true);
        try {
            // 1. Verify credentials against door_staff table
            const { data, error } = await supabase
                .from('door_staff')
                .select('*, events(title, id)')
                .eq('user_email', email.toLowerCase())
                .eq('access_code', pin)
                .eq('is_active', true)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                toast.error('Invalid credentials or expired access');
                return;
            }

            // 2. Create Session
            const sessionData = {
                staffId: data.id,
                email: data.user_email,
                eventId: data.event_id,
                eventTitle: data.events?.title,
                role: 'door_staff',
                loginTime: new Date().toISOString()
            };

            sessionStorage.setItem('staff_session', JSON.stringify(sessionData));

            toast.success(`Welcome! Access granted for ${data.events?.title}`);

            // 3. Redirect
            navigate(`/gate/${data.event_id}`);

        } catch (err: any) {
            console.error('Login error:', err);
            toast.error('Login failed due to system error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />

            <Card className="w-full max-w-md border-primary/20 shadow-2xl relative z-10 backdrop-blur-sm bg-card/80">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-2 animate-pulse">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                        Staff Portal
                    </CardTitle>
                    <CardDescription>
                        Enter your credentials to access the scanner
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Staff Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="staff@event.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-secondary/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pin" className="flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                Access PIN
                            </Label>
                            <Input
                                id="pin"
                                type="password"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="••••••"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                required
                                className="bg-secondary/50 tracking-[0.5em] text-center font-bold text-lg"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Verifying...' : 'Access Scanner'}
                            {!isLoading && <ArrowRight className="ml-2 w-5 h-5" />}
                        </Button>

                        <div className="text-center">
                            <p className="text-xs text-muted-foreground mt-4">
                                Secure access provided by EventTix Security
                            </p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default StaffLogin;
