<p align="center">
  <img src="apps/docs/images/logo.png" alt="Orchable Logo" width="80" />
</p>

<h3 align="center">Orchable</h3>
<p align="center"><strong>Orchestrate Anything. Automatically.</strong></p>

<p align="center">
  <a href="https://orchable.ai">Cloud</a> ·
  <a href="https://docs.orchable.ai">Documentation</a> ·
  <a href="https://orchable.ai/hub">Community Hub</a> ·
  <a href="https://orchable.ai/pricing">Pricing</a>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-teal" />
  <img alt="Stars" src="https://img.shields.io/github/stars/thanh01pmt/orchable?style=flat&color=teal" />
  <img alt="Issues" src="https://img.shields.io/github/issues/thanh01pmt/orchable?color=teal" />
  <img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-teal" />
</p>

---

## What is Orchable?

**Orchable** is an open-core AI pipeline orchestration platform. It lets you visually design multi-stage AI workflows, run batch jobs at scale, and monitor results in real time — all without writing a single line of glue code.

Think of it as the **visual layer between your data and your AI models**.

---

## ✨ Key Features

- **🎨 Visual Designer** — Drag-and-drop pipeline builder. Configure prompts, routing, and output schemas per stage. No backend code required.
- **🚀 Batch Launcher** — Submit thousands of tasks in parallel. Map CSV inputs to pipeline stages with a few clicks.
- **📊 Real-time Monitor** — Track task status, execution trees, and failure rates live. Drill down into any individual result.
- **📚 Asset Library** — Manage and version your prompt templates and custom view components in one place.
- **🌐 Community Hub** — Share pipelines with the community, discover templates from others, and remix what works.
- **🔐 Secure by Default** — Route guards, Supabase Auth (Passkey, Google OAuth), and API key pool management.

---

## 🚀 Quick Start

### Cloud (Recommended)

Visit [orchable.ai](https://orchable.ai) and sign in with Google. No setup required.

### Self-hosting

```bash
# 1. Clone the repo
git clone https://github.com/thanh01pmt/orchable.git
cd orchable

# 2. Copy environment variables
cp .env.example .env
# Fill in your SUPABASE_URL and SUPABASE_ANON_KEY

# 3. Install dependencies and run
pnpm install
pnpm run dev
```

> See the [Self-hosting Guide](https://docs.orchable.ai/guides/operational-guide) for full instructions including Supabase setup and n8n workflow configuration.

---

## 🏗️ Architecture

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **AI Routing** | n8n workflows + Gemini API |
| **Deployment** | Netlify (frontend) + Supabase Cloud |

Full architecture details → [docs.orchable.ai/architecture/system-overview](https://docs.orchable.ai/architecture/system-overview)

---

## 🤝 Contributing

We love contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) to get started.

- Found a bug? [Open an issue](https://github.com/thanh01pmt/orchable/issues)
- Have a feature idea? [Start a discussion](https://github.com/thanh01pmt/orchable/discussions)
- Browse [good first issues](https://github.com/thanh01pmt/orchable/issues?q=label%3A%22good+first+issue%22)

---

## 📄 License

Orchable is open-source under a **modified Apache 2.0 License**. Self-hosting for personal or internal use is free. Running a competing multi-tenant SaaS service requires a commercial license. See [LICENSE](./LICENSE) for details.

---

<p align="center">© 2026 Orchable · Built for AI Builders</p>
