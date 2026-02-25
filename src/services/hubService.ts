import { supabase } from "@/lib/supabase";
import type { OrchestratorConfig, AISettings } from "@/lib/types";

export type HubAssetType =
	| "orchestration"
	| "template"
	| "component"
	| "ai_preset";

export interface HubAsset {
	id: string;
	asset_type: HubAssetType;
	ref_id: string;
	creator_id: string;
	slug: string;
	title: string;
	description: string | null;
	tags: string[];
	thumbnail_url: string | null;
	source_asset_id: string | null;
	parent_asset_id: string | null;
	remix_depth: number;
	is_public: boolean;
	published_at: string | null;
	license: string;
	price_cents: number;
	install_count: number;
	star_count: number;
	content: Record<string, unknown>; // Full snapshot of the asset
	created_at: string;
	updated_at: string;
}

export interface HubBrowseFilters {
	type?: HubAssetType;
	tags?: string[];
	search?: string;
	sort?: "newest" | "popular" | "starred";
	page?: number;
	pageSize?: number;
}

/**
 * Strips sensitive data from orchestration config before publishing
 */
function stripSensitiveData(config: OrchestratorConfig): OrchestratorConfig {
	const cleanConfig = JSON.parse(
		JSON.stringify(config),
	) as OrchestratorConfig;

	cleanConfig.steps = cleanConfig.steps.map((step) => {
		// Strip API keys/secrets from authConfig
		if (step.authConfig) {
			delete step.authConfig.headerValue;
		}

		// Strip sensitive URL parameters if any (basic generic implementation)
		if (step.webhookUrl) {
			try {
				const url = new URL(step.webhookUrl);
				const paramsToDelete = [
					"token",
					"key",
					"auth",
					"secret",
					"apiKey",
				];
				paramsToDelete.forEach((p) => url.searchParams.delete(p));
				step.webhookUrl = url.toString();
			} catch (error: unknown) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				console.error(
					"Failed to strip sensitive data from webhook URL:",
					message,
				);
				// Not a valid URL or other error, keep as is.
			}
		}

		// Strip n8n credentials if present in custom fields
		return step;
	});

	return cleanConfig;
}

