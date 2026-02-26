import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type UserRole = 'user' | 'admin' | 'superadmin';

interface RoleContextType {
    role: UserRole;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    isLoading: boolean;
}

const RoleContext = createContext<RoleContextType>({
    role: 'user',
    isAdmin: false,
    isSuperAdmin: false,
    isLoading: true,
});

export const useRole = () => useContext(RoleContext);

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
