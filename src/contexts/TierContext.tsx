import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TierContext } from './TierContextObject';
import { UserTier, storage } from '@/lib/storage';
import { syncService } from '@/services/syncService';
import { usageService } from '@/services/usageService';
import { supabase } from '@/lib/supabase';
import { executorService } from '@/services/executorService';

const SYNC_DONE_KEY = 'orchable_sync_done';

export function TierProvider({ children }: { children: React.ReactNode }) {
    const { user, profile } = useAuth();
    const [tierState, setTierState] = useState<UserTier>('free');
    const [isSyncing, setIsSyncing] = useState(false);
    const [usage, setUsage] = useState<{ count: number; month: string } | null>(null);
    const hasHandledProfile = useRef(false);

    // Derive tier from profile role/tier
    const tier = useMemo<UserTier>(() => {
        if (!profile) return 'free';
        const userRole = profile.role;
        const isAdmin = userRole === 'admin' || userRole === 'superadmin';
        return (isAdmin ? 'premium' : (profile.tier || 'free')) as UserTier;
    }, [profile]);

    // DEBUG: Remove after confirming fix
    console.log('[TierProvider] profile:', profile?.role, profile?.tier, '→ tier:', tier);

    const refreshUsage = useCallback(async () => {
        if (user) {
            try {
                const { keyPoolService } = await import('@/services/keyPoolService');
                const userHasKeys = await keyPoolService.hasPersonalKeys();
                const { freeTierService } = await import('@/services/freeTierService');

                if (tier === 'free' && !userHasKeys) {
                    const serverUsage = await freeTierService.getUsage();
                    setUsage({
                        count: serverUsage.used,
                        month: new Date().toISOString().slice(0, 7) // YYYY-MM
                    });
                } else {
                    // Fallback to local usage service or other logic for BYOK/Premium
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
    }, [user, tier]);

    // 1. Sync tier status to state and storage
    useEffect(() => {
        if (tierState !== tier) {
            setTierState(tier);
            storage.refreshAdapter(tier).then(path => {
                console.log('[TierProvider] Adapter refreshed for path:', path);
            });
        } else {
            // Even if tier hasn't changed, keys might have changed, so refresh
            storage.refreshAdapter(tier);
        }
    }, [tier, tierState]);

    // 2. Handle Migration & Sync (once per login)
    useEffect(() => {
        if (profile) {
            if (hasHandledProfile.current) return;
            hasHandledProfile.current = true;

            const alreadySynced = sessionStorage.getItem(SYNC_DONE_KEY);
            if (!alreadySynced) {
                setIsSyncing(true);
                syncService.migrateAnonymousData(tier)
                    .then(() => sessionStorage.setItem(SYNC_DONE_KEY, '1'))
                    .catch(e => {
                        console.warn("Migration or sync failed:", e);
                        sessionStorage.setItem(SYNC_DONE_KEY, '1');
                    })
                    .finally(() => setIsSyncing(false));
            }
        } else {
            hasHandledProfile.current = false;
            sessionStorage.removeItem(SYNC_DONE_KEY);
        }
    }, [profile, tier]);

    // 3. Worker Auto-Start (Only for Free + Key path)
    useEffect(() => {
        import('@/lib/storage/executionRouter').then(async ({ getExecutionPath }) => {
            const path = await getExecutionPath(tier);
            if (path === 'web-worker') {
                import('@/lib/storage/IndexedDBAdapter').then(({ db }) => {
                    db.ai_tasks.where('status').equals('plan').count().then(pending => {
                        if (pending > 0) {
                            executorService.start('free');
                        }
                    });
                }).catch(e => console.warn('Worker auto-start check failed', e));
            }
        });
    }, [tier]);

    // 4. Usage Refresh Polling
    useEffect(() => {
        if (user) {
            refreshUsage();
            const interval = setInterval(refreshUsage, 30000);
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
            sync: true
        },
        refreshUsage
    };

    return (
        <TierContext.Provider value={value}>
            {children}
        </TierContext.Provider>
    );
}
