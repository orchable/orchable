import json
import os

ST_WF_PATH = "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/workflows/[Base] Base Agent with Key.json"
CON_WF_PATH = "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/workflows/[Base] Base Agent with Key - Consolidated.json"

OLD_CODE_SNIPPET = "const nextConfigs = extra.next_stage_config || [];"
NEW_CODE_SNIPPET = """// Get next stage configs (hydrated roadmap from parent)
// Normalization: Ensure it's always an array
let nextConfigs = extra.next_stage_configs || [];
if (!Array.isArray(nextConfigs) && extra.next_stage_config) {
  nextConfigs = [extra.next_stage_config];
} else if (!Array.isArray(nextConfigs)) {
  nextConfigs = [];
}"""

def patch_workflow(file_path, node_name):
    print(f"Patching {file_path}...")
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        updated = False
        for node in data['nodes']:
            if node['name'] == node_name:
                js_code = node['parameters'].get('jsCode', '')
                if OLD_CODE_SNIPPET in js_code:
                    print(f"  Found target code in node '{node_name}'. Applying patch...")
                    new_js_code = js_code.replace(OLD_CODE_SNIPPET, NEW_CODE_SNIPPET)
                    node['parameters']['jsCode'] = new_js_code
                    updated = True
                elif "let nextConfigs = extra.next_stage_configs" in js_code:
                     print(f"  Node '{node_name}' already seems patched.")
                else:
                    print(f"  WARNING: Target snippet not found in node '{node_name}'.")
                    # Fallback: try finding the plural version if it was already changed partially or incorrectly
                    current_snippet_plural = "const nextConfigs = extra.next_stage_configs || [];"
                    if current_snippet_plural in js_code:
                         print(f"  Found plural version. Applying patch...")
                         new_js_code = js_code.replace(current_snippet_plural, NEW_CODE_SNIPPET)
                         node['parameters']['jsCode'] = new_js_code
                         updated = True
        
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
