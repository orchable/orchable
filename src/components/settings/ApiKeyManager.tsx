import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/storage/IndexedDBAdapter";
import { useAuth } from "@/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Key, Loader2, ShieldCheck, AlertCircle, Bot } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { executorService } from "@/services/executorService";

export interface ApiKey {
    id: string;
    key_name: string;
    pool_type: 'personal' | 'free_pool' | 'premium_pool';
    provider?: 'gemini' | 'deepseek' | 'qwen' | 'minimax';
    created_at: string;
    api_key_encrypted?: string; // Need this for getting health
    health_status?: string;
    last_error_code?: string;
}

export function ApiKeyManager() {
    const { user } = useAuth();
    const { tier } = useTier();
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [newKeyValue, setNewKeyValue] = useState("");
    const [newProvider, setNewProvider] = useState<'gemini' | 'deepseek' | 'qwen' | 'minimax'>('gemini');

    const keyLimit = tier === 'premium' ? Infinity : 3;
    const isAtLimit = keys.length >= keyLimit;

    const fetchKeys = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            let fetchedKeys: ApiKey[] = [];
            if (tier === 'free') {
                const localKeys = await db.user_api_keys
                    .where('pool_type')
                    .equals('personal')
                    .toArray();
                fetchedKeys = localKeys || [];

                // Cleanup orphaned health records
                const validKeyValues = new Set(localKeys.map(k => k.api_key_encrypted));
                const allHealths = await db.api_key_health.toArray();
                for (const h of allHealths) {
                    if (!validKeyValues.has(h.user_api_key_id)) {
                        await db.api_key_health.delete(h.user_api_key_id);
                    }
                }
            } else {
                const { data, error } = await supabase
                    .from('user_api_keys')
                    .select('id, key_name, pool_type, provider, created_at, api_key_encrypted')
                    .eq('user_id', user.id)
                    .eq('pool_type', 'personal')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                fetchedKeys = data || [];

                // For premium, we might need a Supabase rpc or trigger to cleanup health, 
                // but doing it locally if we store health locally for them too doesn't hurt.
            }

            // Fetch health status for the keys
            const keysWithHealth = await Promise.all(fetchedKeys.map(async (key) => {
                const health = await db.api_key_health.get(key.api_key_encrypted || key.id);
                return {
                    ...key,
                    health_status: health?.health_status || 'healthy',
                    last_error_code: health?.last_error_code
                };
            }));

            setKeys(keysWithHealth);
        } catch (err) {
            console.error("Failed to fetch keys:", err);
            toast.error("Failed to load API keys");
        } finally {
            setIsLoading(false);
        }
    }, [user, tier]);

    useEffect(() => {
        fetchKeys();
    }, [fetchKeys]);

    async function handleAddKey() {
        if (!user || isAtLimit) return;
        if (!newKeyName || !newKeyValue) {
            toast.error("Please fill in both name and key value");
            return;
        }

        const trimmedKey = newKeyValue.trim();
        if (newProvider === 'gemini') {
            if (!trimmedKey.startsWith("AIza") || trimmedKey.length < 30) {
                toast.error("Invalid Gemini API Key format. It should start with 'AIza'.");
                return;
            }
        } else if (newProvider === 'deepseek') {
            if (!trimmedKey.startsWith("sk-") || trimmedKey.length < 30) {
                toast.error("Invalid DeepSeek API Key format. It should start with 'sk-'.");
                return;
            }
        } else if (newProvider === 'qwen' || newProvider === 'minimax') {
            if (!trimmedKey.startsWith("sk-") || trimmedKey.length < 20) {
                toast.error(`Invalid ${newProvider.toUpperCase()} API Key format.`);
                return;
            }
        }

        setIsAdding(true);
        try {
            if (tier === 'free') {
                await db.user_api_keys.put({
                    id: crypto.randomUUID(),
                    user_id: user.id,
                    key_name: newKeyName.trim(),
                    api_key_encrypted: trimmedKey,
                    pool_type: 'personal',
                    provider: newProvider,
                    created_at: new Date().toISOString()
                });
            } else {
                const { error } = await supabase
                    .from('user_api_keys')
                    .insert({
                        user_id: user.id,
                        key_name: newKeyName.trim(),
                        api_key_encrypted: trimmedKey,
                        pool_type: 'personal',
                        provider: newProvider
                    });

                if (error) throw error;
            }

            toast.success("API Key added successfully");
            setNewKeyName("");
            setNewKeyValue("");
            await fetchKeys();
            await executorService.reloadKeys(tier);
        } catch (err) {
            console.error("Failed to add key:", err);
            toast.error("Failed to add API key");
        } finally {
            setIsAdding(false);
        }
    }

    async function handleDeleteKey(id: string) {
        try {
            const keyToDelete = keys.find(k => k.id === id);
            if (tier === 'free') {
                if (keyToDelete?.api_key_encrypted) {
                    await db.api_key_health.delete(keyToDelete.api_key_encrypted);
                }
                await db.user_api_keys.delete(id);
            } else {
                // Remove health if stored locally, though premium might use remote 
                if (keyToDelete?.api_key_encrypted) {
                    await db.api_key_health.delete(keyToDelete.api_key_encrypted);
                }
                const { error } = await supabase
                    .from('user_api_keys')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            }

            toast.success("API Key removed");
            await fetchKeys();
            await executorService.reloadKeys(tier);
        } catch (err) {
            console.error("Failed to delete key:", err);
            toast.error("Failed to delete API key");
        }
    }

    async function handleTestKey(key: ApiKey) {
        if (!key.api_key_encrypted) {
            toast.error("Key value not available for testing");
            return;
        }

        const toastId = toast.loading(`Testing ${key.key_name}...`);

        try {
            let isSuccess = false;
            let errorMsg = '';

            if (key.provider === 'gemini' || !key.provider) {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key.api_key_encrypted}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
                });
                isSuccess = res.ok;
                if (!res.ok) errorMsg = await res.text();
            } else if (key.provider === 'deepseek') {
                const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.api_key_encrypted}` },
                    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: 'Hi' }] })
                });
                isSuccess = res.ok;
                if (!res.ok) errorMsg = await res.text();
            } else if (key.provider === 'qwen') {
                const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.api_key_encrypted}` },
                    body: JSON.stringify({ model: 'qwen-plus', messages: [{ role: 'user', content: 'Hi' }] })
                });
                isSuccess = res.ok;
                if (!res.ok) errorMsg = await res.text();
            } else if (key.provider === 'minimax') {
                const res = await fetch('https://api.minimax.chat/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.api_key_encrypted}` },
                    body: JSON.stringify({ model: 'minimax-01', messages: [{ role: 'user', content: 'Hi' }] })
                });
                isSuccess = res.ok;
                if (!res.ok) errorMsg = await res.text();
            }

            if (isSuccess) {
                toast.success(`${key.key_name} is working perfectly!`, { id: toastId });
                // Reset health to healthy
                await db.api_key_health.put({
                    user_api_key_id: key.api_key_encrypted,
                    health_status: 'healthy',
                    consecutive_failures: 0,
                    successful_requests: 1,
                    total_requests: 1,
                    failed_requests: 0,
                    blocked_until: null,
                    last_success_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                await fetchKeys();
                await executorService.reloadKeys(tier);
            } else {
                toast.error(`${key.key_name} failed: ${errorMsg || 'Unknown error'}`, { id: toastId });
            }
        } catch (err) {
            toast.error(`Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`, { id: toastId });
        }
    }

    return (
        <Card className="glass-card border-primary/20 bg-background/40 backdrop-blur-md">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Key className="w-5 h-5 text-primary" />
                            Personal API Keys (BYOK)
                        </CardTitle>
                        <CardDescription>
                            Manage your own Gemini API keys. {tier === 'free' ? `3 keys max (You have ${keys.length}).` : 'Unlimited keys for Premium users.'}
                        </CardDescription>
                    </div>
                    <ShieldCheck className="w-8 h-8 text-success opacity-20" />
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Key List */}
                <div className="rounded-lg border bg-background/50 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Label</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Added</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : keys.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                                        No personal keys added yet. Using platform pools.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                keys.map((key) => (
                                    <TableRow key={key.id} className="group hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium">{key.key_name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 capitalize text-xs">
                                                <Bot className="w-3.5 h-3.5 opacity-50" />
                                                {key.provider || 'gemini'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] uppercase font-bold tracking-wider",
                                                    key.health_status === 'healthy' ? "text-success border-success/30 bg-success/10" :
                                                        key.health_status === 'rate_limited' ? "text-warning border-warning/30 bg-warning/10" :
                                                            "text-destructive border-destructive/30 bg-destructive/10"
                                                )}
                                            >
                                                {key.health_status === 'healthy' ? 'Healthy' :
                                                    key.health_status === 'rate_limited' ? 'Rate Limited' :
                                                        key.health_status === 'disabled' ? 'Disabled' : 'Blocked'}
                                                {key.last_error_code ? ` (${key.last_error_code})` : ''}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(key.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs font-semibold text-primary hover:bg-primary/10"
                                                    onClick={() => handleTestKey(key)}
                                                >
                                                    Test
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteKey(key.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Add New Key Form */}
                {!isAtLimit ? (
                    <div className="space-y-4 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Add Personal Key
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="provider" className="text-xs">Model Vendor</Label>
                                <Select value={newProvider} onValueChange={(v: "gemini" | "deepseek" | "qwen" | "minimax") => setNewProvider(v)}>
                                    <SelectTrigger id="provider" className="h-9 glass-input">
                                        <SelectValue placeholder="Select Vendor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gemini">Google Gemini</SelectItem>
                                        <SelectItem value="deepseek">DeepSeek AI</SelectItem>
                                        <SelectItem value="qwen">Alibaba Qwen</SelectItem>
                                        <SelectItem value="minimax">MiniMax AI</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="key-name" className="text-xs">Friendly Name</Label>
                                <Input
                                    id="key-name"
                                    placeholder={newProvider === 'gemini' ? "Gemini Key 1" : newProvider === 'deepseek' ? "DeepSeek Key 1" : `${newProvider.toUpperCase()} Key 1`}
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    className="h-9 glass-input"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="api-key" className="text-xs">API Key</Label>
                                <Input
                                    id="api-key"
                                    type="password"
                                    placeholder={newProvider === 'gemini' ? "AIza..." : "sk-..."}
                                    value={newKeyValue}
                                    onChange={(e) => setNewKeyValue(e.target.value)}
                                    className="h-9 glass-input"
                                />
                            </div>
                        </div>
                        <Button
                            className="w-full h-10 shadow-lg hover:shadow-primary/20 transition-all font-bold"
                            onClick={handleAddKey}
                            disabled={isAdding || !newKeyName || !newKeyValue}
                        >
                            {isAdding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Save Personal Key
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center">
                            Keys are encrypted at rest. Get keys from
                            {newProvider === 'gemini' ? (
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-primary hover:underline ml-1">Google AI Studio</a>
                            ) : newProvider === 'deepseek' ? (
                                <a href="https://platform.deepseek.com/api_keys" target="_blank" className="text-primary hover:underline ml-1">DeepSeek Platform</a>
                            ) : newProvider === 'qwen' ? (
                                <a href="https://dashscope.console.aliyun.com/apiKey" target="_blank" className="text-primary hover:underline ml-1">DashScope Console</a>
                            ) : (
                                <a href="https://platform.minimaxi.com/user-center/basic-information/api-key" target="_blank" className="text-primary hover:underline ml-1">MiniMax Platform</a>
                            )}.
                        </p>
                    </div>
                ) : (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div className="text-xs font-medium">
                            You've reached the {keyLimit}-key limit for the Free tier. Upgrade to Premium for unlimited keys.
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
