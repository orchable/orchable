import json
import os

ST_WF_PATH = "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/workflows/[Base] Base Agent with Key.json"
CON_WF_PATH = "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/workflows/[Base] Base Agent with Key - Consolidated.json"

# The incorrect logic I just applied
BAD_SNIPPET = """// Get next stage configs (hydrated roadmap from parent)
// Normalization: Ensure it's always an array
let nextConfigs = extra.next_stage_configs || [];
if (!Array.isArray(nextConfigs) && extra.next_stage_config) {
  nextConfigs = [extra.next_stage_config];
} else if (!Array.isArray(nextConfigs)) {
  nextConfigs = [];
}"""

# The corrected logic
GOOD_SNIPPET = """// Get next stage configs (hydrated roadmap from parent)
// Normalization: Ensure it's always an array
let nextConfigs = extra.next_stage_configs || extra.next_stage_config || [];
if (!Array.isArray(nextConfigs)) {
  nextConfigs = [nextConfigs];
}"""

def patch_workflow(file_path, node_name):
    print(f"Re-patching {file_path}...")
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        updated = False
        for node in data['nodes']:
            if node['name'] == node_name:
                js_code = node['parameters'].get('jsCode', '')
                if BAD_SNIPPET in js_code:
                    print(f"  Found flawed logic in node '{node_name}'. Applying fix...")
                    new_js_code = js_code.replace(BAD_SNIPPET, GOOD_SNIPPET)
                    node['parameters']['jsCode'] = new_js_code
                    updated = True
                else:
                    print(f"  WARNING: Flawed snippet not found exactly in node '{node_name}'.")
                    # Debug print to see what's there
                    # print(f"Current content:\n{js_code}")
        
        if updated:
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            print("  Successfully saved.")
        else:
            print("  No changes made.")

    except Exception as e:
        print(f"  Error: {e}")

if __name__ == "__main__":
    patch_workflow(ST_WF_PATH, "Determine Next Stage")
    patch_workflow(CON_WF_PATH, "5. Prepare Next Tasks")
