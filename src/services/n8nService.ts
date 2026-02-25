const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL;


export const n8nService = {
  /**
   * Fetches list of workflows from n8n API
   */
  async listWorkflows(): Promise<{ id: string; name: string; active: boolean; tags: any[] }[]> {
      let baseUrl = localStorage.getItem("orchable_n8n_url") || N8N_BASE_URL;
      const apiKey = localStorage.getItem("orchable_n8n_api_key"); 

      if (!baseUrl || !apiKey) {
          throw new Error("Missing n8n configuration (URL or API Key)");
      }

      // Remove trailing slash if present
      baseUrl = baseUrl.replace(/\/$/, '');

      try {
        const response = await fetch(`${baseUrl}/api/v1/workflows`, {
            headers: {
                'X-N8N-API-KEY': apiKey
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("Invalid API Key or permissions");
            }
            throw new Error(`N8N API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.data.map((wf: any) => ({ 
            id: wf.id, 
            name: wf.name,
            active: wf.active,
            tags: wf.tags 
        }));
      } catch (error: any) {
        console.error("N8N List Error:", error);
        throw new Error(error.message || "Failed to connect to N8N (CORS or Network Error)");
      }
  },

  /**
   * Fetch workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<any> {
      const baseUrl = localStorage.getItem("orchable_n8n_url") || N8N_BASE_URL;
      const apiKey = localStorage.getItem("orchable_n8n_api_key");

      if (!baseUrl || !apiKey) throw new Error("Missing n8n config");

      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/workflows/${workflowId}`, {
          headers: { 'X-N8N-API-KEY': apiKey }
      });

      if (!response.ok) {
          if (response.status === 404) return null; // specific null for not found
          throw new Error(`Failed to fetch workflow: ${response.status}`);
      }

      return await response.json();
  },

  /**
   * Fetches full workflow details to extract webhook URL
   */
  async getWorkflowWebhook(workflowId: string): Promise<{ url: string; method: 'GET' | 'POST' } | null> {
      const baseUrl = localStorage.getItem("orchable_n8n_url") || N8N_BASE_URL;
      const apiKey = localStorage.getItem("orchable_n8n_api_key");

      if (!baseUrl || !apiKey) return null;

      const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
          headers: { 'X-N8N-API-KEY': apiKey }
      });

      if (!response.ok) return null;

      const data = await response.json();
      const nodes: any[] = data.nodes || [];
      
      // Find the webhook node
      const webhookNode = nodes.find(n => n.type === 'n8n-nodes-base.webhook');
      if (!webhookNode) return null;

      // Construct path
      const path = webhookNode.parameters?.path;
      if (!path) return null;

      // Extract Method (default to GET if not specified, though n8n usually has it)
      const method = (webhookNode.parameters?.httpMethod as 'GET' | 'POST') || 'GET';

      // Append to base URL (handle trailing slashes)
      const cleanBase = baseUrl.replace(/\/$/, '');
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      
      return {
          url: `${cleanBase}/webhook${cleanPath}`,
          method
      };
  },

  async triggerMasterWorkflow(data: {
    executionId: string;
    configId: string;
    syllabusRow: any;
    launchId?: string;
    batchId?: string;
  }): Promise<void> {
    const baseUrl = localStorage.getItem("orchable_n8n_url") || N8N_BASE_URL;

    // If no URL configured, warn and skip (or mock)
    if (!baseUrl) {
        console.warn('n8n Base URL is not configured (checked localStorage and VITE_N8N_BASE_URL). Skipping n8n trigger.');
        return;
    }

    // Check if we should use the legacy Master Workflow or the new Compiled Workflow
    // For now, we default to Compiled (using configId) as requested by user.
    // Spec: The compiler generates webhook with path = config.id
    
    // Legacy fallback (optional, can be toggled via settings if needed)
    const masterSlug = localStorage.getItem("orchable_n8n_master_slug");
    
    // If masterSlug is explicitly set AND it's not the default 'master-orchestrator', 
    // user might want to use it. But the new architecture favors configId.
    // Let's use configId as slug.
    const slug = data.configId; 
    
    const useTest = localStorage.getItem("orchable_n8n_use_test_webhook") === 'true';
    const pathPrefix = useTest ? 'webhook-test' : 'webhook';

    const response = await fetch(
      `${baseUrl}/${pathPrefix}/${slug}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error('n8n Trigger Error Body:', errorText);
      throw new Error(`n8n trigger failed (${response.status}): ${errorText || response.statusText}`);
    }
  },

  /**
   * Create a new workflow in n8n
   */
  async createWorkflow(workflowJson: any): Promise<any> {
      const baseUrl = localStorage.getItem("orchable_n8n_url") || N8N_BASE_URL;
      const apiKey = localStorage.getItem("orchable_n8n_api_key");
      
      if (!baseUrl || !apiKey) throw new Error("Missing n8n config");
      
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/workflows`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': apiKey
          },
          body: JSON.stringify(workflowJson)
      });
      
      if (!response.ok) {
           const err = await response.text();
           throw new Error(`Create Workflow Failed: ${err}`);
      }
      
      return await response.json();
  },

  /**
   * Update existing workflow
   */
  async updateWorkflow(id: string, workflowJson: any): Promise<any> {
      const baseUrl = localStorage.getItem("orchable_n8n_url") || N8N_BASE_URL;
      const apiKey = localStorage.getItem("orchable_n8n_api_key");

      if (!baseUrl || !apiKey) throw new Error("Missing n8n config");

      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/workflows/${id}`, {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': apiKey
          },
          body: JSON.stringify(workflowJson)
      });

      if (!response.ok) {
           const err = await response.text();
           throw new Error(`Update Workflow Failed: ${err}`);
      }

      return await response.json();
  },

  /**
   * Activate workflow
   */
  async activateWorkflow(id: string, active: boolean = true): Promise<any> {
    const baseUrl = localStorage.getItem("orchable_n8n_url") || N8N_BASE_URL;
    const apiKey = localStorage.getItem("orchable_n8n_api_key");

    if (!baseUrl || !apiKey) throw new Error("Missing n8n config");

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/workflows/${id}/activate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': apiKey
        },
        body: JSON.stringify({ active })
    });

    if (!response.ok) throw new Error("Failed to toggle activation");
    return await response.json();
  }
};

