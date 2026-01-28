const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL;


export const n8nService = {
  /**
   * Fetches list of workflows from n8n API
   */
  async listWorkflows(): Promise<{ id: string; name: string }[]> {
      let baseUrl = localStorage.getItem("lovable_n8n_url") || N8N_BASE_URL;
      const apiKey = localStorage.getItem("lovable_n8n_api_key"); 

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
        return data.data.map((wf: any) => ({ id: wf.id, name: wf.name }));
      } catch (error: any) {
        console.error("N8N List Error:", error);
        throw new Error(error.message || "Failed to connect to N8N (CORS or Network Error)");
      }
  },

  /**
   * Fetches full workflow details to extract webhook URL
   */
  async getWorkflowWebhook(workflowId: string): Promise<string | null> {
      const baseUrl = localStorage.getItem("lovable_n8n_url") || N8N_BASE_URL;
      const apiKey = localStorage.getItem("lovable_n8n_api_key");

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

      // Construct path (assuming POST method by default or check node parameters)
      const path = webhookNode.parameters?.path;
      if (!path) return null;

      // Append to base URL (handle trailing slashes)
      const cleanBase = baseUrl.replace(/\/$/, '');
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      
      return `${cleanBase}/webhook${cleanPath}`;
  },

  async triggerMasterWorkflow(data: {
    executionId: string;
    configId: string;
    syllabusRow: any;
  }): Promise<void> {
    const baseUrl = localStorage.getItem("lovable_n8n_url") || N8N_BASE_URL;

    // If no URL configured, warn and skip (or mock)
    if (!baseUrl) {
        console.warn('n8n Base URL is not configured (checked localStorage and VITE_N8N_BASE_URL). Skipping n8n trigger.');
        return;
    }

    const response = await fetch(
      `${baseUrl}/webhook/master-orchestrator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
    
    if (!response.ok) {
      throw new Error(`n8n trigger failed: ${response.statusText}`);
    }
  }
};