export const hubService = {
	/**
	 * Fetch assets from the Hub with filtering and pagination
	 */
	async fetchHubAssets(filters: HubBrowseFilters = {}) {
		const { type, search, sort, page = 1, pageSize = 12 } = filters;

		let query = supabase
			.from("hub_assets")
			.select("*", { count: "exact" })
			.eq("is_public", true)
			.eq("is_hidden", false);

		if (type) {
			query = query.eq("asset_type", type);
		}

		if (search) {
			query = query.or(
				`title.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search.split(" ").join(",")}}`,
			);
		}

		// Sorting
		if (sort) {
			query = query.order(
				sort === "newest" ? "created_at" : "star_count",
				{
					ascending: false,
				},
			);
		} else {
			query = query.order("created_at", { ascending: false });
		}

		// Pagination
		const from = (page - 1) * pageSize;
		const to = from + pageSize - 1;
		query = query.range(from, to);

		const { data, count, error } = await query;

		if (error) throw error;
		return { data: data as HubAsset[], total: count || 0 };
	},

	/**
	 * Fetch featured assets (highest star counts or curated)
	 */
	async fetchFeaturedAssets(limit = 4) {
		const { data, error } = await supabase
			.from("hub_assets")
			.select("*")
			.eq("is_public", true)
			.eq("is_hidden", false)
			.order("star_count", { ascending: false })
			.limit(limit);

		if (error) throw error;
		return data as HubAsset[];
	},

	/**
	 * Get a single Hub asset by its slug
	 */
	async fetchHubAssetBySlug(slug: string) {
		const { data, error } = await supabase
			.from("hub_assets")
			.select("*")
			.eq("slug", slug)
			.single();

		if (error) throw error;
		return data as HubAsset;
	},

	/**
	 * Publish an asset to the Hub with a full snapshot of its content
	 */
	async publishAsset(params: {
		type: HubAssetType;
		refId: string;
		title: string;
		description?: string;
		tags?: string[];
		license?: string;
		isPublic?: boolean;
	}) {
		const {
			type,
			refId,
			title,
			description,
			tags,
			license = "orchable-free",
			isPublic = true,
		} = params;

		// 1. Get source content for snapshotting
		let tableName = "";
		if (type === "template") tableName = "prompt_templates";
		else if (type === "component") tableName = "custom_components";
		else if (type === "orchestration")
			tableName = "lab_orchestrator_configs";
		else if (type === "ai_preset") tableName = "ai_model_settings";

		const { data: sourceData, error: fetchErr } = await supabase
			.from(tableName)
			.select("*")
			.eq("id", refId)
			.single();

		if (fetchErr) throw fetchErr;

		// 2. Prepare content bundle (Phase 2 logic)
		let contentSnapshot: Record<string, any> = { ...sourceData };
		delete contentSnapshot.id;
		delete contentSnapshot.created_at;
		delete contentSnapshot.updated_at;
		delete contentSnapshot.hub_asset_id;
		delete contentSnapshot.is_public;

		if (type === "orchestration") {
			const config = sourceData as OrchestratorConfig;
			const bundledTemplates: Record<string, unknown> = {};
			const bundledComponents: Record<string, unknown> = {};

			// Fetch all linked templates
			const templateIds = config.steps
				.map((s) => s.prompt_template_id)
				.filter(Boolean) as string[];

			if (templateIds.length > 0) {
				const { data: templates } = await supabase
					.from("prompt_templates")
					.select("*, custom_components(*)")
					.in("id", templateIds);

				templates?.forEach((t) => {
					const cleanT = { ...t };
					delete cleanT.id;
					bundledTemplates[t.id] = cleanT;

					if (t.custom_components) {
						const cleanC = { ...t.custom_components };
						delete cleanC.id;
						bundledComponents[t.custom_component_id] = cleanC;
					}
				});
			}

			contentSnapshot.bundle = {
				templates: bundledTemplates,
				components: bundledComponents,
			};

			// Strip sensitive data from the orchestration snapshot
			contentSnapshot = stripSensitiveData(
				contentSnapshot as OrchestratorConfig,
			);
		}

		// 3. Generate slug
		const slug = title
			.toLowerCase()
			.replace(/[^\w\s-]/g, "")
			.replace(/[\s_]+/g, "-")
			.concat("-", Math.random().toString(36).substring(2, 7));

		// 4. Get current user
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Authentication required to publish");

		// 5. Create Hub Asset record
		const { data, error } = await supabase
			.from("hub_assets")
			.insert({
				asset_type: type,
				ref_id: refId,
				creator_id: user.id,
				slug,
				title,
				description,
				tags: tags || [],
				license,
				is_public: isPublic,
				content: contentSnapshot,
				published_at: isPublic ? new Date().toISOString() : null,
			})
			.select()
			.single();

		if (error) throw error;

		// 6. Link back to source table
		if (tableName) {
			await supabase
				.from(tableName)
				.update({ hub_asset_id: data.id, is_public: isPublic })
				.eq("id", refId);
		}

		return data as HubAsset;
	},

	/**
	 * Import a Hub asset into the current user's workspace using its snapshot
	 */
	async importAsset(
		hubAssetId: string,
		options: { mode: "use" | "remix" } = { mode: "use" },
	) {
		// 1. Fetch Hub Asset snapshot
		const { data: hubAsset, error: hubErr } = await supabase
			.from("hub_assets")
			.select("*")
			.eq("id", hubAssetId)
			.single();

		if (hubErr) throw hubErr;

		const {
			data: { user },
		} = await supabase.auth.getUser();

		// 2. Determine target table
		let targetTableName = "";
		if (hubAsset.asset_type === "template")
			targetTableName = "prompt_templates";
		else if (hubAsset.asset_type === "component")
			targetTableName = "custom_components";
		else if (hubAsset.asset_type === "orchestration")
			targetTableName = "lab_orchestrator_configs";
		else if (hubAsset.asset_type === "ai_preset")
			targetTableName = "ai_model_settings";

		// 3. Handle Bundled Import (Phase 2 logic)
		const snapshot = hubAsset.content;
		const importedAsset = { ...snapshot };

		if (user) {
			importedAsset.created_by = user.id;
		}
		importedAsset.hub_asset_id = hubAsset.id;
		importedAsset.is_public = false;

		if (hubAsset.asset_type === "orchestration" && snapshot.bundle) {
			const { templates, components } = snapshot.bundle as {
				templates: Record<string, unknown>;
				components: Record<string, unknown>;
			};
			const templateMap: Record<string, string> = {}; // { oldId: newId }
			const componentMap: Record<string, string> = {}; // { oldId: newId }

			// A. Import Components first
			for (const [oldId, compData] of Object.entries(components)) {
				const cData = { ...(compData as Record<string, unknown>) };
				if (user) cData.created_by = user.id;
				const { data: newComp } = await supabase
					.from("custom_components")
					.insert(cData)
					.select()
					.single();
				if (newComp) componentMap[oldId] = newComp.id;
			}

			// B. Import Templates second, re-linking components
			for (const [oldId, tempData] of Object.entries(templates)) {
				const tData = { ...(tempData as any) };
				if (user) tData.created_by = user.id;
				if (
					tData.custom_component_id &&
					componentMap[tData.custom_component_id]
				) {
					tData.custom_component_id =
						componentMap[tData.custom_component_id];
				}
				const { data: newTemp } = await supabase
					.from("prompt_templates")
					.insert(tData)
					.select()
					.single();
				if (newTemp) templateMap[oldId] = newTemp.id;
			}

			// C. Re-link templates in orchestration steps
			importedAsset.steps = (importedAsset.steps as any[]).map(
				(step: any) => {
					if (
						step.prompt_template_id &&
						templateMap[step.prompt_template_id]
					) {
						step.prompt_template_id =
							templateMap[step.prompt_template_id];
					}
					return step;
				},
			);

			delete importedAsset.bundle;
		}

		// 4. Insert the final asset
		const { data: imported, error: importErr } = await supabase
			.from(targetTableName)
			.insert(importedAsset)
			.select()
			.single();

		if (importErr) throw importErr;

		// 5. Increment install count on Hub
		await supabase.rpc("increment_install_count", { asset_id: hubAssetId });

		return imported;
	},

	/**
	 * Star or unstar a Hub asset
	 */
	async toggleStar(hubAssetId: string) {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Authentication required to star assets");

		// Check if already starred
		const { data: existing } = await supabase
			.from("hub_stars")
			.select("*")
			.eq("asset_id", hubAssetId)
			.eq("user_id", user.id)
			.maybeSingle();

		if (existing) {
			// Unstar
			const { error } = await supabase
				.from("hub_stars")
				.delete()
				.eq("asset_id", hubAssetId)
				.eq("user_id", user.id);
			if (error) throw error;
			const { error: rpcErr } = await supabase.rpc(
				"decrement_star_count",
				{
					p_asset_id: hubAssetId,
				},
			);
			if (rpcErr) throw rpcErr;
			return false;
		} else {
			// Star
			const { error } = await supabase
				.from("hub_stars")
				.insert({ asset_id: hubAssetId, user_id: user.id });
			if (error) throw error;
			const { error: rpcErr } = await supabase.rpc(
				"increment_star_count",
				{
					p_asset_id: hubAssetId,
				},
			);
			if (rpcErr) throw rpcErr;
			return true;
		}
	},

	/**
	 * Check if the current user has starred a specific asset
	 */
	async checkIfStarred(assetId: string) {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return false;

		const { data } = await supabase
			.from("hub_stars")
			.select("asset_id")
			.eq("asset_id", assetId)
			.eq("user_id", user.id)
			.maybeSingle();

		return !!data;
	},

	/**
	 * Fetch a creator's public profile and stats
	 */
	async fetchCreatorProfile(userId: string) {
		// 1. Fetch assets by this creator
		const { data: assets, error: assetErr } = await supabase
			.from("hub_assets")
			.select("*")
			.eq("creator_id", userId)
			.eq("is_public", true)
			.eq("is_hidden", false)
			.order("created_at", { ascending: false });

		if (assetErr) throw assetErr;

		// 2. Fetch aggregate stats
		const totalInstalls = assets.reduce(
			(sum, a) => sum + (a.install_count || 0),
			0,
		);
		const totalStars = assets.reduce(
			(sum, a) => sum + (a.star_count || 0),
			0,
		);

		return {
			userId,
			assets: assets as HubAsset[],
			stats: {
				totalInstalls,
				totalStars,
				assetCount: assets.length,
			},
		};
	},

	/**
	 * Report a Hub asset for moderation
	 */
	async reportAsset(assetId: string, reason: string, details?: string) {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Authentication required to report assets");

		const { error } = await supabase.from("hub_reports").insert({
			asset_id: assetId,
			reporter_id: user.id,
			reason: reason,
			details: details,
		});

		if (error) throw error;
	},

	/**
	 * Count how many times an asset has been remixed
	 */
	async countRemixes(assetId: string) {
		const { count, error } = await supabase
			.from("hub_assets")
			.select("*", { count: "exact", head: true })
			.eq("parent_asset_id", assetId);

		if (error) throw error;
		return count || 0;
	},
};

// Helper for date in JS
class ColumnDate extends Date {}
