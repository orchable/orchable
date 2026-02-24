import json
import os

FILES = [
    "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/n8n-gen/src/n8n/workflows/[Base] Base Agent with Key.json",
    "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/n8n-gen/src/n8n/workflows/[Base] Base Agent with Key - Consolidated.json"
]

TARGET_DUP = "// Get next stage configs (hydrated roadmap from parent)\n// Get next stage configs (hydrated roadmap from parent)"
REPLACEMENT = "// Get next stage configs (hydrated roadmap from parent)"

def clean_file(file_path):
    print(f"Cleaning {file_path}...")
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        updated = False
        for node in data['nodes']:
            js_code = node['parameters'].get('jsCode', '')
            if TARGET_DUP in js_code:
                print(f"  Found duplicate comment in node '{node['name']}'. Cleaning...")
                new_js_code = js_code.replace(TARGET_DUP, REPLACEMENT)
                node['parameters']['jsCode'] = new_js_code
                updated = True
        
        if updated:
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            print("  Successfully saved.")
        else:
            print("  No duplicates found.")

    except Exception as e:
        print(f"  Error: {e}")

if __name__ == "__main__":
    for f in FILES:
        clean_file(f)
