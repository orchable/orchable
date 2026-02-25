import { motion } from 'framer-motion';
import { GraduationCap, Megaphone, Microscope, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function UseCasesSection() {
    const cases = [
        {
            icon: GraduationCap,
            title: 'For Educators',
            description: 'Generate complete exam sheets from a list of Learning Objectives in seconds.',
            workflow: 'LO List → Stage 1 (Create) → Stage 2 (Format) → Final PDF',
            color: 'from-blue-500 to-cyan-500',
        },
        {
            icon: Megaphone,
            title: 'For Marketers',
            description: 'Batch-create thousands of unique SEO descriptions and ad copies for product catalogs.',
            workflow: 'Product DB → Stage 1 (Enrich) → Stage 2 (Tone Adjustment) → Live',
            color: 'from-purple-500 to-pink-500',
        },
        {
            icon: Microscope,
            title: 'For Researchers',
            description: 'Extract, classify, and synthesize findings from hundreds of papers into structured data.',
            workflow: 'PDF Folder → Stage 1 (Extract) → Stage 2 (Categorize) → Report',
            color: 'from-emerald-500 to-teal-500',
        },
    ];

    return (
        <section className="py-24 px-6 bg-muted/30">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-black mb-6">Real-World AI Workloads</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
                        From EdTech to Enterprise Research, Orchable powers the complex assembly lines that common chatbots can't handle.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {cases.map((useCase, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -8 }}
                            className="group p-8 rounded-3xl bg-card border shadow-xl hover:shadow-2xl transition-all h-full flex flex-col"
                        >
                            <div className={cn(
                                "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 shadow-lg rotate-3 group-hover:rotate-0 transition-transform",
                                useCase.color
                            )}>
                                <useCase.icon className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-black mb-4">{useCase.title}</h3>
                            <p className="text-muted-foreground mb-8 flex-1 leading-relaxed">
                                {useCase.description}
                            </p>

                            <div className="p-4 rounded-xl bg-muted/50 border border-border/50 space-y-2">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workflow Example</div>
                                <div className="text-xs font-semibold leading-relaxed flex items-center gap-2">
                                    <span>{useCase.workflow}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
