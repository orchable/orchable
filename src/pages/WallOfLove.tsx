import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Star, Quote, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const testimonials = [
    {
        name: "Sarah Chen",
        role: "AI Product Lead @ TechFlow",
        content: "Orchable has completely transformed how we prototype multi-stage AI agents. The designer is intuitive and the visualization is world-class.",
        avatar: "SC",
        color: "from-teal-500 to-emerald-500"
    },
    {
        name: "Marc Durand",
        role: "Senior Developer",
        content: "The ability to monitor batch executions in real-time while seeing exactly which stage each task is at is a game changer for our production workloads.",
        avatar: "MD",
        color: "from-blue-500 to-indigo-500"
    },
    {
        name: "Yuki Tanaka",
        role: "Data Scientist",
        content: "Finally, a tool that bridges the gap between prompt engineering and scalable execution. The glassmorphism UI makes working in it a joy.",
        avatar: "YT",
        color: "from-purple-500 to-pink-500"
    },
    {
        name: "Alex Rivera",
        role: "CTO @ InnovateAI",
        content: "We reduced our pipeline development time by 60% after switching to Orchable. The community hub is also a goldmine for prompt templates.",
        avatar: "AR",
        color: "from-orange-500 to-red-500"
    },
    {
        name: "Elena Petrova",
        role: "Freelance AI Engineer",
        content: "The integration with Gemini and the ease of setting up output schemas makes it my go-to for every client project.",
        avatar: "EP",
        color: "from-cyan-500 to-blue-500"
    },
    {
        name: "James Wilson",
        role: "Backend Architect",
        content: "Reliable, fast, and beautiful. Orchable is what happens when you prioritize developer experience in AI tooling.",
        avatar: "JW",
        color: "from-teal-400 to-blue-400"
    }
];

export default function WallOfLove() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#050B14] text-white">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050B14]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => navigate('/')}
                    >
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-bold text-lg">Back to Home</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                        <span className="font-bold tracking-tight">Orchable Wall of Love</span>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-primary/20 blur-[120px] rounded-full -z-10" />

                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
                            Loved by Builders <br /> Everywhere
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                            Join thousands of developers and teams who use Orchable to orchestrate their AI futures.
                        </p>
                        <div className="flex items-center justify-center gap-6">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="w-12 h-12 rounded-full border-2 border-[#050B14] bg-muted flex items-center justify-center text-xs font-bold">
                                        {String.fromCharCode(64 + i)}
                                    </div>
                                ))}
                            </div>
                            <div className="text-left">
                                <div className="flex items-center gap-1 text-yellow-500 mb-1">
                                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                                </div>
                                <p className="text-sm font-medium">Trusted by 2,000+ teams</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Testimonials Grid */}
            <section className="pb-32 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {testimonials.map((t, idx) => (
                        <motion.div
                            key={t.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                        >
                            <Card className="p-8 h-full bg-white/5 border-white/10 backdrop-blur-sm hover:border-primary/50 transition-all group relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${t.color} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`} />

                                <Quote className="w-10 h-10 text-primary/20 mb-6" />

                                <p className="text-lg leading-relaxed mb-8 relative z-10">
                                    "{t.content}"
                                </p>

                                <div className="flex items-center gap-4 pt-6 border-t border-white/5 mt-auto">
                                    <Avatar className="w-12 h-12 ring-2 ring-white/10 ring-offset-2 ring-offset-[#050B14]">
                                        <AvatarFallback className={`bg-gradient-to-br ${t.color} text-white font-bold`}>
                                            {t.avatar}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="font-bold text-white">{t.name}</h4>
                                        <p className="text-sm text-muted-foreground">{t.role}</p>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-20 text-center">
                    <Button
                        size="lg"
                        className="rounded-full px-8 py-6 h-auto text-lg font-bold shadow-lg shadow-primary/20"
                        onClick={() => navigate('/login')}
                    >
                        Start your own story
                    </Button>
                </div>
            </section>

            {/* Simple Footer for this page */}
            <footer className="py-12 border-t border-white/5 text-center text-muted-foreground text-sm">
                <p>© 2026 Orchable · Orchestrate Anything. Automatically.</p>
            </footer>
        </div>
    );
}
