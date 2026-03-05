const Component = ({ data, schema }) => {
    const lessonPlans = data?.output_data || [];
    const [activeIdx, setActiveIdx] = React.useState(0);
    const activePlan = lessonPlans[activeIdx]?.final_lesson_plan;

    if (!lessonPlans.length) {
        return (
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="flex flex-col items-center justify-center p-12 text-slate-500">
                    <Brain className="w-12 h-12 mb-4 opacity-20" />
                    <p>No lesson plans generated yet.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full">
            {/* Sidebar: Topic List */}
            <div className="w-full md:w-64 space-y-2 border-r border-white/5 pr-4 overflow-y-auto">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Topics Generated</h3>
                {lessonPlans.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveIdx(idx)}
                        className={cn(
                            "w-full text-left p-3 rounded-xl transition-all border",
                            activeIdx === idx
                                ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                                : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10"
                        )}
                    >
                        <div className="text-[10px] opacity-50 mb-1">Topic #{idx + 1}</div>
                        <div className="text-sm font-medium truncate">{item.final_lesson_plan?.title || "Untitled Lesson"}</div>
                    </button>
                ))}
            </div>

            {/* Main Content: Lesson Details */}
            {activePlan && (
                <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                    {/* Header Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="bg-white/5 border-white/10 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Activity className="w-12 h-12" />
                            </div>
                            <CardHeader className="pb-2">
                                <CardDescription className="text-[10px] uppercase font-bold">Coherence Score</CardDescription>
                                <CardTitle className={cn(
                                    "text-3xl font-bold",
                                    activePlan.coherence_score > 80 ? "text-green-500" : "text-amber-500"
                                )}>
                                    {activePlan.coherence_score}%
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="bg-white/5 border-white/10">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-[10px] uppercase font-bold">Status</CardDescription>
                                <div className="flex items-center gap-2 mt-1">
                                    {lessonPlans[activeIdx].status === 'PASS' ? (
                                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">READY TO TEACH</Badge>
                                    ) : (
                                        <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">REVISION NEEDED</Badge>
                                    )}
                                </div>
                            </CardHeader>
                        </Card>
                        <Card className="bg-white/5 border-white/10">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-[10px] uppercase font-bold">Total Stages</CardDescription>
                                <div className="text-2xl font-bold text-slate-300">3 Stages</div>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Issues / Gaps Alert */}
                    {(lessonPlans[activeIdx].issues?.length > 0 || activePlan.gaps?.length > 0) && (
                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-amber-500 mb-1">QA Observations</h4>
                                <ul className="text-xs text-amber-500/80 list-disc list-inside space-y-1">
                                    {[...(lessonPlans[activeIdx].issues || []), ...(activePlan.gaps || [])].map((issue, i) => (
                                        <li key={i}>{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Lesson Summary */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Executive Summary
                        </h4>
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 text-sm leading-relaxed">
                            {activePlan.summary}
                        </div>
                    </div>

                    {/* Activities Timeline */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold flex items-center gap-2 text-primary">
                            <Zap className="w-4 h-4" />
                            Instructional Activities
                        </h4>
                        <div className="space-y-0 relative before:content-[''] before:absolute before:left-6 before:top-4 before:bottom-4 before:w-px before:bg-white/5">
                            {activePlan.activities?.map((act, i) => (
                                <div key={i} className="relative pl-12 pb-8 last:pb-0">
                                    <div className="absolute left-4 top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-primary z-10" />
                                    <Card className="bg-white/[0.03] border-white/5 hover:border-white/10 transition-all">
                                        <CardHeader className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className="text-[9px] uppercase font-mono tracking-tighter">
                                                    {act.type} • {act.duration}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-base text-slate-200">{act.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 space-y-3">
                                            <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-white/10 pl-3">
                                                {act.instructions}
                                            </p>
                                            {act.materials?.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {act.materials.map((m, j) => (
                                                        <Badge key={j} className="text-[10px] bg-white/5 text-slate-500 font-normal">
                                                            {m}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
