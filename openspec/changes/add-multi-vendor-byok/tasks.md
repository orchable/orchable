## 1. Implementation
- [ ] 1.1 Update `user_api_keys` type in `src/lib/types.ts` and `IndexedDBAdapter.ts` to include `provider?: 'gemini' | 'deepseek'`. Update Supabase schema to add `provider` character varying column.
- [ ] 1.2 Update `ApiKeyManager.tsx` with a provider dropdown (Gemini vs DeepSeek) and adjust UI validation rules for the key.
- [ ] 1.3 Add DeepSeek models to the `AIModel` type and ensure they are seeded or available in `ai_model_settings`.
- [ ] 1.4 Update Edge Function `ai-proxy/index.ts` to identify the provider. If `deepseek`, format the request for OpenAI compatibility and send it to `https://api.deepseek.com/v1/chat/completions`.
