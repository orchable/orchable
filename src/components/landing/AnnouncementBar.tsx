import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AnnouncementBar() {
    const navigate = useNavigate();

    return (
        <div className="py-2 px-4 relative overflow-hidden hidden sm:block border-b border-primary/5 bg-black/5 dark:bg-black/20">
            <div className="max-w-7xl mx-auto flex justify-center items-center gap-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => navigate('/hub')}
                >
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">New</span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                        Community Hub is live — Discover 100+ shared pipelines and templates
                    </p>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </motion.div>
            </div>

            {/* Subtle glow effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-full bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
        </div>
    );
}
