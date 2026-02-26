import React, { createContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/lib/types';

import { AuthContext } from './AuthContextObject';

// useAuth hook moved to @/hooks/useAuth.ts


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const profileFetchedForUser = useRef<string | null>(null);

    const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('[AuthContext] Error fetching profile for user:', userId, error);
                return null;
            }
            return data;
        } catch (err) {
            console.error('[AuthContext] Critical error in fetchProfile:', err);
            return null;
        }
    };

    const refreshProfile = async () => {
        if (user) {
            const p = await fetchProfile(user.id);
            setProfile(p);
        }
    };

    // Step 1: Listen for auth state changes (synchronous — no await)
    useEffect(() => {
        let isMounted = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!isMounted) return;

                // Set auth state synchronously — do NOT fetch profile here
                // to avoid blocking isLoading on a potentially slow/hanging query
                setSession(session);
                setUser(session?.user ?? null);

                if (!session?.user) {
                    setProfile(null);
                    profileFetchedForUser.current = null;
                }

                setIsLoading(false);
            }
        );

        // Safety timeout: if onAuthStateChange hasn't fired in 3s, unblock the UI
        const timeout = setTimeout(() => {
            if (isMounted) {
                console.warn('[AuthContext] Auth state change timeout — unblocking UI');
                setIsLoading(false);
            }
        }, 3000);

        return () => {
            isMounted = false;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    // Step 2: Fetch profile AFTER user is set (non-blocking)
    useEffect(() => {
        let cancelled = false;

        if (user && profileFetchedForUser.current !== user.id) {
            profileFetchedForUser.current = user.id;
            fetchProfile(user.id).then(p => {
                if (!cancelled) setProfile(p);
            });
        }

        return () => { cancelled = true; };
    }, [user]);

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        profileFetchedForUser.current = null;
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, isLoading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
