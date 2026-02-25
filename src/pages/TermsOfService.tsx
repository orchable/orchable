import React from 'react';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
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
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="font-bold tracking-tight uppercase text-xs">Terms of Service</span>
                    </div>
                </div>
            </nav>

            <section className="pt-40 pb-32 px-6">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
                        <p className="text-muted-foreground mb-12">Last Updated: February 25, 2026</p>

                        <div className="prose prose-invert max-w-none space-y-10 text-white/80 leading-relaxed">
                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">1. Agreement to Terms</h2>
                                <p>
                                    By accessing or using Orchable, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
                                <p>
                                    Orchable provides a platform for AI pipeline orchestration, including visual designing, batch job launching, and real-time monitoring. We reserve the right to modify or discontinue any part of the service at any time.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">3. User Responsibilities</h2>
                                <p>
                                    You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to use the service only for lawful purposes and in accordance with these Terms.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">4. Intellectual Property</h2>
                                <p>
                                    The service and its original content, features, and functionality are and will remain the exclusive property of Orchable and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">5. Limitation of Liability</h2>
                                <p>
                                    In no event shall Orchable, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">6. Governing Law</h2>
                                <p>
                                    These Terms shall be governed and construed in accordance with the laws of our jurisdiction, without regard to its conflict of law provisions.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">7. Changes to Terms</h2>
                                <p>
                                    We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide at least 30 days' notice before any new terms take effect.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">8. Contact Us</h2>
                                <p>
                                    If you have any questions about these Terms, please contact us at:
                                </p>
                                <p className="mt-4 font-bold text-primary">legal@orchable.app</p>
                            </section>
                        </div>
                    </motion.div>
                </div>
            </section>

            <footer className="py-12 border-t border-white/5 text-center text-muted-foreground text-sm">
                <p>© 2026 Orchable · Built for Legal Compliance</p>
            </footer>
        </div>
    );
}
