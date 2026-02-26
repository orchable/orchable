import React, { createContext, useEffect, useState } from 'react';
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

    const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle(); // Better than .single() if profile might be missing

            if (error) {
                console.error('Error fetching profile for user:', userId, error);
                return null;
            }
            return data;
        } catch (err) {
            console.error('Critical error in fetchProfile:', err);
            return null;
        }
    };

    const refreshProfile = async () => {
        if (user) {
            const p = await fetchProfile(user.id);
            setProfile(p);
        }
    };

    useEffect(() => {
        let isMounted = true;

        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!isMounted) return;

            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                const p = await fetchProfile(session.user.id);
                if (isMounted) setProfile(p);
            }
            if (isMounted) setIsLoading(false);
        }).catch(err => {
            console.error('Error in initial session check:', err);
            if (isMounted) setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!isMounted) return;

                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    const p = await fetchProfile(session.user.id);
                    if (isMounted) setProfile(p);
                } else {
                    if (isMounted) setProfile(null);
                }
                if (isMounted) setIsLoading(false);
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, isLoading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
