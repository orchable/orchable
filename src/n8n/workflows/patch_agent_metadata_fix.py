import json
import os

# Paths
WORKFLOW_PATHS = [
    "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/workflows/[Base] Base Agent with Key.json",
    "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/workflows/[Base] Base Agent with Key - Consolidated.json"
]
PHASE5_JS_PATH = "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/scripts/phase5_prepare_next_tasks.js"

def patch_agent_workflow():
    # 1. Load the PHASE 5 JS
    with open(PHASE5_JS_PATH, "r") as f:
        phase5_js = f.read()

    patched_results = []
    for path in WORKFLOW_PATHS:
        if not os.path.exists(path):
            print(f"Skipping: {path} (not found)")
            continue
        
        print(f"Processing: {path}")
        # 2. Load the Workflow JSON
        with open(path, "r") as f:
            wf = json.load(f)

    # 3. Apply Fixes
    for node in wf.get("nodes", []):
        # FIX A: Add AlongWith Attributes (Metadata preservation)
        if node.get("name") == "Add AlongWith Attributes":
            print("Patching node: Add AlongWith Attributes")
            node["parameters"]["jsCode"] = """var finalResult = $json;
var taskInfo = $('JSON Parse').first().json; // Use parsed info
var extra = taskInfo.extra || {};
var data = taskInfo.data || {};
var returnAlongWith = (extra && extra["return-along-with"]) || [];

if (returnAlongWith.length > 0) { 
  for (var key of returnAlongWith) {
    if (data.hasOwnProperty(key)) {
        finalResult[key] = data[key];
    }
  }
}

// PRESERVE ALL METADATA FOR PHASE 5
return { 
  ...taskInfo,
  "result": finalResult,
  "extra": extra,
  "data": data,
  "supabase_task_id": taskInfo.supabase_task_id || taskInfo.id
};"""

        # FIX B: Gemini API Call (generationConfig reference)
        if node.get("name") == "Gemini API Call":
            print("Patching node: Gemini API Call")
            # Update jsonBody to use Final Result for everything
            node["parameters"]["jsonBody"] = """={
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": {{ JSON.stringify($('Final Result').item.json.prompt) }}
        }
      ]
    }
  ],
  "generationConfig": {{ JSON.stringify($('Final Result').item.json.ai_settings.generationConfig || {}) }}
}"""

        # FIX C: Phase 5 (recursive chaining)
        if node.get("name") == "Determine Next Stage":
            print("Patching node: Determine Next Stage")
            node["parameters"]["jsCode"] = phase5_js

        patched_results.append((path, wf))

    # 4. Save the patched workflow
    for path, wf in patched_results:
        with open(path, "w") as f:
            json.dump(wf, f, indent=2, ensure_ascii=False)
        print(f"Successfully patched workflow: {path}")

if __name__ == "__main__":
    patch_agent_workflow()
