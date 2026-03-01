# Change: Support Multi-Vendor Models for BYOK

## Why
Currently, the Free Tier Bring Your Own Key (BYOK) flow only supports Gemini keys (validating `AIza...`). Users want to use other leading models like DeepSeek. Supporting multiple model vendors enables a flexible, provider-agnostic BYOK experience.

## What Changes
- **TypeScript Types**: Update `AIModel` to include DeepSeek models. Update `ApiKey` interface to include `provider?: 'gemini' | 'deepseek'`.
- **Database & Local Storage**: Add a `provider` field to `user_api_keys` (both IndexedDB and Supabase) to route requests correctly.
- **Settings UI (`ApiKeyManager.tsx`)**: Add a vendor selection dropdown when adding a personal key. Adjust validation so Gemini keys require `AIza` and DeepSeek keys require `sk-`.
- **AI Proxy (`ai-proxy/index.ts`)**: Read the vendor from the selected model and key, then route API calls to either Google Gemini or the DeepSeek API (`https://api.deepseek.com/v1/chat/completions`) using OpenAI compatibility.
- **Model Seed Data**: Ensure DeepSeek models (e.g., `deepseek-chat`) are available for selection in `freeTierService.ts` and UI downstream.

## Impact
- Specs: `models`
- Code: `src/lib/types.ts`, `src/lib/storage/IndexedDBAdapter.ts`, `src/components/settings/ApiKeyManager.tsx`, `supabase/functions/ai-proxy/index.ts`
