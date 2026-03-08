import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
	console.log("--- Prompt Templates ---");
	const { data: prompts, error: pError } = await supabase
		.from("prompt_templates")
		.select("id, name")
		.limit(3);
	console.log(JSON.stringify(prompts, null, 2));

	console.log("--- Orchestrations ---");
	const { data: orcs, error: oError } = await supabase
		.from("lab_orchestrator_configs")
		.select("id, name, steps")
		.limit(1);
	console.log(JSON.stringify(orcs, null, 2));

	if (pError || oError) {
		console.error("Errors:", { pError, oError });
	}
}

main().catch(console.error);
