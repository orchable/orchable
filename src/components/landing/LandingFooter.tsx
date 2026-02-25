import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Github, Twitter, Mail, ExternalLink } from 'lucide-react';

const footerLinks = [
    {
        title: "Product",
        links: [
            { label: "Designer", href: "/designer" },
            { label: "Launcher", href: "/launcher" },
            { label: "Monitor", href: "/monitor" },
            { label: "Community Hub", href: "/hub" }
        ]
    },
    {
        title: "Resources",
        links: [
            { label: "Blog", href: "/docs/blog" },
            { label: "Pricing", href: "/pricing" },
            { label: "Changelog", href: "/docs/changelog" },
            { label: "Wishlist", href: "/docs/wishlist" }
        ]
    },
    {
        title: "Docs",
        links: [
            { label: "Getting Started", href: "/docs/introduction" },
            { label: "Architecture", href: "/docs/architecture/system-overview" },
            { label: "Guides", href: "/docs/guides/operational-guide" },
            { label: "API Reference", href: "/docs/reference/api-keys" }
        ]
    },
    {
        title: "Community",
        links: [
            { label: "Wall of Love", href: "/wall-of-love" },
            { label: "GitHub", href: "https://github.com/orchable/orchable", isExternal: true },
            { label: "Feature Requests", href: "https://github.com/orchable/orchable/discussions", isExternal: true }
        ]
    },
    {
        title: "Legal",
        links: [
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" }
        ]
    }
];

export default function LandingFooter() {
    const navigate = useNavigate();

    const handleLinkClick = (href: string, isExternal?: boolean) => {
        if (isExternal) {
            window.open(href, '_blank');
        } else {
            // Check if it's a doc link
            if (href.startsWith('/docs')) {
                window.location.href = href;
            } else {
                navigate(href);
            }
        }
    };

    return (
        <footer className="bg-[#050B14] border-t border-white/5 pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-12 mb-20">
                    {/* Logo Column */}
                    <div className="col-span-2">
                        <div className="flex items-center gap-2 font-bold text-xl mb-6">
                            <img src="/icon.jpg" alt="Orchable Logo" className="w-6 h-6 rounded-md object-cover" />
                            Orchable
                        </div>
                        <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                            The next generation of AI pipeline orchestration. Built for teams who want to build faster, scale further, and automate everything.
                        </p>
                        <div className="flex items-center gap-4 mt-8">
                            <a href="https://github.com/orchable/orchable" target="_blank" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all">
                                <Github className="w-5 h-5" />
                            </a>
                            <a href="#" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all">
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a href="mailto:contact@orchable.app" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Nav Columns */}
                    {footerLinks.map((group) => (
                        <div key={group.title}>
                            <h4 className="font-bold text-sm uppercase tracking-wider mb-6 text-white/50">
                                {group.title}
                            </h4>
                            <ul className="space-y-4">
                                {group.links.map((link) => (
                                    <li key={link.label}>
                                        <button
                                            onClick={() => handleLinkClick(link.href, link.isExternal)}
                                            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
                                        >
                                            {link.label}
                                            {link.isExternal && <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Bar */}
                <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                        <span>© 2026 Orchable Inc.</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            All systems operational
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <span>Made with ❤️ for AI Builders</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
