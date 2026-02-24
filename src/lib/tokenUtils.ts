/**
 * Token utilities for estimating costs
 * Based on Google Gemini documentation:
 * ~4 characters roughly equals 1 token
 */

export const tokenUtils = {
	/**
	 * Estimate the number of tokens in a string
	 * @param text The input string
	 * @returns Estimated token count
	 */
	estimateTokens(text: string): number {
		if (!text) return 0;
		// Basic approximation: 4 characters per token
		return Math.ceil(text.length / 4);
	},

	/**
	 * Estimate tokens for a JSON object
	 * @param obj The JSON object
	 * @returns Estimated token count
	 */
	estimateTokensFromJson(obj: unknown): number {
		try {
			const jsonString = JSON.stringify(obj);
			return this.estimateTokens(jsonString);
		} catch (e) {
			return 0;
		}
	},

	/**
	 * Inject variables into a prompt template and estimate tokens
	 * @param template The prompt template with {{key}} placeholders
	 * @param variables The key-value pairs to inject
	 * @returns Estimated token count of the final prompt
	 */
	estimatePromptTokens(
		template: string,
		variables: Record<string, unknown>,
	): number {
		let finalPrompt = template;

		// Simple replacement logic mirroring the backend or n8n
		Object.entries(variables).forEach(([key, value]) => {
			const placeholder = new RegExp(`{{${key}}}`, "g");
			const replacement =
				typeof value === "object"
					? JSON.stringify(value)
					: String(value);
			finalPrompt = finalPrompt.replace(placeholder, replacement);
		});

		return this.estimateTokens(finalPrompt);
	},
};
