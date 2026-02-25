import { motion } from 'framer-motion';
import {
  Sparkles, ArrowRight, Boxes, Play, Activity,
  Zap, Shield, Globe, Workflow, Check, X,
  Download, Cloud, Users, RefreshCw, Bell, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// ─── Feature data ────────────────────────────────────────────────────────────
const features = [
  {
    icon: Boxes,
    title: 'Visual Pipeline Designer',
    description:
      'Drag-and-drop to design multi-stage AI workflows. Connect stages, configure cardinality, and define IO contracts visually.',
    color: 'from-step-a to-step-b',
  },
  {
    icon: Play,
    title: 'Batch Launcher',
    description:
      'Upload CSV/Excel, choose an orchestrator config, and process thousands of AI tasks with full retry support.',
    color: 'from-success to-primary',
  },
  {
    icon: Activity,
    title: 'Real-time Monitor',
    description:
      'Track every task live. View structured results, retry failures, and render output with custom TSX components.',
    color: 'from-primary to-accent',
  },
];

const stats = [
  { value: 'N-Stage', label: 'Pipeline depth' },
  { value: '∞', label: 'Tasks per batch' },
  { value: 'Real-time', label: 'Monitoring' },
];

// ─── Pricing data ────────────────────────────────────────────────────────────
interface PlanFeature {
  label: string;
  lite: boolean | string;
  full: boolean | string;
}

const planFeatures: PlanFeature[] = [
  { label: 'Visual Pipeline Designer', lite: true, full: true },
  { label: 'N-stage Batch Execution', lite: true, full: true },
  { label: 'Real-time Monitor', lite: true, full: true },
  { label: 'Custom TSX Component Sandbox', lite: true, full: true },
  { label: 'Token Cost Calculator', lite: true, full: true },
  { label: 'Export CSV / JSON', lite: true, full: true },
  { label: 'Data storage', lite: 'Local only (IndexedDB)', full: 'Cloud (Supabase)' },
  { label: 'Cross-device sync', lite: false, full: true },
  { label: 'Background processing (tab closed)', lite: false, full: true },
  { label: 'API Key Pool (auto rotation)', lite: false, full: true },
  { label: 'Team workspace & shared pipelines', lite: false, full: true },
  { label: 'Auto retry + Webhook / Email alerts', lite: false, full: true },
  { label: 'Persistent batch history', lite: false, full: true },
  { label: 'Authentication required', lite: false, full: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-muted-foreground">{value}</span>;
  }
  return value ? (
    <Check className="w-5 h-5 text-green-500 mx-auto" />
  ) : (
    <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-full">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Orchable · N-Stage AI Agent Orchestrator
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">Orchestrate Anything.</span>
              <br />Actively.
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Turn your AI agents into an actionable workforce. Design
              multi-stage pipelines visually, run massive batches, and monitor
              results in real time.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  className="h-12 px-8 bg-gradient-to-r from-primary to-accent text-white shadow-glow"
                  onClick={() => navigate('/designer')}
                >
                  {user ? 'Go to Dashboard' : 'Try Free — No Sign-up'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8"
                  onClick={() => navigate('/monitor')}
                >
                  See a Live Demo
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16"
          >
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Core Modules ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Three Core Modules</h2>
            <p className="text-muted-foreground">
              Everything you need to automate AI-powered workflows at production scale
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
                className="p-6 rounded-2xl bg-card border shadow-lg hover:shadow-xl transition-all"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Orchable ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6">
                Why <span className="gradient-text">Orchable</span>?
              </h2>
              <div className="space-y-4">
                {[
                  { icon: Zap, text: 'Save hours of manual prompt engineering and task management' },
                  { icon: Shield, text: 'Consistent quality through structured AI output contracts' },
                  { icon: Globe, text: 'Scale to any domain — education, marketing, data, and more' },
                  { icon: Workflow, text: 'No-code pipeline design with full developer control' },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-lg">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border shadow-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-card shadow-lg flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground">Demo Video (Coming Soon)</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-muted/30" id="pricing">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-muted-foreground">
              Start free, upgrade when you outgrow local.
            </p>
          </motion.div>

          {/* Plan cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Lite */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border bg-card p-8 shadow-lg flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Download className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Lite</p>
                  <p className="text-xs text-muted-foreground">Runs in your browser</p>
                </div>
                <Badge variant="secondary" className="ml-auto">Free forever</Badge>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground ml-2">/ month</span>
              </div>

              <ul className="space-y-2 mb-8 flex-1">
                {[
                  'Full pipeline designer & executor',
                  'Unlimited stages & tasks',
                  'Custom TSX component sandbox',
                  'Local storage (IndexedDB)',
                  'No sign-up required',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
                {[
                  'Background processing',
                  'Cross-device sync',
                  'Team collaboration',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground/60">
                    <X className="w-4 h-4 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/designer')}
              >
                {user ? 'Go to Dashboard' : 'Start Free'}
              </Button>
            </motion.div>

            {/* Full / Pro */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border-2 border-primary bg-card p-8 shadow-2xl shadow-primary/10 flex flex-col relative overflow-hidden"
            >
              {/* Glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Pro</p>
                  <p className="text-xs text-muted-foreground">Cloud-powered, always-on</p>
                </div>
                <Badge className="ml-auto bg-gradient-to-r from-primary to-accent text-white border-0">
                  Most popular
                </Badge>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">$19</span>
                <span className="text-muted-foreground ml-2">/ month</span>
              </div>

              <ul className="space-y-2 mb-8 flex-1">
                {[
                  'Everything in Lite',
                  'Cloud storage (persistent history)',
                  'Cross-device sync',
                  'Background processing 24/7',
                  'Auto API key rotation pool',
                  'Auto retry + Webhook / Email alerts',
                  'Team workspace & shared pipelines',
                  'Priority support',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-accent text-white shadow-glow"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Get Pro — Coming Soon
              </Button>
            </motion.div>
          </div>

          {/* Detailed comparison table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border bg-card overflow-hidden shadow-lg"
          >
            <div className="grid grid-cols-3 bg-muted/50 px-6 py-4 text-sm font-semibold border-b">
              <span>Feature</span>
              <span className="text-center">Lite</span>
              <span className="text-center text-primary">Pro</span>
            </div>
            {planFeatures.map((row, idx) => (
              <div
                key={idx}
                className={cn(
                  'grid grid-cols-3 px-6 py-3 text-sm items-center',
                  idx % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                )}
              >
                <span className="text-muted-foreground">{row.label}</span>
                <div className="text-center">
                  <FeatureCell value={row.lite} />
                </div>
                <div className="text-center">
                  <FeatureCell value={row.full} />
                </div>
              </div>
            ))}
          </motion.div>

          {/* Upgrade triggers callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 grid sm:grid-cols-3 gap-4"
          >
            {[
              {
                icon: Clock,
                title: 'Runs 24/7',
                desc: 'Pro processes batches even when your browser is closed.',
              },
              {
                icon: Users,
                title: 'Team-ready',
                desc: 'Share pipelines and results with your entire team.',
              },
              {
                icon: RefreshCw,
                title: 'Never hit rate limits',
                desc: 'Auto key rotation keeps your batches flowing uninterrupted.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex gap-3 p-4 rounded-xl border bg-card items-start"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 border"
        >
          <h2 className="text-3xl font-bold mb-4">Start orchestrating for free</h2>
          <p className="text-muted-foreground mb-8">
            No sign-up. No credit card. Open the Designer and build your first
            AI pipeline in minutes.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              className="h-14 px-10 text-lg bg-gradient-to-r from-primary to-accent text-white shadow-glow"
              onClick={() => navigate('/designer')}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {user ? 'Go to Dashboard' : 'Open Designer Free'}
            </Button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
