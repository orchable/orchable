import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";


export default function SettingsPage() {
    const [n8nUrl, setN8nUrl] = useState("");
    const [n8nApiKey, setN8nApiKey] = useState("");
    const [supabaseUrl, setSupabaseUrl] = useState("");
    const [supabaseKey, setSupabaseKey] = useState("");

    const [defaultTimeout, setDefaultTimeout] = useState("300000");
    const [defaultRetries, setDefaultRetries] = useState("3");

    const [masterSlug, setMasterSlug] = useState("");
    const [useTestWebhook, setUseTestWebhook] = useState(false);

    useEffect(() => {
        // Load from localStorage or fall back to env/defaults
        setN8nUrl(localStorage.getItem("lovable_n8n_url") || import.meta.env.VITE_N8N_BASE_URL || "");
        setN8nApiKey(localStorage.getItem("lovable_n8n_api_key") || import.meta.env.VITE_N8N_API_KEY || "");

        setSupabaseUrl(localStorage.getItem("lovable_supabase_url") || import.meta.env.VITE_SUPABASE_URL || "");
        setSupabaseKey(localStorage.getItem("lovable_supabase_key") || import.meta.env.VITE_SUPABASE_ANON_KEY || "");

        setDefaultTimeout(localStorage.getItem("lovable_default_timeout") || "300000");
        setDefaultRetries(localStorage.getItem("lovable_default_retries") || "3");

        setMasterSlug(localStorage.getItem("lovable_n8n_master_slug") || "master-orchestrator");
        setUseTestWebhook(localStorage.getItem("lovable_n8n_use_test_webhook") === "true");
    }, []);

    const handleSave = () => {
        const currentSupabaseUrl = localStorage.getItem("lovable_supabase_url");
        const currentSupabaseKey = localStorage.getItem("lovable_supabase_key");

        localStorage.setItem("lovable_n8n_url", n8nUrl);
        localStorage.setItem("lovable_n8n_api_key", n8nApiKey);

        localStorage.setItem("lovable_supabase_url", supabaseUrl);
        localStorage.setItem("lovable_supabase_key", supabaseKey);

        localStorage.setItem("lovable_default_timeout", defaultTimeout);
        localStorage.setItem("lovable_default_retries", defaultRetries);

        localStorage.setItem("lovable_n8n_master_slug", masterSlug);
        localStorage.setItem("lovable_n8n_use_test_webhook", String(useTestWebhook));

        toast.success("Settings saved successfully");

        // Reload if critical DB config changed
        if (supabaseUrl !== currentSupabaseUrl || supabaseKey !== currentSupabaseKey) {
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    const handleReset = () => {
        localStorage.removeItem("lovable_n8n_url");
        localStorage.removeItem("lovable_n8n_api_key");
        localStorage.removeItem("lovable_supabase_url");
        localStorage.removeItem("lovable_supabase_key");
        localStorage.removeItem("lovable_default_timeout");
        localStorage.removeItem("lovable_default_retries");
        localStorage.removeItem("lovable_n8n_master_slug");
        localStorage.removeItem("lovable_n8n_use_test_webhook");

        setN8nUrl(import.meta.env.VITE_N8N_BASE_URL || "");
        setN8nApiKey(import.meta.env.VITE_N8N_API_KEY || "");
        setSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || "");
        setSupabaseKey(import.meta.env.VITE_SUPABASE_ANON_KEY || "");

        setDefaultTimeout("300000");
        setDefaultRetries("3");

        setMasterSlug("master-orchestrator");
        setUseTestWebhook(false);

        toast.info("Settings reset to environment defaults");
        setTimeout(() => window.location.reload(), 1500);
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

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="n8n-url">n8n Base URL</Label>
                                <Input
                                    id="n8n-url"
                                    placeholder="https://n8n.example.com"
                                    value={n8nUrl}
                                    onChange={(e) => setN8nUrl(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    The base URL for your n8n workflows.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="n8n-api-key">n8n API Key</Label>
                                <Input
                                    id="n8n-api-key"
                                    type="password"
                                    placeholder="n8n_api_..."
                                    value={n8nApiKey}
                                    onChange={(e) => setN8nApiKey(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Required to list available workflows in the Designer.
                                </p>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">Master Workflow Configuration</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="master-slug">Webhook Slug</Label>
                                    <Input
                                        id="master-slug"
                                        value={masterSlug}
                                        onChange={(e) => setMasterSlug(e.target.value)}
                                        placeholder="master-orchestrator"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        The path part of the webhook URL.
                                    </p>
                                </div>
                                <div className="space-y-2 flex flex-col justify-end pb-2">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="test-webhook"
                                            checked={useTestWebhook}
                                            onChange={(e) => setUseTestWebhook(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <Label htmlFor="test-webhook">Use Test Webhook URL</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Switch to <code>/webhook-test/</code> for debugging active workflows.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label htmlFor="supa-url">Supabase URL</Label>
                            <Input
                                id="supa-url"
                                placeholder="https://xxx.supabase.co"
                                value={supabaseUrl}
                                onChange={(e) => setSupabaseUrl(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="supa-key">Supabase Anon Key</Label>
                            <Input
                                id="supa-key"
                                type="password"
                                placeholder="ey..."
                                value={supabaseKey}
                                onChange={(e) => setSupabaseKey(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground text-orange-600">
                                Changing Supabase configuration will trigger a page reload.
                            </p>
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
        </div >
    );
}
