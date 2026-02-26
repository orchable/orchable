import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { storage, UserTier } from '@/lib/storage';
import { syncService } from '@/services/syncService';
import { usageService } from '@/services/usageService';
import { supabase } from '@/lib/supabase';

interface TierContextType {
    tier: UserTier;
    isPremium: boolean;
    isSyncing: boolean;
    usage: { count: number; month: string } | null;
    limits: {
        tasks: number;
        sync: boolean;
    };
    refreshUsage: () => Promise<void>;
}

export const TierContext = createContext<TierContextType | undefined>(undefined);

export function TierProvider({ children }: { children: React.ReactNode }) {
    const { user, profile } = useAuth();
    const [tier, setTierState] = useState<UserTier>('free');
    const [isSyncing, setIsSyncing] = useState(false);
    const [usage, setUsage] = useState<{ count: number; month: string } | null>(null);

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
                // Read tier from DB profile sync
                const userTier = (profile.tier || 'free') as UserTier;
                setTierState(userTier);

                setIsSyncing(true);
                try {
                    await syncService.migrateAnonymousData();
                } catch (e) {
                    console.error("Migration failed:", e);
                } finally {
                    setIsSyncing(false);
                }
            } else {
                setTierState('free');
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
