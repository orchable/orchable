## ADDED Requirements

### Requirement: Asset Storage Synchronization
The UI layer SHALL use a unified `getAssetStorageAdapter()` for syncing AI Models, Prompt Templates, and UI Components across both the core Designer and the Hub.
- **Reason**: `IndexedDBAdapter` was incorrectly hardcoded for Free Users, resulting in desynchronized assets from `SupabaseAdapter` updates.

#### Scenario: Free user opens AI Models dropdown
- **WHEN** an authenticated user on the Free tier opens the AI Models list
- **THEN** the system fetches active models via `getAssetStorageAdapter()` which points to Supabase.
- **AND** the models are cached locally for offline execution.

### Requirement: Multidimensional Schema Editor
The Output Schema Editor SHALL support nesting `items` within an array root type, allowing for multidimensional arrays (e.g., `array of array`).

#### Scenario: User configures a grid output
- **WHEN** the user sets the Root Type to Array
- **AND** selects "Array" for the Item type
- **THEN** the editor reveals a nested Array Items Schema config for the child arrays.

### Requirement: Flexible Variable Scope Validation
The Prompt Editor SHALL highlight unregistered variables retrieved by Regex against the `availableScope` from the Parent Stage. However, it SHALL NOT treat missing variables as strictly invalid if Pre-Process hooks are enabled, recognizing that variables can be injected at runtime.

#### Scenario: User types a dynamic variable
- **WHEN** the user types `{{fetched_data}}` and it is not in the `availableScope`
- **AND** the stage has a Pre-Process Webhook with `output_handling: merge`
- **THEN** the variable is highlighted cautiously (e.g., Warning style) instead of strictly Invalid (Error style).
