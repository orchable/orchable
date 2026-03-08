## MODIFIED Requirements
### Requirement: Publish Asset to Hub
- The system MUST fetch the complete asset definition (from Supabase) and push it to the remote hub_assets table when an Authenticated User publishes an asset from their library.
- The system MUST block the action when an Unauthenticated User attempts to publish an asset, as publishing requires a registered Discord/Email account to link the creator_id.

#### Scenario: Success (Authenticated)
- **WHEN** Authenticated User clicks "Publish to Hub"
- **THEN** Asset is packaged, stripped of keys, and visible on public Hub.

#### Scenario: Blocked (Unauthenticated)
- **WHEN** Unauthenticated User clicks "Publish to Hub"
- **THEN** The UI displays a prompt requiring them to log in to contribute.

### Requirement: Import Asset from Hub
- The system MUST copy the asset from the Hub and save it to their Supabase storage when a Premium or Free Authenticated User imports an asset.
- The system MUST copy the asset from the Hub and save it entirely to their local IndexedDB storage when an Unauthenticated User imports an asset.

#### Scenario: Success (Unauthenticated Import)
- **WHEN** Unauth User clicks "Import"
- **THEN** Asset is downloaded and saved directly to the local IndexedDB without creating Supabase records.
