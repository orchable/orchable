import { useState, useMemo } from "react";

const models = [
    // ── GEMINI ──────────────────────────────────────────────────────────────
    { family: "Gemini", name: "Gemini 3 Pro (preview)", input: 2.00, output: 12.00, context: "200K+", tier: "flagship", tag: "next-gen" },
    { family: "Gemini", name: "Gemini 2.5 Pro (≤200K)", input: 1.25, output: 10.00, context: "2M", tier: "premium", tag: "long-ctx" },
    { family: "Gemini", name: "Gemini 2.5 Pro (>200K)", input: 2.50, output: 15.00, context: "2M", tier: "premium", tag: "long-ctx" },
    { family: "Gemini", name: "Gemini 2.5 Flash", input: 0.15, output: 0.60, context: "2M", tier: "mid", tag: "fast" },
    { family: "Gemini", name: "Gemini 2.5 Flash-Lite", input: 0.075, output: 0.30, context: "1M", tier: "budget", tag: "cheapest" },
    { family: "Gemini", name: "Gemini 2.0 Flash", input: 0.10, output: 0.40, context: "1M", tier: "budget", tag: "fast · multimodal" },

    // ── GPT ─────────────────────────────────────────────────────────────────
    { family: "GPT", name: "GPT-5.2 Pro", input: 21.00, output: 168.00, context: "200K", tier: "flagship", tag: "premium" },
    { family: "GPT", name: "GPT-5.2", input: 1.75, output: 14.00, context: "200K", tier: "premium", tag: "coding" },
    { family: "GPT", name: "GPT-5", input: 1.25, output: 10.00, context: "128K", tier: "premium", tag: "flagship" },
    { family: "GPT", name: "GPT-5 Mini", input: 0.25, output: 2.00, context: "200K", tier: "mid", tag: "affordable" },
    { family: "GPT", name: "GPT-5 Nano", input: 0.05, output: 0.40, context: "128K", tier: "budget", tag: "bulk" },
    { family: "GPT", name: "GPT-4.1", input: 3.00, output: 12.00, context: "128K", tier: "premium", tag: "legacy" },
    { family: "GPT", name: "GPT-4.1 Mini", input: 0.80, output: 3.20, context: "128K", tier: "mid", tag: "legacy" },
    { family: "GPT", name: "GPT-4.1 Nano", input: 0.20, output: 0.80, context: "128K", tier: "budget", tag: "legacy" },

    // ── CLAUDE ──────────────────────────────────────────────────────────────
    { family: "Claude", name: "Claude Opus 4.6", input: 5.00, output: 25.00, context: "200K", tier: "flagship", tag: "research" },
    { family: "Claude", name: "Claude Sonnet 4.6", input: 3.00, output: 15.00, context: "200K", tier: "premium", tag: "coding" },
    { family: "Claude", name: "Claude Haiku 4.5", input: 1.00, output: 5.00, context: "200K", tier: "mid", tag: "fast" },

    // ── QWEN ────────────────────────────────────────────────────────────────
    { family: "Qwen", name: "Qwen Max", input: 1.20, output: 6.00, context: "32K", tier: "flagship", tag: "reasoning · SOTA" },
    { family: "Qwen", name: "Qwen Plus", input: 0.40, output: 1.20, context: "131K", tier: "mid", tag: "balanced" },
    { family: "Qwen", name: "Qwen Coder Plus", input: 0.12, output: 0.75, context: "131K", tier: "mid", tag: "coding · 128K" },
    { family: "Qwen", name: "Qwen Coder Base", input: 0.05, output: 0.40, context: "131K", tier: "budget", tag: "efficient · coding" },

    // ── DEEPSEEK ────────────────────────────────────────────────────────────
    { family: "DeepSeek", name: "DeepSeek Chat (V3)", input: 0.14, output: 0.28, context: "128K", tier: "budget", tag: "best-value" },
    { family: "DeepSeek", name: "DeepSeek Reasoner (R1)", input: 0.55, output: 2.19, context: "128K", tier: "mid", tag: "reasoning" },

    // ── MINIMAX ──────────────────────────────────────────────────────────────
    { family: "MiniMax", name: "MiniMax M2.5-Lightning", input: 0.30, output: 2.40, context: "1M", tier: "premium", tag: "100 TPS · agentic" },
    { family: "MiniMax", name: "MiniMax M2.5", input: 0.15, output: 1.20, context: "1M", tier: "mid", tag: "agentic · SOTA" },
    { family: "MiniMax", name: "MiniMax M2 Her", input: 0.30, output: 1.20, context: "1M", tier: "mid", tag: "multimodal" },
    { family: "MiniMax", name: "MiniMax M2.1", input: 0.27, output: 0.95, context: "1M", tier: "mid", tag: "balanced" },
    { family: "MiniMax", name: "MiniMax M2", input: 0.26, output: 1.00, context: "1M", tier: "mid", tag: "stable" },
    { family: "MiniMax", name: "MiniMax M1", input: 0.40, output: 2.20, context: "1M", tier: "mid", tag: "reasoning · OSS" },
    { family: "MiniMax", name: "MiniMax-01", input: 0.20, output: 1.10, context: "4M", tier: "budget", tag: "4M ctx · OSS" },
];

