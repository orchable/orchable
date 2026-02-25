---
sidebar_position: 4
title: Troubleshooting
---

# 🔍 Workflow Troubleshooting & Fixes

This document records identified issues within n8n workflows and their corresponding resolutions.

---

## 1. common n8n Issues

### 🔴 Incorrect API Keys
- **Symptoms**: `403 Forbidden` or `Permission Denied` when updating Supabase from n8n.
- **Cause**: Using an `anon` key instead of a `service_role` key in the ENV node.
- **Fix**: Replace the key in the workflow ENV node with a genuine `service_role` key from the Supabase Dashboard.

### 🟡 Missing Error Handling
- **Symptoms**: Tasks stuck in `processing` indefinitely if the AI call fails.
- **Cause**: Workflow only handles successful (`generated`) states.
- **Fix**: Add a failure branch to catch API errors and update the task status to `failed` with a descriptive error message.

---

## 2. Key Differentiation
Always verify keys at [jwt.io](https://jwt.io):
- **Anon Key**: `"role": "anon"`
- **Service Role Key**: `"role": "service_role"`

---

## 3. Post-Fix Verification
After updating a workflow, perform these steps:

1. **Dry Run**: Use the `upload_tasks_to_supabase.py` script with the `--dry-run` flag.
2. **Batch Check**: Confirm `task_batches` counters are incrementing correctly.
3. **Manual Trigger**: Run the n8n "Load Batch" workflow manually and inspect the execution log for status transitions.

---

## 4. Environment Checklist

| Variable | Target Role |
|:---|:---|
| `SUPABASE_URL` | Endpoint URI |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` |
| `SUPABASE_ANON_KEY` | `anon` |

*Last Updated: 2026-02-24*
