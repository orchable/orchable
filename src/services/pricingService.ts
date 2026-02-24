import { supabase } from "@/lib/supabase";

export interface ModelPricing {
	modelId: string;
	inputCostPer1M: number;
	outputCostPer1M: number;
}

const DEFAULT_PRICING_URL = "https://ai.google.dev/gemini-api/docs/pricing";
const CORS_PROXY = "https://corsproxy.io/?";

// Hardcoded fallbacks in case scraping fails
const FALLBACK_PRICING: ModelPricing[] = [
	{
		modelId: "gemini-1.5-flash",
		inputCostPer1M: 0.075,
		outputCostPer1M: 0.3,
	},
	{ modelId: "gemini-1.5-pro", inputCostPer1M: 1.25, outputCostPer1M: 5.0 },
	{ modelId: "gemini-2.0-flash", inputCostPer1M: 0.1, outputCostPer1M: 0.4 }, // Just a guess for 2.0 if not found
	{ modelId: "gemini-2.5-flash", inputCostPer1M: 0.3, outputCostPer1M: 2.5 },
	{ modelId: "gemini-2.5-pro", inputCostPer1M: 1.25, outputCostPer1M: 10.0 },
];

export const pricingService = {
	async getPricingUrl(): Promise<string> {
		// In the future, this could be fetched from a system_settings table or user profile
		return DEFAULT_PRICING_URL;
	},

	async fetchLivePricing(): Promise<ModelPricing[]> {
		try {
			const url = await this.getPricingUrl();
			const response = await fetch(
				`${CORS_PROXY}${encodeURIComponent(url)}`,
			);

			if (!response.ok) throw new Error("Failed to fetch pricing");

			const html = await response.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, "text/html");

			// This is a naive implementation and might need adjustment based on the actual HTML structure
			// For now, it's a placeholder for the logic. Scraping can be brittle.
			// We will look for table rows or text patterns.

			// Attempting to find prices via regex if DOM structure is complex
			return this.parsePricingFromHtml(html);
		} catch (error) {
			console.error("Pricing fetch failed, using fallbacks:", error);
			return FALLBACK_PRICING;
		}
	},

	parsePricingFromHtml(html: string): ModelPricing[] {
		const results: ModelPricing[] = [];

		// Simplistic extraction logic - looking for model IDs and prices near them
		const modelsToFind = [
			"gemini-1.5-flash",
			"gemini-1.5-pro",
			"gemini-2.0-flash",
			"gemini-2.5-flash",
			"gemini-2.5-pro",
		];

		// Improved regex to find pattern: $X.XX per 1 million tokens (input/prompts)
		// This is still an approximation as the page content can vary.

		modelsToFind.forEach((modelId) => {
			// Find the model section
			const modelIndex = html.indexOf(modelId);
			if (modelIndex === -1) {
				// Use fallback if not found in live page
				const fallback = FALLBACK_PRICING.find(
					(f) => f.modelId === modelId,
				);
				if (fallback) results.push(fallback);
				return;
			}

			// Look for input/output costs in the text following the model ID
			const block = html.substring(modelIndex, modelIndex + 2000);

			// Search for prompt/input price
			const inputMatch = block.match(
				/\$([0-9.]+)\s*per\s*1\s*million\s*(tokens|input|prompts)/i,
			);
			const outputMatch = block.match(
				/\$([0-9.]+)\s*per\s*1\s*million\s*(candidates|output)/i,
			);

			results.push({
				modelId,
				inputCostPer1M: inputMatch
					? parseFloat(inputMatch[1])
					: FALLBACK_PRICING.find((f) => f.modelId === modelId)
							?.inputCostPer1M || 0,
				outputCostPer1M: outputMatch
					? parseFloat(outputMatch[1])
					: FALLBACK_PRICING.find((f) => f.modelId === modelId)
							?.outputCostPer1M || 0,
			});
		});

		return results.length > 0 ? results : FALLBACK_PRICING;
	},

	calculateCost(
		tokens: number,
		type: "input" | "output",
		modelId: string,
		pricingList: ModelPricing[],
	): number {
		const pricing =
			pricingList.find((p) => p.modelId === modelId) ||
			FALLBACK_PRICING.find((f) => f.modelId === modelId);
		if (!pricing) return 0;

		const rate =
			type === "input" ? pricing.inputCostPer1M : pricing.outputCostPer1M;
		return (tokens / 1000000) * rate;
	},
};
