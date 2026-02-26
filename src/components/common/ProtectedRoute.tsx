import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { Loader2 } from 'lucide-react';
import { UnauthorizedView } from '@/components/common/UnauthorizedView';

export const ProtectedRoute: React.FC<{
    children: React.ReactNode;
    requiredRole?: 'user' | 'admin' | 'superadmin';
}> = ({ children, requiredRole }) => {
    const { user, isLoading: authLoading } = useAuth();
    const { role, isLoading: roleLoading } = useRole();
    const location = useLocation();

    const isLoading = authLoading || roleLoading;

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        // Redirect to login page but save the location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole) {
        const hasPermission = () => {
            if (requiredRole === 'superadmin') return role === 'superadmin';
            if (requiredRole === 'admin') return role === 'admin' || role === 'superadmin';
            return true;
        };

        if (!hasPermission()) {
            return <UnauthorizedView />;
        }
    }

    return <>{children}</>;
};
