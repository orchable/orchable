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

    // Step 1: Listen for auth state changes + get initial session
    useEffect(() => {
        let isMounted = true;

        // Proactively get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!isMounted) return;
            if (session) {
                setSession(session);
                setUser(session.user);
                setIsLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!isMounted) return;
                setSession(session);
                setUser(session?.user ?? null);
                if (!session?.user) {
                    setProfile(null);
                    profileFetchedForUser.current = null;
                }
                setIsLoading(false);
            }
        );

        // Safety timeout: only unblock if still loading after 5s
        const timeout = setTimeout(() => {
            if (isMounted) {
                setIsLoading(false);
            }
        }, 5000);

        return () => {
            isMounted = false;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    // Step 2: Fetch profile AFTER user is set (non-blocking)
    // Note: We avoid a `cancelled` flag here because getSession() and
    // onAuthStateChange can both set `user` in quick succession, causing
    // React to re-run this effect. The cleanup of the first run would set
    // cancelled=true, killing the in-flight fetch, while the second run
    // skips because profileFetchedForUser is already set.
    useEffect(() => {
        const userId = user?.id;
        if (userId && profileFetchedForUser.current !== userId) {
            profileFetchedForUser.current = userId;
            fetchProfile(userId).then(p => {
                // Only apply if this is still the current user
                if (profileFetchedForUser.current === userId) {
                    setProfile(p);
                }
            });
        }
    }, [user]);

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        profileFetchedForUser.current = null;

        // Clear IndexedDB to prevent data leaks between sessions
        try {
            const { db } = await import('@/lib/storage/IndexedDBAdapter');
            await Promise.all([
                db.task_batches.clear(),
                db.ai_tasks.clear(),
                db.user_api_keys.clear(),
                db.orchestrator_configs.clear(),
                db.metadata.clear(),
                db.api_key_usage_log.clear(),
                db.api_key_health.clear()
            ]);
            console.log('[AuthContext] Local database cleared on sign out.');
        } catch (e) {
            console.error('[AuthContext] Failed to clear local database on sign out:', e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, isLoading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
