import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function PricingSection() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const tiers = [
        {
            name: 'Free',
            price: '$0',
            description: 'Start your journey. Built for creators.',
            features: [
                'Local Execution (Browser)',
                'No Account Required',
                'Unlimited Stages & Tasks (Local)',
                'Visual Pipeline Designer',
                'Basic Hub Community Access'
            ],
            cta: 'Start Now — For Free',
            variant: 'outline'
        },
        {
            name: 'Registered',
            price: '$0',
            description: 'Cloud sync for serious creators.',
            features: [
                'Everything in Free',
                '100 Free Monthly Tasks (Cloud)',
                'Cloud-persistent history',
                'Cross-device sync (Supabase)',
                'Priority task queueing'
            ],
            cta: 'Create Free Account',
            popular: true,
            variant: 'default'
        },
        {
            name: 'Professional',
            price: '$19',
            description: 'Power your business 24/7.',
            features: [
                'Everything in Free',
                '24/7 Cloud Execution',
                'API Key Rotation Pool',
                'Webhook Notifications',
                'Team Collaboration'
            ],
            cta: 'Coming Soon',
            disabled: true,
            variant: 'outline'
        }
    ];

    return (
        <section id="pricing" className="py-24 px-6 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-black mb-6 underline decoration-primary/30 underline-offset-8">Simple Pricing</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Start free today. Upgrade only when you outgrow your local machine.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {tiers.map((tier, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className={cn(
                                "relative p-8 rounded-[2.5rem] border flex flex-col shadow-xl transition-all duration-300",
                                tier.popular
                                    ? "border-primary bg-card/60 shadow-primary/10 -translate-y-4"
                                    : "bg-card border-border hover:border-primary/30"
                            )}
                        >
                            {tier.popular && (
                                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-accent border-0 text-white font-bold tracking-wider uppercase text-[10px]">
                                    Most Popular
                                </Badge>
                            )}

                            <div className="mb-8">
                                <h3 className="text-2xl font-black mb-2">{tier.name}</h3>
                                <p className="text-sm text-muted-foreground">{tier.description}</p>
                            </div>

                            <div className="mb-8 flex items-baseline gap-1">
                                <span className="text-5xl font-black tracking-tighter">{tier.price}</span>
                                <span className="text-muted-foreground font-bold">/month</span>
                            </div>

                            <ul className="space-y-4 mb-10 flex-1">
                                {tier.features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-primary shrink-0" />
                                        <span className="text-sm font-semibold">{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                size="lg"
                                variant={tier.variant as "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"}
                                disabled={tier.disabled}
                                className={cn(
                                    "w-full h-14 text-lg font-black rounded-2xl",
                                    tier.popular && "bg-primary hover:bg-primary/90 text-white shadow-glow"
                                )}
                                onClick={() => user ? navigate('/designer') : navigate('/login')}
                            >
                                {tier.cta}
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
