import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { configService } from "@/services/configService";
import { OrchestratorConfig, StepConfig } from "@/lib/types";
import { useTier } from "@/hooks/useTier";
import { useDesignerStore } from "@/stores/designerStore";
import { toast } from "sonner";
import { syncStagesToPromptTemplates } from "@/services/stageService";

export function useConfigs() {
	const { tier } = useTier();
	return useQuery({
		queryKey: ["configs", tier],
		queryFn: configService.listConfigs,
	});
}

export function useConfig(id: string) {
	return useQuery({
		queryKey: ["config", id],
		queryFn: () => configService.getConfig(id),
		enabled: !!id,
	});
}

export function useSaveConfig() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: configService.saveConfig,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["configs"] });
		},
	});
}

export function useUpdateConfig() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			updates,
		}: {
			id: string;
			updates: Partial<OrchestratorConfig>;
		}) => configService.updateConfig(id, updates),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["configs"] });
			queryClient.setQueryData(["config", data.id], data);
		},
	});
}

export function useDeleteConfig() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: configService.deleteConfig,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["configs"] });
		},
	});
}

// (imports moved to top of file)

export function useSaveOrchestrator() {
	const {
		nodes,
		edges,
		orchestratorName,
		orchestratorDescription,
		config: currentConfig,
		loadConfig,
	} = useDesignerStore();
	const saveConfig = useSaveConfig();
	const updateConfig = useUpdateConfig();

	const save = async () => {
		// Filter out Start Node
		const stepNodes = nodes.filter((n) => n.type === "stepNode");

		if (stepNodes.length === 0) {
			toast.error("Process must have at least one step");
			return false;
		}

		if (!orchestratorName) {
			toast.error("Orchestrator name is required");
			return false;
		}

		// Build steps array with ALL stage fields
		const steps = stepNodes.map((node) => {
			const data = node.data as unknown as StepConfig;
			return {
				// Identity
				id: node.id,
				name: data.name,
				label: data.label,

				// Stage-specific (new)
				stage_key:
					data.stage_key || data.name?.toLowerCase() || node.id,
				task_type: data.task_type || "",
				prompt_template_id: data.prompt_template_id || "",
				cardinality: data.cardinality || "1:1",

				// 1:N Split config
				split_path: data.split_path || "",
				split_mode: data.split_mode || "per_item",
				batch_size: data.batch_size,
				batch_grouping: data.batch_grouping || "global",
				merge_path: data.merge_path || "output_data",
				output_mapping: data.output_mapping || "result",
				return_along_with: data.return_along_with || [],

				// AI Settings
				ai_settings: data.ai_settings || {
					model_id: "gemini-2.0-flash",
					generationConfig: {
						temperature: 1.0,
						topP: 0.95,
						topK: 40,
						maxOutputTokens: 8192,
					},
				},

				// Execution config
				timeout: data.timeout || 300000,
				retryConfig: data.retryConfig || {
					maxRetries: 3,
					retryDelay: 5000,
				},

				// Layout
				position: node.position,

				// Dependencies
				dependsOn: edges
					.filter((e) => e.target === node.id)
					.map((e) => e.source)
					.filter((sourceId) => sourceId !== "start"),

				// Component & Sub-orchestration
				custom_component_id: data.custom_component_id,
				sub_orchestration_id: data.sub_orchestration_id,
				sub_orchestration_output_path:
					data.sub_orchestration_output_path,

				// Pre/Post Process Hooks
				pre_process: data.pre_process,
				post_process: data.post_process,

				// Input/Output Contract & Export
				contract: data.contract,
				export_config: data.export_config,

				// Approval flow
				requires_approval: data.requires_approval || false,
			};
		});

		try {
			let savedConfig;
			const { inputData, viewport } = useDesignerStore.getState();

			// Prepare input mapping for persistence
			// We store the structure (mode, mappings, selections) but NOT the actual raw JSON data to keep DB size manageable
			const inputMapping = {
				mode: inputData.mode,
				fileName: inputData.fileName,
				fieldSelection: inputData.fieldSelection,
				fieldMapping: inputData.fieldMapping,
				selectedTaskIndices: inputData.selectedTaskIndices,
			};

			const payload = {
				name: orchestratorName,
				description: orchestratorDescription,
				viewport,
				steps,
				input_mapping: inputMapping,
				execution_delay_seconds: inputData.execution_delay_seconds,
			};

			// 1. Save to Supabase (Create or Update)
			if (currentConfig?.id) {
				savedConfig = await updateConfig.mutateAsync({
					id: currentConfig.id,
					updates: payload,
				});
			} else {
				savedConfig = await saveConfig.mutateAsync(payload);
				loadConfig(savedConfig);
			}

			// 2. Sync stages to prompt_templates
			try {
				const templateIdMap = await syncStagesToPromptTemplates(
					savedConfig.id,
					savedConfig.name,
					steps,
					edges,
				);

				// Update local nodes with the generated prompt_template_ids
				const updateStepData =
					useDesignerStore.getState().updateStepData;
				templateIdMap.forEach((generatedId, stageId) => {
					updateStepData(stageId, {
						prompt_template_id: generatedId,
					});
					// ALSO update the step in savedConfig so it's fresh
					const stepToUpdate = (
						savedConfig.steps as StepConfig[]
					).find((s) => s.id === stageId);
					if (stepToUpdate)
						stepToUpdate.prompt_template_id = generatedId;
				});

				// IMPORTANT: We MUST save one more time to persist these generated IDs back to the orchestrator config
				// otherwise the execution engine (Run button) will try to use the old/guessed IDs and fail FK constraints
				await updateConfig.mutateAsync({
					id: savedConfig.id,
					updates: {
						steps: savedConfig.steps,
					},
				});

				console.log(
					"Synced templates:",
					Object.fromEntries(templateIdMap),
				);
				toast.success(
					`${currentConfig?.id ? "Updated" : "Saved"} configuration (${templateIdMap.size} stages synced)`,
				);
			} catch (syncError: unknown) {
				console.error("Failed to sync stage templates:", syncError);
				const errorMsg =
					syncError instanceof Error
						? syncError.message
						: typeof syncError === "object"
							? JSON.stringify(syncError)
							: String(syncError);
				toast.warning(
					`Config saved, but template sync failed: ${errorMsg}`,
				);
			}

			// Update the local designer store so the UI is correctly aware of the new database state
			useDesignerStore.setState({ config: savedConfig });

			// NOTE: n8n workflow compilation removed
			// The universal agent will read from prompt_templates at runtime

			return true;
		} catch (error) {
			console.error("Failed to save", error);
			toast.error("Failed to save configuration");
			throw error;
		}
	};

	return {
		save,
		isPending: saveConfig.isPending || updateConfig.isPending,
	};
}
