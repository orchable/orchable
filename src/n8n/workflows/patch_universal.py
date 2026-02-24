import json
import os

# Paths
PHASE5_JS_PATH = "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/n8n-gen/src/n8n/scripts/phase5_prepare_next_tasks.js"
BASE_WF = "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/n8n-gen/src/n8n/workflows/[Base] Base Agent with Key.json"
CONSOLIDATED_WF = "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/n8n-gen/src/n8n/workflows/[Base] Base Agent with Key - Consolidated.json"

def patch_file(path, metadata_node_names, gemini_node_names, phase5_node_names):
    if not os.path.exists(path):
        print(f"Skipping {path} (not found)")
        return None

    with open(PHASE5_JS_PATH, "r") as f:
        phase5_js = f.read()

    with open(path, "r") as f:
        wf = json.load(f)

    print(f"Patching: {path}")
    for node in wf.get("nodes", []):
        name = node.get("name")
        
        # 1. Metadata Preservation
        if name in metadata_node_names:
            print(f"  -> Patching Metadata Node: {name}")
            node["parameters"]["jsCode"] = """var finalResult = $json;
var taskInfo = $('JSON Parse').first().json; // Fallback for standard
if (!taskInfo || !taskInfo.supabase_task_id) {
    // Try Consolidated mappings if standard fails
    try { taskInfo = $('1. Parse Task').first().json; } catch(e) {}
}

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

return { 
  ...taskInfo,
  "result": finalResult,
  "extra": extra,
  "data": data,
  "supabase_task_id": taskInfo.supabase_task_id || taskInfo.id
};"""

        # 2. Gemini API Node (Reference fix)
        if name in gemini_node_names:
            print(f"  -> Patching Gemini Node: {name}")
            # Determine reference name (Final Result vs 2. Pre-Process)
            ref_node = "Final Result"
            if name == "Gemini API": ref_node = "2. Pre-Process" # Consolidated uses this
            
            node["parameters"]["jsonBody"] = f"""={{
  "contents": [
    {{
      "role": "user",
      "parts": [
        {{
          "text": {{{{ JSON.stringify($('{ref_node}').item.json.prompt) }}}}
        }}
      ]
    }}
  ],
  "generationConfig": {{{{ JSON.stringify($('{ref_node}').item.json.ai_settings.generationConfig || {{}}) }}}}
}}"""

        # 3. Phase 5 Node (Roadmap fix)
        if name in phase5_node_names:
            print(f"  -> Patching Phase 5 Node: {name}")
            node["parameters"]["jsCode"] = phase5_js

    return wf

def main():
    # Patch Standard
    wf_std = patch_file(BASE_WF, ["Add AlongWith Attributes"], ["Gemini API Call"], ["Determine Next Stage"])
    if wf_std:
        with open(BASE_WF, "w") as f:
            json.dump(wf_std, f, indent=2, ensure_ascii=False)

    # Patch Consolidated
    wf_con = patch_file(CONSOLIDATED_WF, ["3. Parse & Report"], ["Gemini API"], ["5. Prepare Next Tasks"])
    if wf_con:
        with open(CONSOLIDATED_WF, "w") as f:
            json.dump(wf_con, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main()
