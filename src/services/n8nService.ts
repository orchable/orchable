const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL;

export const n8nService = {
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
    
    // n8n handles async, no need to wait for full completion
  }
};
