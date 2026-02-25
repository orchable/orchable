import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
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
                        <Shield className="w-5 h-5 text-primary" />
                        <span className="font-bold tracking-tight uppercase text-xs">Privacy Policy</span>
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
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
                        <p className="text-muted-foreground mb-12">Last Updated: February 25, 2026</p>

                        <div className="prose prose-invert max-w-none space-y-10 text-white/80 leading-relaxed">
                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
                                <p>
                                    At Orchable, we respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">2. The Data We Collect</h2>
                                <p>
                                    We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 mt-4">
                                    <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
                                    <li><strong>Contact Data</strong> includes email address and telephone numbers.</li>
                                    <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
                                    <li><strong>Usage Data</strong> includes information about how you use our website, products and services.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Data</h2>
                                <p>
                                    We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 mt-4">
                                    <li>To register you as a new customer.</li>
                                    <li>To provide and manage your account.</li>
                                    <li>To process and deliver your orders.</li>
                                    <li>To manage our relationship with you.</li>
                                    <li>To improve our website, products/services, marketing, customer relationships and experiences.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
                                <p>
                                    We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">5. Your Legal Rights</h2>
                                <p>
                                    Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, to object to processing, and the right to withdraw consent.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">6. Contact Us</h2>
                                <p>
                                    If you have any questions about this privacy policy or our privacy practices, please contact us at:
                                </p>
                                <p className="mt-4 font-bold text-primary">privacy@orchable.app</p>
                            </section>
                        </div>
                    </motion.div>
                </div>
            </section>

            <footer className="py-12 border-t border-white/5 text-center text-muted-foreground text-sm">
                <p>© 2026 Orchable · Built with Secure Privacy in Mind</p>
            </footer>
        </div>
    );
}
