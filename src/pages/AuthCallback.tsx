import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

/**
 * This component handles the OAuth callback from Supabase.
 * After Google login, Supabase redirects here with the access token in the URL hash.
 * The Supabase client automatically picks up the token, and we redirect to the app.
 */
export function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        // Supabase JS client automatically handles the hash fragment
        // We just need to wait for the session to be established, then redirect
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                navigate('/monitor', { replace: true });
            } else {
                // If no session after callback, something went wrong — go to login
                navigate('/login', { replace: true });
            }
        });
    }, [navigate]);

    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
}
