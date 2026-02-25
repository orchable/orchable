import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface FeatureSectionProps {
    id?: string;
    headline: string;
    tagline: string;
    description: string;
    bullets: string[];
    visual: React.ReactNode;
    reverse?: boolean;
}

export function FeatureSection({
    id,
    headline,
    tagline,
    description,
    bullets,
    visual,
    reverse
}: FeatureSectionProps) {
    return (
        <section id={id} className="py-24 px-6 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className={cn(
                    "flex flex-col lg:flex-row items-center gap-16 lg:gap-24",
                    reverse && "lg:flex-row-reverse"
                )}>
                    {/* Content */}
                    <motion.div
                        initial={{ opacity: 0, x: reverse ? 40 : -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex-1 space-y-8"
                    >
                        <div>
                            <div className="text-sm font-bold text-primary uppercase tracking-[0.2em] mb-4">
                                {tagline}
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight mb-6">
                                {headline}
                            </h2>
                            <p className="text-xl text-muted-foreground leading-relaxed">
                                {description}
                            </p>
                        </div>

                        <ul className="grid sm:grid-cols-2 gap-4">
                            {bullets.map((bullet, i) => (
                                <li key={i} className="flex items-start gap-3 group">
                                    <div className="mt-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                        <Check className="w-3 h-3 text-primary" />
                                    </div>
                                    <span className="text-sm font-medium leading-tight">{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Visual */}
                    <motion.div
                        initial={{ opacity: 0, x: reverse ? -60 : 60, scale: 0.95 }}
                        whileInView={{ opacity: 1, x: 0, scale: 1 }}
                        viewport={{ once: true }}
                        className="flex-1 w-full"
                    >
                        <div className="relative group">
                            {/* Background Glow */}
                            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />

                            <div className="relative rounded-3xl border bg-card shadow-2xl overflow-hidden aspect-[4/3] flex items-center justify-center">
                                {visual}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
