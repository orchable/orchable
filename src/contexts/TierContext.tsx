import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { storage, UserTier } from '@/lib/storage';
import { syncService } from '@/services/syncService';
import { usageService } from '@/services/usageService';

interface TierContextType {
    tier: UserTier;
    isLite: boolean;
    isPremium: boolean;
    isSyncing: boolean;
    usage: { count: number; month: string } | null;
    limits: { tasks: number; sync: boolean };
    setTier: (tier: UserTier) => void;
    refreshUsage: () => Promise<void>;
}

const TierContext = createContext<TierContextType | undefined>(undefined);

export function TierProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [tier, setTierState] = useState<UserTier>('anonymous');
    const [isSyncing, setIsSyncing] = useState(false);
    const [usage, setUsage] = useState<{ count: number; month: string } | null>(null);

    useEffect(() => {
        const handleAuthChange = async () => {
            if (user) {
                // Admin gets premium managed, others get free tier
                if (user.email === 'makexyzfun@gmail.com') {
                    setTier('premium_managed');
                } else {
                    setTier('free');
                }

                setIsSyncing(true);
                try {
                    await syncService.migrateAnonymousData();
                } catch (e) {
                    console.error("Migration failed:", e);
                } finally {
                    setIsSyncing(false);
                }
            } else {
                setTier('anonymous');
            }
        };

        handleAuthChange();
    }, [user]);

    useEffect(() => {
        refreshUsage();
        const interval = setInterval(refreshUsage, 10000); // 10s auto-refresh
        return () => clearInterval(interval);
    }, []);

    const refreshUsage = async () => {
        const currentUsage = await usageService.getUsage();
        setUsage(currentUsage);
    };

    const setTier = (newTier: UserTier) => {
        setTierState(newTier);
        storage.setTier(newTier);
    };

    const value = {
        tier,
        isLite: tier === 'anonymous' || tier === 'free',
        isPremium: tier === 'premium_byok' || tier === 'premium_managed',
        isSyncing,
        usage,
        limits: {
            tasks: usageService.getLimit(tier),
            sync: tier !== 'anonymous'
        },
        setTier,
        refreshUsage
    };

    return (
        <TierContext.Provider value={value}>
            {children}
        </TierContext.Provider>
    );
}

export function useTier() {
    const context = useContext(TierContext);
    if (context === undefined) {
        throw new Error('useTier must be used within a TierProvider');
    }
    return context;
}
