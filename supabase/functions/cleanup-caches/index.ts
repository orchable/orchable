import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
		);

		console.log(
			"[cleanup-caches] Starting cleanup of expired Gemini caches...",
		);

		// 1. Delete rows from gemini_caches where expires_at < NOW()
		const { data, error, count } = await supabaseClient
			.from("gemini_caches")
			.delete({ count: "exact" })
			.lt("expires_at", new Date().toISOString());

		if (error) {
			throw error;
		}

		console.log(
			`[cleanup-caches] Successfully removed ${count} expired cache records.`,
		);

		return new Response(
			JSON.stringify({
				success: true,
				removed_count: count,
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			},
		);
	} catch (error) {
		const err = error as Error;
		console.error("[cleanup-caches] Error:", err.message);
		return new Response(JSON.stringify({ error: err.message }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 400,
		});
	}
});
