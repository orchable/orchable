import json
import os

OLD_PATH = '/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/workflows/[Base] API Key Rotation Manager - OLD.json'
NEW_PATH = '/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/workflows/[Base] API Key Rotation Manager.json'
TARGET_PATH = '/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable/src/n8n/workflows/[Base] API Key Rotation Manager.json'

def merge_workflows():
    with open(OLD_PATH, 'r') as f:
        old_wf = json.load(f)
    with open(NEW_PATH, 'r') as f:
        new_wf = json.load(f)

    # 1. Extract Logic and Configs from New
    new_logic_map = {node['name']: node['parameters']['jsCode'] for node in new_wf['nodes'] if 'jsCode' in node['parameters']}
    new_configs = next(node['parameters']['jsonOutput'] for node in new_wf['nodes'] if node['name'] == 'CONFIGS')

    # 2. Add New Columns to Data Table Schemas in Old
    new_cols = [
        {"id": "remaining_requests", "displayName": "remaining_requests", "type": "number"},
        {"id": "remaining_tokens", "displayName": "remaining_tokens", "type": "number"},
        {"id": "quota_reset_requests_at", "displayName": "quota_reset_requests_at", "type": "string"},
        {"id": "quota_reset_tokens_at", "displayName": "quota_reset_tokens_at", "type": "string"},
        {"id": "last_quota_check_at", "displayName": "last_quota_check_at", "type": "string"},
        {"id": "retry_after", "displayName": "retry_after", "type": "number"}
    ]

    for node in old_wf['nodes']:
        # Update Logic
        if node['name'] in new_logic_map:
            node['parameters']['jsCode'] = new_logic_map[node['name']]
        
        # Update Configs
        if node['name'] == 'CONFIGS':
            node['parameters']['jsonOutput'] = new_configs
            
        # Update Data Table nodes
        if node['type'] == 'n8n-nodes-base.dataTable' and 'columns' in node['parameters']:
            cols = node['parameters']['columns']
            # Add to schema if not exists
            existing_ids = {c['id'] for c in cols['schema']}
            for nc in new_cols:
                if nc['id'] not in existing_ids:
                    # Create full schema object
                    full_nc = {
                        "id": nc["id"],
                        "displayName": nc["displayName"],
                        "required": False,
                        "defaultMatch": False,
                        "display": True,
                        "type": nc["type"],
                        "readOnly": False,
                        "removed": False
                    }
                    cols['schema'].append(full_nc)
            
            # Update value mapping for 'Update Health Status'
            if node['name'] == 'Update Health Status':
                for nc in new_cols:
                    if nc['id'] not in cols['value']:
                        cols['value'][nc['id']] = f"={{ $json.{nc['id']} }}"

    # 3. Structural Fixes: Remove invalid outputs from terminal nodes
    connections = old_wf['connections']
    terminal_nodes = [node['name'] for node in old_wf['nodes'] if node['type'] in ['n8n-nodes-base.respondToWebhook', 'n8n-nodes-base.stopAndError']]
    
    for t_node in terminal_nodes:
        if t_node in connections:
            print(f"Removing invalid outgoing connection from terminal node: {t_node}")
            del connections[t_node]

    # 4. Save
    with open(TARGET_PATH, 'w') as f:
        json.dump(old_wf, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully merged v2.0 logic into working structure: {TARGET_PATH}")

if __name__ == "__main__":
    merge_workflows()
