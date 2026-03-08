import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Github, Menu, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useGitHubStars } from '@/hooks/useGitHubStars';

export function LandingNav() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: stars } = useGitHubStars();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Product', href: '#features' },
        { label: 'Hub', href: '/hub' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Docs', href: 'https://docs.orchable.app' },
    ];

    return (
        <nav
            className={cn(
                "relative w-full z-50 transition-all duration-300",
                isScrolled ? "h-16" : "h-20"
            )}
        >
            <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
                {/* Logo */}
                <div
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => navigate('/')}
                >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform overflow-hidden">
                        <img src="/icon.jpg" alt="Orchable Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Orchable</span>
                </div>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            onClick={(e) => {
                                if (link.href.startsWith('/')) {
                                    e.preventDefault();
                                    navigate(link.href);
                                }
                            }}
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-3">
                    {stars !== undefined && stars >= 1000 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => window.open('https://github.com/orchable/orchable', '_blank')}
                        >
                            <Github className="w-4 h-4 mr-2" />
                            {stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars}
                        </Button>
                    )}

                    <div className="h-6 w-px bg-border mx-2" />

                    {user ? (
                        <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
                            onClick={() => navigate('/designer')}
                        >
                            Go to Dashboard
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/login')}
                            >
                                Sign In
                            </Button>
                            <Button
                                size="sm"
                                className="bg-primary hover:bg-primary/90 shadow-glow"
                                onClick={() => navigate('/login')}
                            >
                                Start Free Today
                            </Button>
                        </>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-background border-b overflow-hidden shadow-xl"
                    >
                        <div className="px-6 py-8 flex flex-col gap-6">
                            {navLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    className="text-lg font-semibold"
                                    onClick={(e) => {
                                        setMobileMenuOpen(false);
                                        if (link.href.startsWith('/')) {
                                            e.preventDefault();
                                            navigate(link.href);
                                        }
                                    }}
                                >
                                    {link.label}
                                </a>
                            ))}
                            <hr className="border-border" />
                            <div className="flex flex-col gap-3">
                                {user ? (
                                    <Button
                                        className="w-full h-12 text-lg"
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            navigate('/designer');
                                        }}
                                    >
                                        Go to Dashboard
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="w-full h-12 text-lg"
                                            onClick={() => {
                                                setMobileMenuOpen(false);
                                                navigate('/login');
                                            }}
                                        >
                                            Sign In
                                        </Button>
                                        <Button
                                            className="w-full h-12 text-lg shadow-glow"
                                            onClick={() => {
                                                setMobileMenuOpen(false);
                                                navigate('/login');
                                            }}
                                        >
                                            Start Free Today
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
