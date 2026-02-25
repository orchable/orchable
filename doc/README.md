# 📖 Orchable Documentation Usage Guide

This directory contains the source documentation for Orchable. The documentation site is powered by **Nextra 4** and is located in `apps/docs`.

## 🚀 Getting Started

### 1. Run Documentation Locally
To start the documentation development server:
```bash
# From the project root
pnpm run docs:dev
```
Or specifically in the `apps/docs` directory:
```bash
cd apps/docs
pnpm run dev
```

The documentation will be available at `http://localhost:3001` (or the port specified in console).

### 2. Build Documentation
To build the documentation for production:
```bash
pnpm run docs:build
```

## 📂 Project Structure

- `apps/docs`: The Next.js/Nextra application.
  - `apps/docs/content/`: All MDX content files.
  - `apps/docs/app/[[...mdxPath]]/`: The catch-all route that renders the content.
  - `apps/docs/theme.config.tsx`: Nextra theme configuration.
- `doc/`: This directory contains historical or reference markdown files.

## ✍️ Writing Documentation

1. Add or edit `.mdx` files in `apps/docs/content/`.
2. Nextra automatically generates the sidebar based on the file structure.
3. Use `_meta.json` in any directory within `content/` to customize the sidebar order and titles.

## 🔧 Troubleshooting

If Tailwind CSS styles are not appearing, ensure you have run `npm install` in `apps/docs` to install the `@tailwindcss/postcss` plugin.
