# Gemini Model Guide

```json
[
  {
    "name": "Gemini 3 Pro Preview",
    "model_code": "gemini-3-pro-preview",
    "category": "Gemini 3 Pro",
    "tagline": "Our most powerful agentic and vibe-coding model, state-of-the-art reasoning",
    "supported_inputs": ["Text", "Image", "Video", "Audio", "PDF"],
    "supported_outputs": ["Text"],
    "token_limits": {
      "input": 1048576,
      "output": 65536
    },
    "capabilities": {
      "audio_generation": false,
      "batch_api": true,
      "caching": true,
      "code_execution": true,
      "file_search": true,
      "function_calling": true,
      "grounding_with_google_maps": false,
      "image_generation": false,
      "live_api": false,
      "search_grounding": true,
      "structured_outputs": true,
      "thinking": true,
      "url_context": true
    },
    "versions": {
      "preview": ["gemini-3-pro-preview"]
    },
    "latest_update": "November 2025",
    "knowledge_cutoff": "January 2025"
  },
  {
    "name": "Gemini 3 Pro Image Preview",
    "model_code": "gemini-3-pro-image-preview",
    "category": "Gemini 3 Pro",
    "tagline": "Multimodal image+text input and output with thinking support",
    "supported_inputs": ["Image", "Text"],
    "supported_outputs": ["Image", "Text"],
    "token_limits": {
      "input": 65536,
      "output": 32768
    },
    "capabilities": {
      "audio_generation": false,
      "batch_api": true,
      "caching": false,
      "code_execution": false,
      "file_search": false,
      "function_calling": false,
      "grounding_with_google_maps": false,
      "image_generation": true,
      "live_api": false,
      "search_grounding": true,
      "structured_outputs": true,
      "thinking": true,
      "url_context": false
    },
    "versions": {
      "preview": ["gemini-3-pro-image-preview"]
    },
    "latest_update": "November 2025",
    "knowledge_cutoff": "January 2025"
  },
  {
    "name": "Gemini 3 Flash Preview",
    "model_code": "gemini-3-flash-preview",
    "category": "Gemini 3 Flash",
    "tagline": "Most balanced model built for speed, scale, and frontier intelligence",
    "supported_inputs": ["Text", "Image", "Video", "Audio", "PDF"],
    "supported_outputs": ["Text"],
    "token_limits": {
      "input": 1048576,
      "output": 65536
    },
    "capabilities": {
      "audio_generation": false,
      "batch_api": true,
      "caching": true,
      "code_execution": true,
      "file_search": true,
      "function_calling": true,
      "grounding_with_google_maps": false,
      "image_generation": false,
      "live_api": false,
      "search_grounding": true,
      "structured_outputs": true,
      "thinking": true,
      "url_context": true
    },
    "versions": {
      "preview": ["gemini-3-flash-preview"]
    },
    "latest_update": "December 2025",
    "knowledge_cutoff": "January 2025"
  },
  {
    "name": "Gemini 2.5 Flash",
    "model_code": "gemini-2.5-flash",
    "category": "Gemini 2.5 Flash",
    "tagline": "Best price-performance model, ideal for large scale, low-latency, and agentic tasks",
    "supported_inputs": ["Text", "Image", "Video", "Audio"],
    "supported_outputs": ["Text"],
    "token_limits": {
      "input": 1048576,
      "output": 65536
    },
    "capabilities": {
      "audio_generation": false,
      "batch_api": true,
      "caching": true,
      "code_execution": true,
      "file_search": true,
      "function_calling": true,
      "grounding_with_google_maps": true,
      "image_generation": false,
      "live_api": false,
      "search_grounding": true,
      "structured_outputs": true,
      "thinking": true,
      "url_context": true
    },
    "versions": {
      "stable": ["gemini-2.5-flash"]
    },
    "latest_update": "June 2025",
    "knowledge_cutoff": "January 2025"
  },
  {
    "name": "Gemini 2.5 Flash Preview",
    "model_code": "gemini-2.5-flash-preview-09-2025",
    "category": "Gemini 2.5 Flash",
    "tagline": "Preview version of Gemini 2.5 Flash",
    "supported_inputs": ["Text", "Image", "Video", "Audio"],
    "supported_outputs": ["Text"],
    "token_limits": {
      "input": 1048576,
      "output": 65536
    },
    "capabilities": {
      "audio_generation": false,
      "batch_api": true,
      "caching": true,
      "code_execution": true,
      "file_search": true,
      "function_calling": true,
      "grounding_with_google_maps": false,
      "image_generation": false,
      "live_api": false,
      "search_grounding": true,
      "structured_outputs": true,
      "thinking": true,
      "url_context": true
    },
    "versions": {
      "preview": ["gemini-2.5-flash-preview-09-2025"]
    },
    "latest_update": "September 2025",
    "knowledge_cutoff": "January 2025"
  },
  {
    "name": "Gemini 2.5 Flash Image",
    "model_code": "gemini-2.5-flash-image",
    "category": "Gemini 2.5 Flash",
    "tagline": "Image generation variant of Gemini 2.5 Flash",
    "supported_inputs": ["Image", "Text"],
    "supported_outputs": ["Image", "Text"],
    "token_limits": {
      "input": 65536,
      "output": 32768
    },
    "capabilities": {
      "audio_generation": false,
      "batch_api": true,
      "caching": true,
      "code_execution": false,
      "file_search": false,
      "function_calling": false,
      "grounding_with_google_maps": false,
      "image_generation": true,
      "live_api": false,
      "search_grounding": false,
      "structured_outputs": true,
      "thinking": false,
      "url_context": false
    },
    "versions": {
      "stable": ["gemini-2.5-flash-image"],
      "deprecated": ["gemini-2.5-flash-image-preview"]
    },
    "latest_update": "October 2025",
    "knowledge_cutoff": "June 2025"
  },
  {
    "name": "Gemini 2.5 Flash Live",
    "model_code": "gemini-2.5-flash-native-audio-preview-12-2025",
    "category": "Gemini 2.5 Flash",
    "tagline": "Live audio/video interaction with real-time streaming support",
    "supported_inputs": ["Audio", "Video", "Text"],
    "supported_outputs": ["Audio", "Text"],
    "token_limits": {
      "input": 131072,
      "output": 8192
    },
    "capabilities": {
      "audio_generation": true,
      "batch_api": false,
      "caching": false,
      "code_execution": false,
      "file_search": false,
      "function_calling": true,
      "grounding_with_google_maps": false,
      "image_generation": false,
      "live_api": true,
      "search_grounding": true,
      "structured_outputs": false,
      "thinking": true,
      "url_context": false
    },
    "versions": {
      "preview": [
        "gemini-2.5-flash-native-audio-preview-12-2025",
        "gemini-2.5-flash-native-audio-preview-09-2025"
      ]
    },
    "latest_update": "September 2025",
    "knowledge_cutoff": "January 2025"
  },
  {
    "name": "Gemini 2.5 Flash TTS",
    "model_code": "gemini-2.5-flash-preview-tts",
    "category": "Gemini 2.5 Flash",
    "tagline": "Text-to-speech generation model",
    "supported_inputs": ["Text"],
    "supported_outputs": ["Audio"],
    "token_limits": {
      "input": 8192,
      "output": 16384
    },
    "capabilities": {
      "audio_generation": true,
      "batch_api": true,
      "caching": false,
      "code_execution": false,
      "file_search": false,
      "function_calling": false,
      "grounding_with_google_maps": false,
      "image_generation": false,
      "live_api": false,
      "search_grounding": false,
      "structured_outputs": false,
      "thinking": false,
      "url_context": false
    },
    "versions": {
      "preview": ["gemini-2.5-flash-preview-tts"]
    },
    "latest_update": "December 2025",
    "knowledge_cutoff": null
  },
  {
    "name": "Gemini 2.5 Flash-Lite",
    "model_code": "gemini-2.5-flash-lite",
    "category": "Gemini 2.5 Flash-Lite",
    "tagline": "Fastest flash model optimized for cost-efficiency and high throughput",
    "supported_inputs": ["Text", "Image", "Video", "Audio", "PDF"],
    "supported_outputs": ["Text"],
    "token_limits": {
      "input": 1048576,
      "output": 65536
    },
    "capabilities": {
      "audio_generation": false,
      "batch_api": true,
      "caching": true,
      "code_execution": true,
      "file_search": true,
      "function_calling": true,
      "grounding_with_google_maps": true,
      "image_generation": false,
      "live_api": false,
      "search_grounding": true,
      "structured_outputs": true,
      "thinking": true,
      "url_context": true
    },
    "versions": {
      "stable": ["gemini-2.5-flash-lite"]
    },
    "latest_update": "July 2025",
    "knowledge_cutoff": "January 2025"
  },
  {
    "name": "Gemini 2.5 Flash-Lite Preview",
    "model_code": "gemini-2.5-flash-lite-preview-09-2025",
    "category": "Gemini 2.5 Flash-Lite",
    "tagline": "Preview version of Gemini 2.5 Flash-Lite",
    "supported_inputs": ["Text", "Image", "Video", "Audio", "PDF"],
    "supported_outputs": ["Text"],
    "token_limits": {
      "input": 1048576,
      "output": 65536
    },
    "capabilities": {
      "audio_generation": false,
      "batch_api": true,
      "caching": true,
      "code_execution": true,
      "file_search": true,
      "function_calling": true,
      "grounding_with_google_maps": false,
      "image_generation": false,
      "live_api": false,
      "search_grounding": true,
      "structured_outputs": true,
      "thinking": true,
      "url_context": true
    },
    "versions": {
      "preview": ["gemini-2.5-flash-lite-preview-09-2025"]
    },
    "latest_update": "September 2025",
    "knowledge_cutoff": "January 2025"
  },
  {
    "name": "Gemini 2.5 Pro",
    "model_code": "gemini-2.5-pro",
    "category": "Gemini 2.5 Pro",
    "tagline": "State-of-the-art thinking model for complex code, math, STEM, and long context analysis",
    "supported_inputs": ["Audio", "Image", "Video", "Text", "PDF"],
    "supported_outputs": ["Text"],
    "token_limits": {
      "input": 1048576,
      "output": 65536
    },
    "capabilities": {
      "audio_generation": false,
      "batch_api": true,
      "caching": true,
      "code_execution": true,
      "file_search": true,
      "function_calling": true,
      "grounding_with_google_maps": true,
      "image_generation": false,
      "live_api": false,
      "search_grounding": true,
      "structured_outputs": true,
      "thinking": true,
      "url_context": true
    },
    "versions": {
      "stable": ["gemini-2.5-pro"]
    },
    "latest_update": "June 2025",
    "knowledge_cutoff": "January 2025"
  },
  {
    "name": "Gemini 2.5 Pro TTS",
    "model_code": "gemini-2.5-pro-preview-tts",
    "category": "Gemini 2.5 Pro",
    "tagline": "Pro-grade text-to-speech generation model",
    "supported_inputs": ["Text"],
    "supported_outputs": ["Audio"],
    "token_limits": {
      "input": 8192,
      "output": 16384
    },
    "capabilities": {
      "audio_generation": true,
      "batch_api": true,
      "caching": false,
      "code_execution": false,
      "file_search": false,
      "function_calling": false,
      "grounding_with_google_maps": false,
      "image_generation": false,
      "live_api": false,
      "search_grounding": false,
      "structured_outputs": false,
      "thinking": false,
      "url_context": false
    },
    "versions": {
      "preview": ["gemini-2.5-pro-preview-tts"]
    },
    "latest_update": "December 2025",
    "knowledge_cutoff": null
  },
  {
    "name": "Gemini 2.0 Flash",
    "model_code": "gemini-2.0-flash",
    "category": "Gemini 2.0 Flash",
    "tagline": "Second generation workhorse model with 1M token context window",
    "supported_inputs": ["Audio", "Image", "Video", "Text"],
    "supported_outputs": ["Text"],
    "token_limits": {
      "input": 1048576,
      "output": 8192
    },
    "capabilities": {
      "audio_generation": false,
      "batch_api": true,
      "caching": true,
      "code_execution": true,
      "file_search": false,
      "function_calling": true,
      "grounding_with_google_maps": true,
      "image_generation": false,
      "live_api": false,
      "search_grounding": true,
      "structured_outputs": true,
      "thinking": "experimental",
      "url_context": false
    },
    "versions": {
      "latest": ["gemini-2.0-flash"],
      "stable": ["gemini-2.0-flash-001"],
      "experimental": ["gemini-2.0-flash-exp"]
    },
    "latest_update": "February 2025",
    "knowledge_cutoff": "August 2024"
  },
  {
    "name": "Gemini 2.0 Flash Image",
    "model_code": "gemini-2.0-flash-preview-image-generation",
    "category": "Gemini 2.0 Flash",
    "tagline": "Image generation variant of Gemini 2.0 Flash",
    "supported_inputs": ["Audio", "Image", "Video", "Text"],
    "supported_outputs": ["Text", "Image"],
    "token_limits": {
      "input": 32768,
      "output": 8192
    },
    "capabilities": {
      "audio_generation": false,
      "batch_api": true,
      "caching": true,
      "code_execution": false,
      "file_search": false,
      "function_calling": false,
      "grounding_with_google_maps": false,
      "image_generation": true,
      "live_api": false,
      "search_grounding": false,
      "structured_outputs": true,
      "thinking": false,
      "url_context": false
    },
    "versions": {
      "preview": ["gemini-2.0-flash-preview-image-generation"]
    },
    "notes": "Not currently supported in a number of countries in Europe, Middle East & Africa",
    "latest_update": "May 2025",
    "knowledge_cutoff": "August 2024"
  },
  {
    "name": "Gemini 2.0 Flash-Lite",
    "model_code": "gemini-2.0-flash-lite",
    "category": "Gemini 2.0 Flash-Lite",
    "tagline": "Second generation small workhorse model optimized for cost efficiency and low latency",
    "supported_inputs": ["Audio", "Image", "Video", "Text"],
    "supported_outputs": ["Text"],
    "token_limits": {
      "input": 1048576,
      "output": 8192
    },
    "capabilities": {
      "audio_generation": false,
      "batch_api": true,
      "caching": true,
      "code_execution": false,
      "file_search": false,
      "function_calling": true,
      "grounding_with_google_maps": false,
      "image_generation": false,
      "live_api": false,
      "search_grounding": false,
      "structured_outputs": true,
      "thinking": false,
      "url_context": false
    },
    "versions": {
      "latest": ["gemini-2.0-flash-lite"],
      "stable": ["gemini-2.0-flash-lite-001"]
    },
    "latest_update": "February 2025",
    "knowledge_cutoff": "August 2024"
  }
]
```