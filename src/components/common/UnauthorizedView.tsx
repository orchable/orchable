import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const UnauthorizedView: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
            <div className="h-24 w-24 rounded-full bg-red-500/10 flex items-center justify-center animate-pulse">
                <ShieldAlert className="h-12 w-12 text-red-500" />
            </div>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Access Denied
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                    You don't have the necessary permissions to access this feature.
                    Please contact an administrator if you believe this is an error.
                </p>
            </div>

            <div className="flex gap-4">
                <Button
                    onClick={() => navigate(-1)}
                    variant="outline"
                    className="gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Go Back
                </Button>
                <Button
                    onClick={() => navigate('/')}
                    variant="ghost"
                >
                    Return Home
                </Button>
            </div>
        </div>
    );
};
