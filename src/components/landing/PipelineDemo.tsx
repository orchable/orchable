import { motion } from 'framer-motion';
import { Database, Zap, ArrowRight, CheckCircle2, FileJson, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function PipelineDemo() {
    return (
        <section className="py-24 px-6 bg-muted/30 relative overflow-hidden">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <Badge variant="outline" className="mb-4">Visual Execution Flow</Badge>
                    <h2 className="text-3xl md:text-5xl font-black mb-6">Pipelines That Think in Stages</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Orchable isn't just a chatbot. It's an AI assembly line.
                        Split tasks, merge results, and watch your data flow through IO contracts.
                    </p>
                </div>

                <div className="relative p-8 md:p-12 rounded-[2.5rem] bg-card border shadow-2xl overflow-hidden">
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

                    <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
                        {/* Input Node */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="w-full lg:w-48 p-5 rounded-2xl bg-background border shadow-lg flex flex-col items-center text-center gap-3"
                        >
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                <Database className="w-6 h-6 text-orange-500" />
                            </div>
                            <div className="font-bold">Input CSV</div>
                            <div className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                                100 Learning Objectives
                            </div>
                        </motion.div>

                        <ArrowRight className="hidden lg:block w-8 h-8 text-muted-foreground/30 animate-pulse" />

                        {/* Stage A (1:N Split) */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="w-full lg:w-64 p-6 rounded-2xl bg-primary/5 border border-primary/20 shadow-xl relative"
                        >
                            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white">Stage A: 1:N</Badge>
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-glow">
                                    <Zap className="w-8 h-8 text-white" />
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-lg mb-1">Core Generation</div>
                                    <div className="text-xs text-muted-foreground">Tạo 5 câu hỏi từ mỗi mục tiêu</div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Split Lines (Desktop Only) */}
                        <div className="hidden lg:flex flex-col gap-6">
                            {[1, 2, 3].map(i => (
                                <motion.div
                                    key={i}
                                    initial={{ scaleX: 0 }}
                                    whileInView={{ scaleX: 1 }}
                                    className="h-px w-12 bg-primary/30 origin-left"
                                />
                            ))}
                        </div>

                        {/* Stage B (N:1 Merge) */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="w-full lg:w-64 p-6 rounded-2xl bg-accent/5 border border-accent/20 shadow-xl relative"
                        >
                            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white">Stage B: N:1</Badge>
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-glow-accent">
                                    <Layers className="w-8 h-8 text-white" />
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-lg mb-1">Exam Assembler</div>
                                    <div className="text-xs text-muted-foreground">Gộp 500 câu thành 1 bộ đề</div>
                                </div>
                            </div>
                        </motion.div>

                        <ArrowRight className="hidden lg:block w-8 h-8 text-muted-foreground/30" />

                        {/* Output Node */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="w-full lg:w-48 p-5 rounded-2xl bg-background border shadow-lg flex flex-col items-center text-center gap-3 border-success/30"
                        >
                            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                                <FileJson className="w-6 h-6 text-success" />
                            </div>
                            <div className="font-bold">Final Exam</div>
                            <div className="flex items-center gap-1 text-[10px] text-success font-bold uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                            </div>
                        </motion.div>
                    </div>

                    {/* Flowing Particles Effect */}
                    <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-y-1/2 overflow-hidden hidden lg:block">
                        <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="w-32 h-full bg-gradient-to-r from-transparent via-primary to-transparent"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
