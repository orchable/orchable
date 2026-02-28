# Specification: Asset Library Documents

## ADDED Requirements

### Requirement: Auxiliary Text Document Library Management
The system SHALL provide a 'Documents' section within the Asset Library allowing users to upload, store, and manage plain text structural files (`TXT`, `CSV`, `MD`, `TSV`).
**ADDED**: New capability for managing `document_assets`.

#### Scenario: User uploads a reference document to their Document Library
- **WHEN** a user uploads a new `.md` file in the Asset Library -> Documents interface.
- **THEN** the system parses the file, extracting line counts and token estimations.
- **AND** the system saves the file metadata into the Supabase `document_assets` table.
- **AND** the system writes the physical blob into Supabase Storage (Premium) or IndexedDB (Free/BYOK).

#### Scenario: User references an Auxiliary Document in their AI Stage configurations
- **WHEN** configuring an Orchestration Step, a user chooses an existing Document from the Asset Library drop-down.
- **THEN** the system registers the Document Identifier alongside the `StepConfig`.
- **AND** injects the file content globally during Launcher batch initialization as `global_context`.

