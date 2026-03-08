# Pricing and Quotas Spec Delta

## MODIFIED Requirements

### Requirement: User Tier Quotas

The system SHALL enforce the following task quotas per month:

- **Anonymous (Free)**: 0 Cloud Tasks (Local Execution only).
- **Registered (Free)**: 100 Cloud Tasks.
- **Professional (Premium)**: Unlimited Cloud Tasks.

#### Scenario: Enforce Registered Quota

- **WHEN** a registered user reaches 100 cloud tasks
- **THEN** additional cloud tasks SHALL be blocked until the next month.
