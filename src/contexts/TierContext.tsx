import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TierContext } from './TierContextObject';
import { UserTier, storage } from '@/lib/storage';
import { syncService } from '@/services/syncService';
import { usageService } from '@/services/usageService';
import { supabase } from '@/lib/supabase';

const SYNC_DONE_KEY = 'orchable_sync_done';

export function TierProvider({ children }: { children: React.ReactNode }) {
    const { user, profile } = useAuth();
    const [tier, setTierState] = useState<UserTier>('free');
    const [isSyncing, setIsSyncing] = useState(false);
    const [usage, setUsage] = useState<{ count: number; month: string } | null>(null);
    const hasHandledProfile = useRef(false);

    const refreshUsage = useCallback(async () => {
        if (user) {
            try {
                // Try to get server-side usage
                const { data, error } = await supabase.rpc('get_user_usage', {
                    p_user_id: user.id
                });

                if (!error && data) {
                    setUsage(data);
                } else {
                    // Fallback to local usage service if RPC fails
                    const currentUsage = await usageService.getUsage();
                    setUsage(currentUsage);
                }
            } catch (e) {
                console.error("Error refreshing usage:", e);
                const currentUsage = await usageService.getUsage();
                setUsage(currentUsage);
            }
        } else {
            setUsage(null);
        }
    }, [user]);

    useEffect(() => {
        const handleAuthChange = async () => {
            if (profile) {
                // Prevent duplicate runs (e.g. if profile object reference changes)
                if (hasHandledProfile.current) return;
                hasHandledProfile.current = true;

                // Always switch adapter to Supabase for authenticated users
                const userTier = (profile.tier || 'free') as UserTier;
                setTierState(userTier);
                storage.setTier(userTier);

                // Only run migration on FIRST login in this browser session.
                // On reload, the data is already in Supabase — no need to re-push
                // from IndexedDB (which causes INSERT conflicts).
                const alreadySynced = sessionStorage.getItem(SYNC_DONE_KEY);
                if (!alreadySynced) {
                    setIsSyncing(true);
                    try {
                        const migrationPromise = syncService.migrateAnonymousData();
                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error("Migration timeout")), 5000)
                        );
                        await Promise.race([migrationPromise, timeoutPromise]);
                        sessionStorage.setItem(SYNC_DONE_KEY, '1');
                    } catch (e) {
                        console.warn("Migration or sync failed, continuing to app:", e);
                        // Mark as done even on failure to prevent retry loops
                        sessionStorage.setItem(SYNC_DONE_KEY, '1');
                    } finally {
                        setIsSyncing(false);
                    }
                }
            } else {
                setTierState('free');
                hasHandledProfile.current = false;
                // Clear sync flag on logout so next login triggers migration
                sessionStorage.removeItem(SYNC_DONE_KEY);
            }
        };

        handleAuthChange();
    }, [profile]);

    useEffect(() => {
        if (user) {
            refreshUsage();
            const interval = setInterval(refreshUsage, 30000); // 30s refresh
            return () => clearInterval(interval);
        }
    }, [user, refreshUsage]);

    const value = {
        tier,
        isPremium: tier === 'premium',
        isSyncing,
        usage,
        limits: {
            tasks: usageService.getLimit(tier),
            sync: true // Authenticated users always have sync capability
        },
        refreshUsage
    };

    return (
        <TierContext.Provider value={value}>
            {children}
        </TierContext.Provider>
    );
}

// useTier hook moved to @/hooks/useTier.ts
