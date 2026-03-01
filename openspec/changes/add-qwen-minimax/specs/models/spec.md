# Specification: Support Qwen and MiniMax Models

## MODIFIED Requirements

### Requirement: Multi-Vendor Key Management

The system SHALL allow Free Tier and Premium users to provide API keys for multiple supported vendors (e.g., Gemini, DeepSeek, Qwen, MiniMax).

#### Scenario: Adding a Qwen Key

- **WHEN** a user selects "Qwen" as the vendor and inputs a valid DashScope API key
- **THEN** the system saves the key with `provider="qwen"` metadata.

#### Scenario: Adding a MiniMax Key

- **WHEN** a user selects "MiniMax" as the vendor and inputs a valid API key
- **THEN** the system saves the key with `provider="minimax"` metadata.

## ADDED Requirements

### Requirement: Qwen/MiniMax Proxy Routing

The AI proxy SHALL route requests to the appropriate vendor's endpoint based on the selected model and associated API key, leveraging standard OpenAI payload formats for DashScope and MiniMax REST APIs.

#### Scenario: Routing to MiniMax

- **WHEN** a task requests `minimax-01`
- **THEN** the proxy formats the request as an OpenAI chat completion payload and sends it to `https://api.minimax.chat/v1/chat/completions`.
