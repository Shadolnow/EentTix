import { useEffect } from 'react';
import { useSocialAuthCallback } from '@/hooks/useSocialAuth';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
    useSocialAuthCallback();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                <h2 className="text-2xl font-semibold">Completing sign in...</h2>
                <p className="text-muted-foreground">Please wait while we set up your account</p>
            </div>
        </div>
    );
};

export default AuthCallback;
