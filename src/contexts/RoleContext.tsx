import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RoleContext, UserRole } from './RoleContextObject';
export type { UserRole };

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, isLoading: authLoading } = useAuth();
    const [role, setRole] = useState<UserRole>('user');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (profile?.role) {
                setRole(profile.role as UserRole);
            } else {
                setRole('user');
            }
            setIsLoading(false);
        }
    }, [profile, authLoading]);

    const value = {
        role,
        isAdmin: role === 'admin' || role === 'superadmin',
        isSuperAdmin: role === 'superadmin',
        isLoading: isLoading || authLoading,
    };

    return (
        <RoleContext.Provider value={value}>
            {children}
        </RoleContext.Provider>
    );
};
