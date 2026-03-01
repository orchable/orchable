/* eslint-disable */
// @ts-nocheck
// Supabase Edge Function: send-notification
// Implements email notifications for Free Tier usage and expiration.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !supabaseServiceKey) {
	console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
	try {
		const { record, type } = await req.json();

		// 1. Determine notification type
		// type: 'STARTED' | 'EXPIRING' | 'QUOTA_EXCEEDED'

		// 2. Fetch User Profile for email
		const { data: profile } = await supabase
			.from("user_profiles")
			.select("email, full_name")
			.eq("id", record.user_id)
			.single();

		if (!profile?.email) {
			return new Response(
				JSON.stringify({ error: "User email not found" }),
				{ status: 400 },
			);
		}

		console.log(`[Notification] Sending ${type} email to ${profile.email}`);

		// 3. PLACEHOLDER: Email Service Integration
		// Replace this with Resend, SendGrid, etc.
		const emailPayload = {
			from: "Orchable <notifications@orchable.com>",
			to: profile.email,
			subject: "",
			html: "",
		};

		if (type === "STARTED") {
			emailPayload.subject = "Your Orchestration has started!";
			emailPayload.html = `
        <h1>Orchestration Running</h1>
        <p>Hi ${profile.full_name || "there"},</p>
        <p>Your task is now processing. As a Free Tier user, your results will be available for <b>24 hours</b>.</p>
        <p>Please return to the app within a day to sync your results to local storage.</p>
      `;
		} else if (type === "EXPIRING") {
			emailPayload.subject = "Action Required: Your results expire soon";
			emailPayload.html = `
        <h1>Results Expiring</h1>
        <p>Your Free Tier orchestration results will be deleted from our servers in less than 6 hours.</p>
        <p>Open <a href="https://orchable.com">Orchable</a> now to sync them to your browser.</p>
      `;
		}

		// SIMULATED SEND
		console.log("Email Payload:", JSON.stringify(emailPayload, null, 2));

		return new Response(
			JSON.stringify({ success: true, simulated: true }),
			{ status: 200 },
		);
	} catch (error) {
		const err = error as Error;
		return new Response(JSON.stringify({ error: err.message }), {
			status: 500,
		});
	}
});
