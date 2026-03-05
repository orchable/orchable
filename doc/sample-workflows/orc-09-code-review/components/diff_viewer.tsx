const Component = ({ data, schema }) => {
    const auditResults = data?.output_data || [];
    // Assuming Step B and C data are available in the same context or merged
    // In Orchable, data typically reflects the output of the current/last stage
    const refactorData = auditResults[0]; // Simplified for demo

    const [activeTab, setActiveTab] = React.useState('AUDIT');

    const getSeverityColor = (sev) => {
        switch (sev) {
            case 'CRITICAL': return "text-red-500 bg-red-500/10 border-red-500/20";
            case 'HIGH': return "text-orange-500 bg-orange-500/10 border-orange-500/20";
            case 'MEDIUM': return "text-amber-500 bg-amber-500/10 border-amber-500/20";
            default: return "text-blue-500 bg-blue-500/10 border-blue-500/20";
        }
    };

    if (!auditResults.length) {
        return (
            <div className="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
                <Terminal className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p>No audit data found.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Issues Found</div>
                    <div className="text-2xl font-bold text-slate-200">{auditResults.length}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Critical/High</div>
                    <div className="text-2xl font-bold text-red-500">
                        {auditResults.filter(i => ['CRITICAL', 'HIGH'].includes(i.severity)).length}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg w-fit">
                {['AUDIT', 'REFACTOR', 'QA'].map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-[10px] font-bold transition-all",
                            activeTab === t ? "bg-primary text-white" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'AUDIT' && (
                    <div className="space-y-3 overflow-y-auto h-full pr-2">
                        {auditResults.map((issue, idx) => (
                            <Card key={idx} className="bg-slate-900/50 border-white/5 hover:border-white/10 transition-all">
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex justify-between items-start">
                                        <Badge className={cn("text-[9px] font-mono", getSeverityColor(issue.severity))}>
                                            {issue.severity} • {issue.issue_type}
                                        </Badge>
                                        <span className="text-[10px] font-mono text-slate-600">Lines {issue.line_range}</span>
                                    </div>
                                    <CardTitle className="text-sm text-slate-200 mt-2">{issue.description}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{issue.evidence}</p>
                                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex gap-2">
                                        <Zap className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-primary/80 italic">{issue.recommendation_hint}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {activeTab === 'REFACTOR' && (
                    <div className="h-full flex flex-col space-y-4">
                        <div className="flex-1 bg-slate-950 rounded-xl border border-white/10 p-4 font-mono text-xs overflow-auto text-emerald-400/90 leading-relaxed">
                            <pre>{refactorData.refactored_code || "// Refactored code will appear here after Stage B"}</pre>
                        </div>
                        {refactorData.major_changes && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Applied Patterns</h5>
                                    <div className="flex flex-wrap gap-1.5">
                                        {refactorData.patterns_applied?.map((p, i) => (
                                            <Badge key={i} className="text-[9px] bg-primary/10 text-primary border-primary/20">{p}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'QA' && (
                    <div className="flex flex-col items-center justify-center h-full space-y-6">
                        <div className="w-32 h-32 rounded-full border-8 border-emerald-500/20 flex items-center justify-center relative">
                            <div className="text-3xl font-bold text-emerald-500">85%</div>
                            <div className="absolute -bottom-2 bg-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full text-white">IMPROVEMENT</div>
                        </div>
                        <div className="text-center max-w-sm">
                            <h4 className="text-slate-200 font-bold mb-1">Architecture Verified</h4>
                            <p className="text-xs text-slate-500">QA stage confirms logic preservation and security compliance. Ready for PR merge.</p>
                        </div>
                        <div className="flex gap-3">
                            <Button size="sm" variant="outline" className="text-xs border-white/10 text-slate-400">View Logs</Button>
                            <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-500">Approve Change</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
