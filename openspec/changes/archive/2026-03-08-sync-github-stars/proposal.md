# Change: Sync GitHub Stars

## Why

The landing page currently shows a hardcoded "130k" star count. We need to fetch the real count from GitHub and hide it if it's below a threshold (1,000 stars) to avoid showing low numbers for a new project.

## What Changes

- [NEW] `src/hooks/useGitHubStars.ts`: A hook to fetch repository stars from GitHub API.
- [MODIFY] `src/components/landing/LandingNav.tsx`: Use the hook and conditionally render the star count.

## Impact

- Specs: `landing`
- Code: `src/hooks/useGitHubStars.ts`, `src/components/landing/LandingNav.tsx`
