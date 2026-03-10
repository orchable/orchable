# Specification: Multi-Vendor Models

## ADDED Requirements

### Requirement: Multi-Vendor Key Management

The system SHALL allow Free Tier and Premium users to provide API keys for multiple supported vendors (e.g., Gemini, DeepSeek).

#### Scenario: Adding a DeepSeek Key

- **WHEN** a user selects "DeepSeek" as the vendor and inputs a valid key
- **THEN** the system saves the key with `provider="deepseek"` metadata.

### Requirement: Multi-Vendor Proxy Routing

The AI proxy SHALL route requests to the appropriate vendor's endpoint based on the selected model and associated API key.

#### Scenario: Routing to DeepSeek

- **WHEN** a task requests `deepseek-chat`
- **THEN** the proxy formats the request as an OpenAI chat completion payload and sends it to `https://api.deepseek.com/v1/chat/completions`.
