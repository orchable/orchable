# Change: Add Qwen and MiniMax Support for BYOK

## Why

The current Multi-Vendor BYOK supports Gemini and DeepSeek. With the latest AI Model Pricing analysis, users need support for models from **Qwen** (for cost-efficiency, large context window, and robust reasoning) and **MiniMax** (for lightning fast agentic operations up to 4M context). Adding these vendors provides a broader spectrum of LLMs that users can plug in with their personal API keys.

## What Changes

- **TypeScript Definitions**: Expand `AIModel` union to include models like `qwen-max`, `qwen-plus`, `minimax-01`, `minimax-m2.5-lightning`, etc. Update `provider` literal types to include `'qwen' | 'minimax'`.
- **UI Enchancements (`ApiKeyManager.tsx`)**: Update the provider dropdown to offer Qwen and MiniMax selection.
- **Backend Edge Proxy & Execution Worker**: Add routing rules for Qwen's DashScope compatible endpoint (`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`) and MiniMax's OpenAI-compatible endpoint. Ensure payload and response parsing matches our standard structure.
- **AI Model Database and Seed Settings**: Create a new SQL migration to seed the Qwen and MiniMax models into `ai_model_settings` with the new partial unique index logic. Update DeepSeek's context window limits to 128k accurately.

## Impact

- Specs: `models`
- Code: `src/lib/types.ts`, `src/components/settings/ApiKeyManager.tsx`, `src/workers/taskExecutor.worker.ts`, `supabase/functions/ai-proxy/index.ts`
