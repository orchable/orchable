import React from 'react';
import { useTier } from '@/contexts/TierContext';
import { UserTier } from '@/lib/storage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface TierGateProps {
    children: React.ReactNode;
    minTier?: UserTier;
    featureName?: string;
    fallback?: React.ReactNode;
    showUpgrade?: boolean;
}

export function TierGate({
    children,
    minTier = 'free',
    featureName = 'This feature',
    fallback,
    showUpgrade = true
}: TierGateProps) {
    const { tier, isPremium } = useTier();
    const navigate = useNavigate();

    const tierPriority: Record<UserTier, number> = {
        'free': 0,
        'premium': 1,
    };

    const hasAccess = tierPriority[tier] >= tierPriority[minTier];

    if (hasAccess) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    return (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 text-sm font-bold flex items-center gap-2">
                {featureName} is locked
                {minTier.includes('premium') && <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-[10px] h-4">Premium</Badge>}
            </AlertTitle>
            <AlertDescription className="text-amber-700 text-xs mt-1">
                Your current tier ({tier}) does not have access to this feature.
                {showUpgrade && (
                    <div className="mt-3">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-amber-300 hover:bg-amber-100"
                            onClick={() => navigate('/#pricing')}
                        >
                            <Sparkles className="w-3 h-3 mr-1.5 text-orange-500" />
                            View Upgrade Options
                        </Button>
                    </div>
                )}
            </AlertDescription>
        </Alert>
    );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
            {children}
        </span>
    );
}
