import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';

/**
 * Hook to handle OAuth callback and sync social profile data
 */
export const useSocialAuthCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Handle OAuth callback
        const handleCallback = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('OAuth callback error:', error);
                toast.error('Authentication failed');
                navigate('/auth');
                return;
            }

            if (session?.user) {
                const user = session.user;

                // Extract social profile data
                const provider = user.app_metadata.provider;
                const avatarUrl = user.user_metadata.avatar_url || user.user_metadata.picture;
                const fullName = user.user_metadata.full_name || user.user_metadata.name;

                // Update profile with social data
                try {
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: user.id,
                            email: user.email,
                            full_name: fullName,
                            auth_provider: provider,
                            social_avatar_url: avatarUrl,
                            social_metadata: user.user_metadata,
                            updated_at: new Date().toISOString(),
                        }, {
                            onConflict: 'id'
                        });

                    if (updateError) {
                        console.error('Profile update error:', updateError);
                    } else {
                        console.log('✅ Social profile synced successfully');
                    }
                } catch (error) {
                    console.error('Unexpected error syncing profile:', error);
                }

                // Check for business subscription
                const { data: subscription } = await supabase
                    .from('business_subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .in('status', ['active', 'pending'])
                    .maybeSingle();

                toast.success(`Welcome${fullName ? ', ' + fullName.split(' ')[0] : ''}!`);

                // Route based on subscription
                if (subscription?.status === 'active') {
                    navigate('/business-dashboard');
                } else if (subscription?.status === 'pending') {
                    navigate('/business-signup?status=pending');
                } else {
                    navigate('/dashboard');
                }
            }
        };

        handleCallback();
    }, [navigate]);
};
