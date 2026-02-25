# Contributing to Orchable

So you're looking to contribute to Orchable — that's awesome, we can't wait to see what you do! 🎉

As an early-stage project with ambitious goals, we're building the most intuitive platform for AI pipeline orchestration. Every contribution matters — from fixing a typo to shipping a major feature.

This guide will help you get familiar with the codebase and how we work with contributors, so you can jump straight to the fun part.

> The community also adheres to our [Code of Conduct](./CODE_OF_CONDUCT.md). Please read it before participating.

---

## Before You Jump In

### 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/MakeXYZFun/orchable/issues/new?template=bug_report.md) with:
- A clear title and description
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots or console errors (if applicable)

### 💡 Feature Requests

Have an idea? [Start a discussion](https://github.com/MakeXYZFun/orchable/discussions/categories/feature-requests) before opening a PR. We want to make sure the feature aligns with our roadmap and isn't already being worked on.

### 🌱 Good First Issues

New to the codebase? Browse our [good first issues](https://github.com/MakeXYZFun/orchable/issues?q=label%3A%22good+first+issue%22) — these are well-scoped tasks perfect for getting started.

Don't forget to **link an existing issue or open a new issue** in your PR description.

---

## Development Setup

### Prerequisites

- **Node.js** v20+
- **pnpm** v9+
- A **Supabase** account (free tier works)

### Running Locally

```bash
# 1. Fork and clone the repo
git clone https://github.com/<your-username>/orchable.git
cd orchable

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your SUPABASE_URL and SUPABASE_ANON_KEY

# 4. Start the dev server
pnpm run dev
```

The app will be available at `http://localhost:8080`.

### Running Documentation Locally

```bash
pnpm run docs:dev
```

---

## Pull Request Process

1. **Fork** the repository and create your branch from `main`.
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**, following the code style of the existing codebase.

3. **Test your changes** manually in the browser (we're working on automated tests).

4. **Commit** with a clear message:
   ```
   feat: add pipeline export to JSON
   fix: correct stage config not saving on blur
   docs: update prompt authoring guide
   ```
   We follow [Conventional Commits](https://www.conventionalcommits.org/).

5. **Push** your branch and open a Pull Request against `main`.

6. **Describe your changes** in the PR:
   - What problem does this solve?
   - Link to the related issue (e.g., `Closes #42`)
   - Include screenshots or recordings for UI changes

---

## Code Style

- **TypeScript** is required for all new files.
- Use **shadcn/ui** components over raw HTML elements.
- All `className` values must use `cn()` from `@/lib/utils`.
- Keep components focused and under ~300 lines.
- Use `Sonner` for toast notifications.

---

## Contributor Agreement

By submitting a PR, you agree that:
- Your code may be used in Orchable's cloud service.
- Orchable may adjust the open-source license as the project evolves.

---

## Getting Help

Stuck? Here are your options:

- 💬 **[GitHub Discussions](https://github.com/thanh01pmt/orchable/discussions)** — Ask questions, share ideas
- 🐛 **[GitHub Issues](https://github.com/thanh01pmt/orchable/issues)** — Report bugs
- 📖 **[Documentation](https://docs.orchable.app)** — Read the guides

---

Thank you for making Orchable better! 🚀
