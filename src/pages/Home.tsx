import { motion } from 'framer-motion';
import {
  Bot, Terminal, ArrowRight, Sparkles
} from 'lucide-react';
import { HeroSection } from '@/components/landing/HeroSection';
import { PipelineDemo } from '@/components/landing/PipelineDemo';
import { FeatureSection } from '@/components/landing/FeatureSection';
import { UseCasesSection } from '@/components/landing/UseCasesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import LandingFooter from '@/components/landing/LandingFooter';


export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection />

      {/* Pipeline Visual Demo */}
      <PipelineDemo />

      {/* Feature 1: Simplicity */}
      <FeatureSection
        id="features"
        tagline="Design without limits"
        headline="One prompt. One Stage. Infinite scale."
        description="Don't spend weeks learning complex automation tools. If you can write a prompt, you can build a multi-stage AI pipeline in Orchable. Focus on your expertise, not the infrastructure."
        bullets={[
          "Single node type architecture",
          "Zero-config AI stages",
          "Visual drag-and-drop designer",
          "Real-time token cost estimation"
        ]}
        visual={
          <div className="p-8 flex items-center justify-center bg-primary/5 h-full w-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="relative w-48 h-48"
            >
              {[0, 60, 120, 180, 240, 300].map(deg => (
                <div
                  key={deg}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                  style={{ transform: `translate(-50%, -50%) rotate(${deg}deg)` }}
                />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center shadow-glow">
                  <Bot className="w-12 h-12 text-white" />
                </div>
              </div>
            </motion.div>
          </div>
        }
      />

      {/* Feature 2: Visibility & Control */}
      <FeatureSection
        reverse
        tagline="Full Visibility"
        headline="Glass box, not a black box."
        description="Monitor every single task live as it flows through your pipeline. Orchable gives you the power to pause, approve, or retry failed tasks at any stage without restarting the whole batch."
        bullets={[
          "Real-time task tracking",
          "Human-in-the-loop approvals",
          "One-click retry for failures",
          "Detailed execution history"
        ]}
        visual={
          <div className="p-8 space-y-4 bg-muted/20 h-full w-full overflow-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-xl bg-card border shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    i === 3 ? "bg-amber-500 animate-pulse" : "bg-green-500"
                  )} />
                  <span className="text-sm font-medium">Task #{1204 + i}</span>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {i === 3 ? "STG_A → STG_B" : "COMPLETED"}
                </div>
              </div>
            ))}
          </div>
        }
      />

      {/* Feature 3: Custom Rendering */}
      <FeatureSection
        tagline="Developer Experience"
        headline="Your output. Your renderer."
        description="Write custom React (TSX) components directly in your browser to render AI results exactly how you need them. Perfect for creating custom dashboards, document previews, or data visualizations."
        bullets={[
          "Live TSX sandbox editor",
          "In-browser code compilation",
          "Safe, scoped execution",
          "Reusable component library"
        ]}
        visual={
          <div className="p-8 bg-slate-950 h-full w-full font-mono text-xs text-blue-400 overflow-hidden text-left">
            <div className="flex items-center gap-2 mb-4 text-slate-500 border-b border-slate-800 pb-2">
              <Terminal className="w-4 h-4" />
              <span>Component.tsx</span>
            </div>
            <div className="space-y-1">
              <p><span className="text-purple-400">const</span> <span className="text-yellow-400">Component</span> = ({'{ '} data {' }'}) ={'>'} {'{'}</p>
              <p className="pl-4 text-slate-500">// Your custom UI logic</p>
              <p className="pl-4 text-purple-400">return</p> (
              <p className="pl-8 text-green-400">{'<'}<span className="text-blue-400">Card</span>{' className="p-4"'}{'>'}</p>
              <p className="pl-12 text-blue-200">{'{ '}data.summary{' }'}</p>
              <p className="pl-8 text-green-400">{'</'}<span className="text-blue-400">Card</span>{'>'}</p>
              <p className="pl-4">);</p>
              <p>{'}'};</p>
            </div>
          </div>
        }
      />

      {/* Use Cases Section */}
      <UseCasesSection />

      {/* Pricing Section */}
      <PricingSection />

      {/* Final CTA */}
      <section className="py-32 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto rounded-[3rem] bg-foreground text-background p-12 md:p-20 text-center relative overflow-hidden shadow-2xl"
        >
          {/* Background Highlight */}
          <div className="absolute top-0 left-0 w-full h-full bg-primary/20 blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

          <h2 className="text-4xl md:text-6xl font-black mb-8 relative z-10 leading-tight">
            Ready to Start Your <br />
            AI Assembly Line?
          </h2>
          <p className="text-xl md:text-2xl text-background/70 max-w-2xl mx-auto mb-12 relative z-10">
            Open the Designer and build your first pipeline in minutes.
            Just pure AI orchestration.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
            <Button
              size="lg"
              className="h-16 px-12 text-xl font-black bg-primary hover:bg-primary/90 text-white shadow-glow transition-all"
              onClick={() => navigate('/login')}
            >
              Start Free Today
              <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
            <Button
              variant="link"
              size="lg"
              className="text-white hover:text-primary text-lg"
              onClick={() => navigate('/hub')}
            >
              Learn from the community
            </Button>
          </div>
        </motion.div>
      </section>

      <LandingFooter />
    </div>
  );
}

