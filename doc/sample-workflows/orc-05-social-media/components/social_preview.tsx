const Component = ({ data, schema }) => {
    const posts = data?.output_data || [];
    const [filter, setFilter] = React.useState('ALL');

    const filteredPosts = filter === 'ALL'
        ? posts
        : posts.filter(p => p.platform === filter);

    const getPlatformIcon = (platform) => {
        switch (platform) {
            case 'LINKEDIN': return <Users className="w-4 h-4 text-blue-400" />;
            case 'TWITTER': return <Zap className="w-4 h-4 text-sky-400" />;
            case 'THREADS': return <Activity className="w-4 h-4 text-slate-200" />;
            case 'FACEBOOK': return <Heart className="w-4 h-4 text-blue-600" />;
            default: return <Sparkles className="w-4 h-4 text-primary" />;
        }
    };

    const getPlatformColor = (platform) => {
        switch (platform) {
            case 'LINKEDIN': return "border-blue-500/20 bg-blue-500/5";
            case 'TWITTER': return "border-sky-500/20 bg-sky-500/5";
            case 'THREADS': return "border-white/10 bg-white/5";
            case 'FACEBOOK': return "border-indigo-500/20 bg-indigo-500/5";
            default: return "border-primary/20 bg-primary/5";
        }
    };

    if (!posts.length) {
        return (
            <Card className="bg-slate-900 border-slate-800 p-12 flex flex-col items-center text-slate-500">
                <Layers className="w-12 h-12 mb-4 opacity-10" />
                <p>No social media posts generated.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Platform Filter */}
            <div className="flex flex-wrap gap-2 pb-4 border-b border-white/5">
                {['ALL', 'LINKEDIN', 'TWITTER', 'THREADS', 'FACEBOOK'].map(p => (
                    <button
                        key={p}
                        onClick={() => setFilter(p)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-[10px] font-bold tracking-tight transition-all border",
                            filter === p
                                ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                : "bg-white/5 text-slate-500 border-white/10 hover:border-white/20"
                        )}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPosts.map((post, idx) => (
                    <Card key={idx} className={cn("transition-all duration-300", getPlatformColor(post.platform))}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                            <div className="flex items-center gap-2">
                                {getPlatformIcon(post.platform)}
                                <CardTitle className="text-xs font-bold tracking-widest">{post.platform}</CardTitle>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono opacity-50">
                                {post.char_count} chars
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-4 pt-1 space-y-4">
                            {/* Post Content */}
                            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                                {post.content}
                            </div>

                            {/* Hashtags */}
                            <div className="flex flex-wrap gap-1.5">
                                {post.hashtags?.map((tag, i) => (
                                    <span key={i} className="text-primary hover:underline cursor-pointer text-xs font-medium">
                                        {tag.startsWith('#') ? tag : `#${tag}`}
                                    </span>
                                ))}
                            </div>

                            {/* Action Preview (Mock) */}
                            <div className="pt-4 border-t border-white/5 flex items-center justify-between opacity-50">
                                <div className="flex gap-4">
                                    <Heart className="w-4 h-4" />
                                    <Activity className="w-4 h-4" />
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <Badge className="bg-white/5 text-[9px] font-bold">PREVIEW ONLY</Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};
