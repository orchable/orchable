## Context
The Designer interface is the core of Orchable. As we add more capability (nested orchestrations, extracting sub-orchestrations), the interface has become cluttered. The entry point for creating a new orchestration or managing existing ones needs to be intuitive.

## Goals / Non-Goals
- **Goals**: Make creating a new orchestration explicit. Improve the discoverability of adding nodes. Clean up the toolbar layout. Add safe-guards against accidental data loss when starting fresh.
- **Non-Goals**: We are not changing the core React Flow functionality. We are not implementing full drag-and-drop from a component palette (yet), but rather improving the current "add to canvas" flow.

## Decisions
- **Decision: "Create New" Flow**: We will replace the "Reset" button in the Top Right with a prominent "New Orchestration" button on the Top Left or Top Right, styled differently. If the user has > 1 node (meaning they have started building), clicking "New" will prompt a confirmation dialog to prevent accidental loss of unsaved work.
- **Decision: "Duplicate" Flow**: We will add a "Duplicate" button for saved orchestrations. Clicking it opens a `DuplicateOrchDialog` asking for a "New Name" and an optional "Stage Key Suffix/Prefix". To keep stage keys readable, concise, and non-colliding, the system will automatically append this suffix (e.g., `_copy` or `_v2`) to all copied stages. The duplication happens entirely in the frontend by creating a new unsaved canvas state with the modified keys, allowing the user to review before calling `Save Config`.
- **Decision: Toolbar Condensation**: To prevent UI overlap on smaller screens, we will condense secondary actions into a Dropdown Menu (`...` or similar icon). 
  - *Primary Toolbar Items (Always Visible)*: "New Orchestration" (Left), "Config Library" (Left), "Save Config" (Right), "Run" (Right), "Expand All" (Right).
  - *Secondary Items (In Dropdown)*: "Duplicate", "Share", "Import", "Export".
- **Decision: Add Node UX**: The `StepPalette` will be updated to include a primary "Add Node" button that adds a default generic node to the canvas. The text input will be kept but relabeled to "Quick Add by Name".
- **Decision: Context Header**: Add a small header/title area indicating the name of the currently loaded orchestration, or "Untitled Orchestration" if it's new.

## Risks / Trade-offs
Adding a confirmation dialog introduces a slight friction, but it is necessary to prevent accidental data loss. Rearranging the toolbar might cause brief confusion for existing users, but the long-term benefit of logical grouping outweighs it.

## Migration Plan
No database schema changes. The `useDesignerStore.reset` action will be reused but guarded by UI confirmation.
