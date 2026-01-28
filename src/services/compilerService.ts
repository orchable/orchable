import { OrchestratorConfig, StepConfig } from '@/lib/types';

// Types for n8n Workflow JSON
// (Simplified structure based on n8n export)
export interface IN8nNode {
    parameters: Record<string, any>;
    name: string;
    type: string;
    typeVersion: number;
    position: number[];
    id?: string;
    webhookId?: string;
}

export interface IN8nConnection {
    node: string;
    type: string;
    index: number;
}

export interface IN8nConnections {
    [nodeName: string]: {
        main: IN8nConnection[][];
    };
}

export interface IN8nWorkflowJSON {
    name: string;
    nodes: IN8nNode[];
    connections: IN8nConnections;
    meta?: any;
}

export const compilerService = {
    compile(config: OrchestratorConfig): IN8nWorkflowJSON {
        const nodes: IN8nNode[] = [];
        const connections: IN8nConnections = {};

        // 1. Create Webhook Trigger
        const webhookName = 'Webhook';
        nodes.push({
            parameters: {
                path: config.id, // Use Config ID as the webhook path
                httpMethod: 'POST',
                options: {}
            },
            name: webhookName,
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [0, 0]
        });

        // 2. Map Steps to Nodes
        // We need to calculate positions.
        // Simple strategy: Topological sort or Levels.
        // For now, let's just use levels based on dependencies.
        
        const contentNodes: StepConfig[] = config.steps;
        const nodeLevels: Map<string, number> = new Map();
        
        // Calculate levels
        // Initialize 0 for nodes with no internal dependencies (depends only on Webhook implicitly)
        // Wait, 'dependsOn' refers to other steps. If empty, it depends on Start (Webhook).
        
        // Helper to get level
        const getLevel = (stepId: string, visited = new Set<string>()): number => {
            if (visited.has(stepId)) return 0; // Circular protection
            visited.add(stepId);
            
            const step = contentNodes.find(s => s.id === stepId);
            if (!step || !step.dependsOn || step.dependsOn.length === 0) return 1;
            
            let maxParentLevel = 0;
            for (const parentId of step.dependsOn) {
                maxParentLevel = Math.max(maxParentLevel, getLevel(parentId, new Set(visited)));
            }
            return maxParentLevel + 1;
        };

        const stepToNodeName = (stepId: string) => {
            const s = contentNodes.find(x => x.id === stepId);
            return s ? `Step ${s.name} - ${s.label.substring(0, 20)}` : stepId;
        };

        // Create Payload Injector (Optional, but good for standardization)
        // Actually, Webhook body is passed automatically to first nodes.

        contentNodes.forEach((step, index) => {
            const level = getLevel(step.id);
            const x = level * 300;
            // Spread Y to avoid collision. Simple: index * 100? 
            // Better: group by level and spread.
            const y = (index % 5) * 150; 

            const nodeName = stepToNodeName(step.id);

            // Decide Node Type: Execute Workflow vs HTTP Request
            if (step.n8nWorkflowId) {
                // Use Execute Workflow
                nodes.push({
                    parameters: {
                        workflowId: step.n8nWorkflowId,
                        mode: 'each' // Run for each item
                    },
                    name: nodeName,
                    type: 'n8n-nodes-base.executeWorkflow',
                    typeVersion: 1,
                    position: [x, y]
                });
            } else {
                // Fallback: HTTP Request
                nodes.push({
                    parameters: {
                        requestMethod: step.webhookMethod || 'POST',
                        url: step.webhookUrl,
                        options: {},
                        jsonParameters: true, // Send inputs as JSON
                    },
                    name: nodeName,
                    type: 'n8n-nodes-base.httpRequest',
                    typeVersion: 4.1, // Modern version
                    position: [x, y]
                });
            }

            // Create Connections
            // If dependsOn is empty, connect to Webhook
            const parents = step.dependsOn && step.dependsOn.length > 0 
                ? step.dependsOn 
                : [webhookName]; // Marker for 'Start'

            parents.forEach(parentId => {
                const parentName = parentId === webhookName ? webhookName : stepToNodeName(parentId);
                
                if (!connections[parentName]) {
                    connections[parentName] = { main: [] };
                }
                
                // Add connection
                // n8n structure: main: [ [ { node: 'Target', type: 'main', index: 0 } ] ]
                // It supports multiple outputs, we assume index 0 (Success)
                let outputIndex = 0;
                
                // Ensure array exists for this output index
                if (!connections[parentName].main[outputIndex]) {
                    connections[parentName].main[outputIndex] = [];
                }
                
                connections[parentName].main[outputIndex].push({
                    node: nodeName,
                    type: 'main',
                    index: 0
                });
            });
        });

        // 3. Add Final Response Node (Optional but good for debugging)
        // Find leaf nodes (no one depends on them)
        const allParentIds = new Set<string>();
        contentNodes.forEach(s => s.dependsOn.forEach(d => allParentIds.add(d)));
        
        const leafSteps = contentNodes.filter(s => !allParentIds.has(s.id));
        
        // Connect leaf nodes to a 'Done' node
        const doneNodeName = 'End / Respond';
        const maxLevel = Math.max(...contentNodes.map(s => getLevel(s.id)));
        
        nodes.push({
            parameters: {
                respondWith: 'allIncomingItems',
                options: {}
            },
            name: doneNodeName,
            type: 'n8n-nodes-base.respondToWebhook',
            typeVersion: 1,
            position: [(maxLevel + 1) * 300, 0]
        });
        
        // Connect leaves to Done
        leafSteps.forEach(step => {
             const nodeName = stepToNodeName(step.id);
             if (!connections[nodeName]) connections[nodeName] = { main: [] };
             if (!connections[nodeName].main[0]) connections[nodeName].main[0] = [];
             
             connections[nodeName].main[0].push({
                 node: doneNodeName,
                 type: 'main',
                 index: 0
             });
        });

        return {
            name: `[Orchestrator] ${config.name}`,
            nodes,
            connections
        };
    }
};