const FAMILY_META = {
    Gemini: { color: "#4285F4", bg: "#EBF3FF", dot: "#1A73E8" },
    GPT: { color: "#10A37F", bg: "#E6F6F1", dot: "#0D8A6B" },
    Claude: { color: "#D97757", bg: "#FDF0EB", dot: "#C0623C" },
    Qwen: { color: "#7B4FBF", bg: "#F2EBF9", dot: "#5E3A99" },
    DeepSeek: { color: "#E5484D", bg: "#FDEBEC", dot: "#C83237" },
    MiniMax: { color: "#0A6EBD", bg: "#E8F4FD", dot: "#0856A0" },
};

const TIER_LABEL = {
    flagship: { label: "Flagship", color: "#7B4FBF" },
    premium: { label: "Premium", color: "#1A73E8" },
    mid: { label: "Mid", color: "#0D8A6B" },
    budget: { label: "Budget", color: "#D97757" },
};

const fmt = (n) => `$${n.toFixed(2)}`;

const Bar = ({ val, max, color }) => (
    <div style={{ position: "relative", height: 6, background: "#F0F0F0", borderRadius: 99, overflow: "hidden", minWidth: 60 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min((val / max) * 100, 100)}%`, background: color, borderRadius: 99, transition: "width .4s ease" }} />
    </div>
);

export default function App() {
    const [selectedFamilies, setSelectedFamilies] = useState(new Set(["Gemini", "GPT", "Claude", "Qwen", "DeepSeek", "MiniMax"]));
    const [sortKey, setSortKey] = useState("input");
    const [sortDir, setSortDir] = useState("asc");
    const [search, setSearch] = useState("");

    const toggleFamily = (f) => {
        setSelectedFamilies(prev => {
            const next = new Set(prev);
            if (next.has(f)) { if (next.size > 1) next.delete(f); } else next.add(f);
            return next;
        });
    };

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("asc"); }
    };

    const filtered = useMemo(() => {
        return models
            .filter(m => selectedFamilies.has(m.family))
            .filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.family.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => {
                let av = a[sortKey], bv = b[sortKey];
                if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
                return sortDir === "asc" ? av - bv : bv - av;
            });
    }, [selectedFamilies, sortKey, sortDir, search]);

    const maxInput = Math.max(...models.map(m => m.input));
    const maxOutput = Math.max(...models.map(m => m.output));

    const SortIcon = ({ k }) => (
        <span style={{ opacity: sortKey === k ? 1 : 0.3, fontSize: 10, marginLeft: 4 }}>
            {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
        </span>
    );

    return (
        <div style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", background: "#F7F5F2", minHeight: "100vh", padding: "32px 20px" }}>
            {/* Header */}
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 11, letterSpacing: 4, color: "#999", textTransform: "uppercase", marginBottom: 6 }}>Updated Feb 2026</div>
                    <h1 style={{ margin: 0, fontSize: "clamp(22px, 4vw, 36px)", fontWeight: 700, color: "#1A1A1A", letterSpacing: -1 }}>
                        LLM API Pricing<br />
                        <span style={{ color: "#999", fontWeight: 400 }}>— Input / Output / 1M tokens</span>
                    </h1>
                </div>

                {/* Family filter pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                    {Object.entries(FAMILY_META).map(([f, meta]) => {
                        const active = selectedFamilies.has(f);
                        return (
                            <button key={f} onClick={() => toggleFamily(f)} style={{
                                border: `2px solid ${active ? meta.dot : "#DDD"}`,
                                background: active ? meta.bg : "transparent",
                                color: active ? meta.dot : "#AAA",
                                borderRadius: 99, padding: "5px 14px",
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                                fontFamily: "inherit", transition: "all .15s",
                                letterSpacing: 0.5,
                            }}>
                                {f}
                            </button>
                        );
                    })}
                    {/* Search */}
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="🔍  search model..."
                        style={{
                            border: "2px solid #DDD", borderRadius: 99, padding: "5px 14px",
                            fontSize: 12, fontFamily: "inherit", background: "white",
                            color: "#333", outline: "none", minWidth: 160,
                        }}
                    />
                </div>

                {/* Sorting legend */}
                <div style={{ fontSize: 11, color: "#AAA", marginBottom: 12, letterSpacing: 0.3 }}>
                    {filtered.length} models — click column headers to sort
                </div>

                {/* Table */}
                <div style={{ background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 20px rgba(0,0,0,.06)", border: "1px solid #EBEBEB" }}>
                    {/* Table header */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "140px 1fr 120px 120px 80px 80px",
                        gap: 0, padding: "12px 20px",
                        background: "#FAFAFA", borderBottom: "2px solid #EBEBEB",
                        fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1.5, textTransform: "uppercase",
                        alignItems: "center",
                    }}>
                        <div onClick={() => handleSort("family")} style={{ cursor: "pointer" }}>Family <SortIcon k="family" /></div>
                        <div onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>Model <SortIcon k="name" /></div>
                        <div onClick={() => handleSort("input")} style={{ cursor: "pointer" }}>Input/1M <SortIcon k="input" /></div>
                        <div onClick={() => handleSort("output")} style={{ cursor: "pointer" }}>Output/1M <SortIcon k="output" /></div>
                        <div onClick={() => handleSort("tier")} style={{ cursor: "pointer" }}>Tier <SortIcon k="tier" /></div>
                        <div>Context</div>
                    </div>

                    {/* Rows */}
                    {filtered.map((m, i) => {
                        const meta = FAMILY_META[m.family];
                        const tier = TIER_LABEL[m.tier];
                        return (
                            <div key={m.name} style={{
                                display: "grid",
                                gridTemplateColumns: "140px 1fr 120px 120px 80px 80px",
                                gap: 0, padding: "14px 20px",
                                borderBottom: i < filtered.length - 1 ? "1px solid #F0F0F0" : "none",
                                alignItems: "center",
                                background: i % 2 === 0 ? "white" : "#FDFCFB",
                                transition: "background .1s",
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = meta.bg}
                                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "white" : "#FDFCFB"}
                            >
                                {/* Family badge */}
                                <div>
                                    <span style={{
                                        display: "inline-flex", alignItems: "center", gap: 5,
                                        background: meta.bg, color: meta.dot,
                                        borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700,
                                    }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.dot, display: "inline-block" }} />
                                        {m.family}
                                    </span>
                                </div>

                                {/* Model name + tag */}
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", marginBottom: 2 }}>{m.name}</div>
                                    <span style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, textTransform: "uppercase" }}>{m.tag}</span>
                                </div>

                                {/* Input */}
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>{fmt(m.input)}</div>
                                    <Bar val={m.input} max={maxInput} color={meta.dot} />
                                </div>

                                {/* Output */}
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>{fmt(m.output)}</div>
                                    <Bar val={m.output} max={maxOutput} color={meta.dot} />
                                </div>

                                {/* Tier */}
                                <div>
                                    <span style={{ fontSize: 11, color: tier.color, fontWeight: 700, letterSpacing: 0.3 }}>
                                        {tier.label}
                                    </span>
                                </div>

                                {/* Context */}
                                <div style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>{m.context}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Discount notes */}
                <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                    {[
                        { title: "Anthropic Batch API", desc: "−50% tất cả Claude models (async 24h)" },
                        { title: "OpenAI Batch API", desc: "−50% tất cả GPT models (async 24h)" },
                        { title: "DeepSeek Off-peak", desc: "−50~75% (16:30–00:30 GMT)" },
                        { title: "MiniMax M2.5-Lightning", desc: "100 TPS · $1/giờ liên tục · MIT license" },
                        { title: "MiniMax Context đặc biệt", desc: "MiniMax-01 hỗ trợ tới 4M tokens — rẻ nhất cho long-ctx" },
                        { title: "Prompt Caching", desc: "Claude −90%, GPT −90%, Gemini ~75% input" },
                        { title: "Gemini Free Tier", desc: "1,000 req/ngày — tốt cho prototyping" },
                    ].map(n => (
                        <div key={n.title} style={{ background: "white", border: "1px solid #EBEBEB", borderRadius: 10, padding: "12px 16px" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A1A", letterSpacing: 0.5, marginBottom: 3 }}>{n.title}</div>
                            <div style={{ fontSize: 12, color: "#888" }}>{n.desc}</div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 16, fontSize: 11, color: "#BBB", textAlign: "center" }}>
                    Nguồn: openai.com · anthropic.com · ai.google.dev · deepseek.com · alibaba cloud · minimax.io · pricepertoken.com — cập nhật tháng 2/2026
                </div>
            </div>
        </div>
    );
}