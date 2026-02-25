---
sidebar_position: 4
title: Gemini Free Tier Guide
---

# 🆓 Gemini API Free Tier Guide

Google's Gemini API Free Tier is surprisingly powerful. With the right fallback strategy, smart use of the Thinking system, and model selection, a single API key can handle serious workloads at zero cost.

---

## 1. Quota System (RPM / TPM / RPD)

| Dimension | Full Name | Description |
|---|---|---|
| **RPM** | Requests Per Minute | Number of API calls per 60 seconds |
| **TPM** | Tokens Per Minute | Total tokens (in + out) per 60 seconds |
| **RPD** | Requests Per Day | Total API calls per 24 hours (PST) |

> [!IMPORTANT]
> All three limits apply simultaneously. Exceeding **any** one triggers a 429 error.

---

## 2. Text Models at a Glance

| Model | RPM | TPM | RPD | Best For |
|---|---|---|---|---|
| **Gemini 3 Flash** | 5 | 250K | 20 | Reasoning, Planning, Coding |
| **Gemini 2.5 Flash** | 5 | 250K | 20 | Heavy Analysis, Content Gen |
| **Gemini 2.5 Flash Lite** | 10 | 250K | 20 | Classification, Routing |
| **Gemma 3 27B** | 30 | 15K | 14.4K | Simple Extraction, Local Fallback |

---

## 3. The Thinking System

Gemini allows "Thinking" before generating a response. Use it wisely to save quota.

- **High Thinking**: Use for Planners, Complex Reasoning.
- **Minimal/Zero Thinking**: Use for Classification, Formatting, Simple Logic.

> [!TIP]
> Gemini 3 Flash defaults to `high`. Manually set it to `minimal` for routine tasks to save significant token quota.

---

## 4. Fallback Strategy
Multiply your throughput by chaining models:
1. **Gemini 3 Flash** (Primary)
2. **Gemini 2.5 Flash** (Reasoning fallback)
3. **Gemini 2.5 Flash Lite** (High-volume fallback)
4. **Gemma 3 27B** (Volume fallback)

---

## 5. Deployment Checklist
- [ ] Map stages to specific models.
- [ ] Set `thinkingLevel` explicitly for every call.
- [ ] Implement exponential backoff for 429s.
- [ ] Log RPD consumption and alert at 80%.

*Last Updated: 2026-02-24*
