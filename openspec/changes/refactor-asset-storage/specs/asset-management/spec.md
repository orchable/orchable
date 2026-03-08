# Asset Management Specification

## ADDED Requirements

### Requirement: Standardized Asset Storage Routing

The system SHALL route asset storage based on user authentication and tier, independently from execution context.

#### Scenario: User saves a Prompt Template, Custom Component, or AI Setting

- **WHEN** an authenticated user (Premium or Registered Free) saves these assets
- **THEN** they MUST be stored in Supabase tables with their `user_id` attached.
- **WHEN** an unauthenticated user saves these assets
- **THEN** they MUST be stored in local IndexedDB.

#### Scenario: User uploads a Document Asset

- **WHEN** a Premium user uploads a Document
- **THEN** the file MUST be saved to Supabase File Storage and the metadata in Supabase DB.
- **WHEN** a Registered Free user or Unauthenticated user uploads a Document
- **THEN** both the file blob and the database record MUST be saved 100% to local IndexedDB. This prevents cloud storage/database consumption for non-Premium tiers.

#### Scenario: User views Asset Library

- **WHEN** the Asset Library is loaded
- **THEN** the system MUST retrieve assets from the appropriate storage provider according to the tier mapping, merging local and remote data only if applicable to that asset type and tier.
