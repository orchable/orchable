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
    const [tier, setTierState] = useState<UserTier>('free'); // Default to free if authenticated
    const [isSyncing, setIsSyncing] = useState(false);
    const [usage, setUsage] = useState<{ count: number; month: string } | null>(null);

    useEffect(() => {
        const handleAuthChange = async () => {
            if (user) {
                // Admin gets premium, others get free by default
                // In production, this would check a subscription table
                if (user.email === 'makexyzfun@gmail.com') {
                    setTier('premium');
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
                // In the new system, we still force 'free' as a UI default 
                // but the Gate will block execution if user is not authenticated.
                setTier('free');
            }
        };

        handleAuthChange();
    }, [user]);

    useEffect(() => {
        if (user) {
            refreshUsage();
            const interval = setInterval(refreshUsage, 15000); // 15s refresh
            return () => clearInterval(interval);
        }
    }, [user]);

    const refreshUsage = async () => {
        if (!user) return;
        const currentUsage = await usageService.getUsage();
        setUsage(currentUsage);
    };

    const setTier = (newTier: UserTier) => {
        setTierState(newTier);
        storage.setTier(newTier);
    };

    const value = {
        tier,
        isLite: tier === 'free',
        isPremium: tier === 'premium',
        isSyncing,
        usage,
        limits: {
            tasks: usageService.getLimit(tier),
            sync: true // Authenticated users always have sync capability
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
