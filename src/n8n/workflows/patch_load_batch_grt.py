import json
import os

# Paths
WORKFLOW_PATH = "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/workflows/[Base] Load Batch - Supabase to n8n.json"
TRANSFORM_JS_PATH = "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/scripts/load_batch_transform.js"

def patch_load_batch():
    if not os.path.exists(WORKFLOW_PATH):
        print(f"Error: {WORKFLOW_PATH} not found.")
        return

    # 1. Load the Transform JS
    with open(TRANSFORM_JS_PATH, "r") as f:
        transform_js = f.read()

    # 2. Load the Workflow JSON
    with open(WORKFLOW_PATH, "r") as f:
        wf = json.load(f)

    # 3. Find and patch the node
    found = False
    for node in wf.get("nodes", []):
        if node.get("name") == "Transform for n8n Table":
            print(f"Patching node: {node['name']}")
            node["parameters"]["jsCode"] = transform_js
            found = True
            break
    
    if not found:
        print("Error: Node 'Transform for n8n Table' not found in workflow.")
        return

    # 4. Save
    with open(WORKFLOW_PATH, "w") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False)
    
    print("Successfully patched Load Batch workflow.")

if __name__ == "__main__":
    patch_load_batch()
