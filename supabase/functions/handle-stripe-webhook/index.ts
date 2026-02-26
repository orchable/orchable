import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
	try {
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
		);

		// TODO: Verify Stripe Signature
		const payload = await req.json();
		console.log("Received Stripe Webhook:", payload.type);

		if (payload.type === "checkout.session.completed") {
			const session = payload.data.object;
			const userId = session.client_reference_id;

			// Update subscription in DB
			await supabaseClient.from("user_subscriptions").upsert({
				user_id: userId,
				tier: "premium",
				stripe_customer_id: session.customer,
				updated_at: new Date().toISOString(),
			});
		}

		return new Response(JSON.stringify({ received: true }), {
			headers: { "Content-Type": "application/json" },
			status: 200,
		});
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message }), {
			headers: { "Content-Type": "application/json" },
			status: 400,
		});
	}
});
