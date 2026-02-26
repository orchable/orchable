import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Play, Zap, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function HeroSection() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const stats = [
        { label: 'Pipeline Depth', value: 'N-Stage', icon: Zap },
        { label: 'Cardinality', value: '1:N, N:1', icon: Shield },
        { label: 'Deployment', value: 'Zero Infra', icon: Globe },
    ];

    return (
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

            <div className="max-w-7xl mx-auto text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
                >
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-primary tracking-wide uppercase">
                        Built for Batch AI Processing at Scale
                    </span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] mb-8"
                >
                    Turn Your Expertise into an <br />
                    <span className="gradient-text drop-shadow-sm">AI Content Factory.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed"
                >
                    Design multi-step AI pipelines visually. Upload your data.
                    Watch thousands of tasks run — structured, traceable, and ready to use.
                    <span className="hidden md:inline"> Built with IO contracts and cardinality-aware flow.</span>
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Button
                        size="lg"
                        className="h-14 px-10 text-lg font-bold bg-primary hover:bg-primary/90 shadow-glow group"
                        onClick={() => navigate('/login')}
                    >
                        Start Free Today
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        className="h-14 px-10 text-lg font-bold group"
                        onClick={() => navigate('/hub')}
                    >
                        <Play className="w-5 h-5 mr-3 text-primary fill-primary group-hover:scale-110 transition-transform" />
                        Browse Community Hub
                    </Button>
                </motion.div>

                {/* Quick Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-24"
                >
                    {stats.map((stat, idx) => (
                        <div
                            key={idx}
                            className="group p-6 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform mx-auto md:mx-0">
                                <stat.icon className="w-6 h-6 text-primary" />
                            </div>
                            <div className="text-left">
                                <div className="text-3xl font-black tracking-tight mb-1">{stat.value}</div>
                                <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
