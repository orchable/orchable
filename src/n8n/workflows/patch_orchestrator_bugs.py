import json
import os

ST_WF_PATH = "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/workflows/[Base] Base Agent with Key.json"
SCRIPT_PATH = "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/scripts/phase5_prepare_next_tasks.js"

# --- FIX 1: Standard Agent Workflow (Singular -> Plural Output) ---
# Target: "next_stage_config: grandChildConfigs," -> "next_stage_configs: grandChildConfigs,"
BUG_1_TARGET = "next_stage_config: grandChildConfigs,"
BUG_1_REPLACEMENT = "next_stage_configs: grandChildConfigs,"

# --- FIX 2: Standalone Script (Missing Normalization) ---
# Target: "const nextConfigs = extra.next_stage_configs || [];"
# Replacement: robust normalization
BUG_2_TARGET = "const nextConfigs = extra.next_stage_configs || [];"
BUG_2_REPLACEMENT = """// Get next stage configs (hydrated roadmap from parent)
// Normalization: Ensure it's always an array
let nextConfigs = extra.next_stage_configs || extra.next_stage_config || [];
if (!Array.isArray(nextConfigs)) {
  nextConfigs = [nextConfigs];
}"""

def patch_file_content(file_path, target, replacement, description):
    print(f"Applying {description} to {file_path}...")
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        if target in content:
            new_content = content.replace(target, replacement)
            with open(file_path, 'w') as f:
                f.write(new_content)
            print("  Successfully patched.")
            return True
        else:
            print(f"  WARNING: Target string not found.\n  Target: '{target}'")
            return False

    except Exception as e:
        print(f"  Error: {e}")
        return False

def patch_json_workflow(file_path, node_name, target, replacement):
    print(f"Patching JSON Workflow {file_path}...")
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        updated = False
        for node in data['nodes']:
            if node['name'] == node_name:
                js_code = node['parameters'].get('jsCode', '')
                if target in js_code:
                    print(f"  Found target in node '{node_name}'. Patching...")
                    new_js_code = js_code.replace(target, replacement)
                    node['parameters']['jsCode'] = new_js_code
                    updated = True
                else:
                    print(f"  WARNING: Target not found in node '{node_name}'.")
        
        if updated:
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            print("  Successfully saved JSON.")
        else:
            print("  No changes made to JSON.")

    except Exception as e:
        print(f"  Error: {e}")

if __name__ == "__main__":
    # Fix 1: Workflow JSON
    patch_json_workflow(ST_WF_PATH, "Determine Next Stage", BUG_1_TARGET, BUG_1_REPLACEMENT)
    
    # Fix 2: Standalone JS Script
    patch_file_content(SCRIPT_PATH, BUG_2_TARGET, BUG_2_REPLACEMENT, "Fix 2: Missing Normalization")
