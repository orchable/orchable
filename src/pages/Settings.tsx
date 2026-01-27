import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
    const [n8nUrl, setN8nUrl] = useState("");
    const [defaultTimeout, setDefaultTimeout] = useState("300000");
    const [defaultRetries, setDefaultRetries] = useState("3");

    useEffect(() => {
        // Load from localStorage or fall back to env/defaults
        const savedUrl = localStorage.getItem("lovable_n8n_url");
        const savedTimeout = localStorage.getItem("lovable_default_timeout");
        const savedRetries = localStorage.getItem("lovable_default_retries");

        setN8nUrl(savedUrl || import.meta.env.VITE_N8N_BASE_URL || "");
        setDefaultTimeout(savedTimeout || "300000");
        setDefaultRetries(savedRetries || "3");
    }, []);

    const handleSave = () => {
        localStorage.setItem("lovable_n8n_url", n8nUrl);
        localStorage.setItem("lovable_default_timeout", defaultTimeout);
        localStorage.setItem("lovable_default_retries", defaultRetries);
        toast.success("Settings saved successfully");
    };

    const handleReset = () => {
        localStorage.removeItem("lovable_n8n_url");
        localStorage.removeItem("lovable_default_timeout");
        localStorage.removeItem("lovable_default_retries");

        setN8nUrl(import.meta.env.VITE_N8N_BASE_URL || "");
        setDefaultTimeout("300000");
        setDefaultRetries("3");

        toast.info("Settings reset to defaults");
    };

    return (
        <div className="container mx-auto py-8 space-y-8 max-w-3xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your application configuration and default preferences.
                </p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Integration Settings</CardTitle>
                        <CardDescription>
                            Configure connections to external services like n8n and Supabase.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="n8n-url">n8n Base URL</Label>
                            <Input
                                id="n8n-url"
                                placeholder="https://n8n.example.com"
                                value={n8nUrl}
                                onChange={(e) => setN8nUrl(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                The base URL for your n8n workflows. Webhooks will be appended to this path.
                            </p>
                        </div>

                        <div className="pt-2">
                            <div className="text-sm font-medium mb-1">Current Configuration Source</div>
                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                Supabase URL: {import.meta.env.VITE_SUPABASE_URL || 'Not set'} <br />
                                (Managed via .env file)
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Orchestrator Defaults</CardTitle>
                        <CardDescription>
                            Set default values for new steps in the designer.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="timeout">Default Timeout (ms)</Label>
                                <Input
                                    id="timeout"
                                    type="number"
                                    value={defaultTimeout}
                                    onChange={(e) => setDefaultTimeout(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="retries">Default Max Retries</Label>
                                <Input
                                    id="retries"
                                    type="number"
                                    value={defaultRetries}
                                    onChange={(e) => setDefaultRetries(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-between">
                    <Button variant="outline" onClick={handleReset}>Reset to Defaults</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </div>
            </div>
        </div>
    );
}
