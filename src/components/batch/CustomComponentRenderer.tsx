import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { compileComponent, createScopedComponent, validateSource } from '@/lib/componentSandbox';
import { SchemaRenderer } from './SchemaRenderer';
import { GeminiJsonSchema } from '@/lib/types';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback: ReactNode;
    onReset?: () => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class CustomViewErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Custom View Runtime Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="space-y-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Component Crash</AlertTitle>
                        <AlertDescription className="text-xs font-mono">
                            {this.state.error?.message}
                        </AlertDescription>
                    </Alert>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                this.props.onReset?.();
                            }}
                            className="text-xs h-7"
                        >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Try Again
                        </Button>
                        <div className="text-[10px] text-muted-foreground italic">
                            Falling back to standard view below
                        </div>
                    </div>
                    <div className="opacity-50 pointer-events-none grayscale scale-[0.98] origin-top">
                        {this.props.fallback}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

interface CustomComponentRendererProps {
    code: string;
    data: any;
    schema: GeminiJsonSchema;
    className?: string;
}

export const CustomComponentRenderer: React.FC<CustomComponentRendererProps> = ({
    code,
    data,
    schema,
    className
}) => {
    const [compiledError, setCompiledError] = React.useState<string | null>(null);

    const CompiledComponent = React.useMemo(() => {
        if (!code) return null;

        try {
            // 1. Validation
            const validation = validateSource(code);
            if (!validation.valid) {
                setCompiledError(validation.errors.join('\n'));
                return null;
            }

            // 2. Compilation
            const compiled = compileComponent(code);

            // 3. Creation
            const component = createScopedComponent(compiled, { data, schema });
            setCompiledError(null);
            return component;
        } catch (err: any) {
            setCompiledError(err.message);
            return null;
        }
    }, [code, data, schema]);

    const fallback = <SchemaRenderer data={data} schema={schema} />;

    if (compiledError) {
        return (
            <div className="space-y-4">
                <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-xs font-bold uppercase tracking-wider">Compilation / Security Error</AlertTitle>
                    <AlertDescription className="text-xs font-mono mt-1 opacity-80">
                        {compiledError}
                    </AlertDescription>
                </Alert>
                <div className="text-[10px] text-muted-foreground italic mb-2">
                    Showing standard schema view as fallback
                </div>
                {fallback}
            </div>
        );
    }

    if (!CompiledComponent) {
        return fallback;
    }

    return (
        <CustomViewErrorBoundary fallback={fallback} onReset={() => setCompiledError(null)}>
            <div className={className}>
                <CompiledComponent data={data} schema={schema} />
            </div>
        </CustomViewErrorBoundary>
    );
};
