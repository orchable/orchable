/* eslint-disable */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

interface AiProxyRequest {
	batch_id?: string;
	prompt: string;
	system_instruction?: string;
	global_context?: Record<string, string>; // { "filename.pdf": "extracted text..." }
	ai_settings?: {
		model?: string;
		temperature?: number;
		maxOutputTokens?: number;
	};
}

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
		);

		const body = (await req.json()) as AiProxyRequest;

		// 1. Verify User (Optional if called by n8n webhook, but good practice if called by client)
		// For n8n, we might rely on the Service Role Key or a specific secret.
		// For now, we trust the payload if it comes with the right auth header.
		const authHeader = req.headers.get("Authorization");
		if (!authHeader) {
			throw new Error("Missing Authorization header");
		}

		const {
			data: { user },
			error: userError,
		} = await supabaseClient.auth.getUser(
			authHeader.replace("Bearer ", ""),
		);

		if (userError || !user) {
			throw new Error("Unauthorized");
		}

		// 2. Extract Data
		const {
			batch_id,
			prompt,
			global_context,
			ai_settings,
			system_instruction,
		} = body;
		const model = ai_settings?.model || "gemini-2.5-flash";
		const apiKey = Deno.env.get("GEMINI_API_KEY");

		if (!apiKey) {
			throw new Error("GEMINI_API_KEY not configured in Edge Function");
		}

		let finalCachedContentName: string | undefined = undefined;

		// 3. Handle Context Caching (If applicable)
		if (batch_id && global_context) {
			const contextValues = Object.values(global_context).join("\n\n");

			// Only cache if context is substantially large (> ~10k chars / 2.5k tokens) to justify API overhead
			if (contextValues.length > 10000) {
				// Check if cache exists
				const { data: existingCache } = await supabaseClient
					.from("gemini_caches")
					.select("*")
					.eq("batch_id", batch_id)
					.single();

				if (
					existingCache &&
					new Date(existingCache.expires_at) > new Date()
				) {
					console.log(
						`[ai-proxy] Reusing valid cache: ${existingCache.cache_name}`,
					);
					finalCachedContentName = existingCache.cache_name;
				} else {
					// Need to create new cache
					console.log(
						`[ai-proxy] Creating new cache for batch: ${batch_id}`,
					);

					// Delete old cache record if any
					if (existingCache) {
						await supabaseClient
							.from("gemini_caches")
							.delete()
							.eq("id", existingCache.id);
					}

					// Prepare Context String
					const cachePayload = {
						model: `models/${model}`,
						contents: [
							{
								role: "user",
								parts: [{ text: contextValues }],
							},
						],
						ttl: "3600s", // 1 hour
					};

					const cacheRes = await fetch(
						`https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(cachePayload),
						},
					);

					if (!cacheRes.ok) {
						const err = await cacheRes.text();
						console.error(
							`[ai-proxy] Cache creation failed: ${err}`,
						);
						// Fallback: Don't use cache, just proceed normally (it will cost more tokens)
					} else {
						const cacheData = await cacheRes.json();
						finalCachedContentName = cacheData.name;

						// Store in DB
						await supabaseClient.from("gemini_caches").insert({
							batch_id,
							cache_name: cacheData.name,
							user_id: user.id,
							expires_at: cacheData.expireTime,
						});
					}
				}
			}
		}

		// 4. Build Generation Payload
		const generatePayload: any = {
			contents: [
				{
					role: "user",
					parts: [],
				},
			],
			generationConfig: {
				temperature: ai_settings?.temperature ?? 1.0,
				maxOutputTokens: ai_settings?.maxOutputTokens ?? 8192,
			},
		};

		// If we don't have a cache, but we DO have global_context, prepend it to prompt
		if (!finalCachedContentName && global_context) {
			const contextValues = Object.entries(global_context)
				.map(
					([name, content]) =>
						`--- DOCUMENT: ${name} ---\n${content}\n--- END OF DOCUMENT ---`,
				)
				.join("\n\n");
			generatePayload.contents[0].parts.push({
				text: contextValues + "\n\n",
			});
		}

		generatePayload.contents[0].parts.push({ text: prompt });

		if (system_instruction) {
			generatePayload.systemInstruction = {
				role: "system",
				parts: [{ text: system_instruction }],
			};
		}

		if (finalCachedContentName) {
			generatePayload.cachedContent = finalCachedContentName;
		}

		// 5. Call Gemini
		const generateRes = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(generatePayload),
			},
		);

		if (!generateRes.ok) {
			const err = await generateRes.text();
			throw new Error(`Gemini API Error: ${err}`);
		}

		const data = await generateRes.json();

		return new Response(JSON.stringify(data), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		const err = error as Error;
		console.error("[ai-proxy] Error:", err.message);
		return new Response(JSON.stringify({ error: err.message }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 400,
		});
	}
});
