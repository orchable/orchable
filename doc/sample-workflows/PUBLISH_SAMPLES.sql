-- SQL Script to Publish Sample Workflows (ORC-02, ORC-05, ORC-09)
-- Target User: makexyzfun@gmail.com (4ecc3a2e-75fe-45da-b007-9a5075faa0fd)

DO $$ 
DECLARE 
    v_user_id UUID := '4ecc3a2e-75fe-45da-b007-9a5075faa0fd';
BEGIN
    -- ==========================================
    -- 1. ORC-02: Smart Lesson Plan Builder
    -- ==========================================

    -- Components
    INSERT INTO public.custom_components (id, name, description, code, is_public, created_by)
    VALUES ('c0200000-0000-0000-0000-000000000002', 'Lesson Plan Viewer', 'Sidebar + Activity Timeline viewer for multi-stage educational workflows.', $TSX$
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

      {activePlan && (
        <div className="flex-1 space-y-6 overflow-y-auto pr-2">
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

          <div className="space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Executive Summary
            </h4>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 text-sm leading-relaxed">
              {activePlan.summary}
            </div>
          </div>

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
$TSX$, FALSE, v_user_id) ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code;

    -- Prompts
    INSERT INTO public.prompt_templates (id, name, template, default_ai_settings, is_active, created_by, custom_component_id, stage_key)
    VALUES 
    ('p0200000-0000-0000-0000-00000000000a', 'ORC-02 Stage A: Pedagogical Mapper', $P$
# SYSTEM INSTRUCTION: STAGE 1 - PEDAGOGICAL MAPPER (BATCH)
> **Mode:** BATCH - Phân tích chuẩn kiến thức và lập bản đồ sư phạm.
> **Reference Data:** Tuân thủ Bloom's Taxonomy.
> **Output Compatibility:** JSON Array
## MISSION
You are the **Senior Curriculum Architect**. In **BATCH MODE**, your goal is to analyze the input learning standard or topic and determine the necessary pedagogical foundations before lesson design starts.
**FOCUS:** Deep analysis of Bloom's levels, required prior knowledge, and common student misconceptions.
**LANGUAGE:** ENGLISH.
**OUTPUT:** The output MUST be strictly valid JSON content without other comment or text.
$P$, '{"model_id": "gemini-pro-latest", "temperature": 0.7}', TRUE, v_user_id, NULL, 'mapper'),
    ('p0200000-0000-0000-0000-00000000000b', 'ORC-02 Stage B: Activity Designer', $P$
# SYSTEM INSTRUCTION: STAGE 2 - ACTIVITY DESIGNER (BATCH)
> **Mode:** BATCH - Thiết kế hoạt động học tập chi tiết.
> **Output Compatibility:** JSON Array (1:N Split)
## MISSION
You are the **Creative Instructional Designer**. Your goal is to take the pedagogical map and design engaging, effective learning activities.
**FOCUS:** Balanced activities spanning direct instruction, guided practice, and assessment.
**LANGUAGE:** ENGLISH.
**OUTPUT:** The output MUST be strictly valid JSON content without other comment or text.
$P$, '{"model_id": "gemini-flash-latest", "temperature": 1.0}', TRUE, v_user_id, NULL, 'designer'),
    ('p0200000-0000-0000-0000-00000000000c', 'ORC-02 Stage C: Coherence Validator', $P$
# SYSTEM INSTRUCTION: STAGE 3 - COHERENCE VALIDATOR (BATCH)
> **Mode:** BATCH - Kiểm tra tính nhất quán và hoàn thiện giáo án.
> **Output Compatibility:** JSON Array (Merge N:1)
## MISSION
You are the **Chief Quality Auditor (Pedagogy)**. Your goal is to merge the activities back into a coherent lesson plan and validate their educational integrity.
**FOCUS:** Coherence, alignment with standards, and error detection.
**LANGUAGE:** ENGLISH.
**OUTPUT:** The output MUST be strictly valid JSON content without other comment or text.
$P$, '{"model_id": "gemini-flash-latest", "temperature": 0.3}', TRUE, v_user_id, 'c0200000-0000-0000-0000-000000000002', 'validator')
    ON CONFLICT (id) DO UPDATE SET template = EXCLUDED.template;

    -- Orchestration
    INSERT INTO public.lab_orchestrator_configs (id, name, description, steps, created_by, is_public)
    VALUES ('00200000-0000-0000-0000-000000000002', 'ORC-02: Smart Lesson Plan Builder', 'Multi-stage education pipeline: Analysis -> Design -> Validation', 
    '[{"id":"step_A","name":"A","label":"Pedagogical Mapper","stage_key":"mapper","task_type":"pedagogical_mapping","prompt_template_id":"p0200000-0000-0000-0000-00000000000a","cardinality":"1:1","dependsOn":[],"ai_settings":{"model_id":"gemini-1.5-pro-latest","generationConfig":{"temperature":0.7,"maxOutputTokens":4096}}},{"id":"step_B","name":"B","label":"Activity Designer","stage_key":"designer","task_type":"activity_design","prompt_template_id":"p0200000-0000-0000-0000-00000000000b","cardinality":"1:N","split_path":"output_data","split_mode":"per_item","dependsOn":["step_A"],"ai_settings":{"model_id":"gemini-1.5-flash-latest","generationConfig":{"temperature":1.0,"maxOutputTokens":8192}}},{"id":"step_C","name":"C","label":"Coherence Validator","stage_key":"validator","task_type":"lesson_qc","prompt_template_id":"p0200000-0000-0000-0000-00000000000c","cardinality":"N:1","dependsOn":["step_B"],"ai_settings":{"model_id":"gemini-1.5-flash-latest","generationConfig":{"temperature":0.3,"maxOutputTokens":4096}}}]'::jsonb, 
    v_user_id, TRUE) ON CONFLICT (id) DO UPDATE SET steps = EXCLUDED.steps, is_public = EXCLUDED.is_public;


    -- ==========================================
    -- 2. ORC-05: Social Media Pack Generator
    -- ==========================================

    INSERT INTO public.custom_components (id, name, description, code, is_public, created_by)
    VALUES ('c0500000-0000-0000-0000-000000000005', 'Social Pack Previewer', 'Grid previewer simulating various social media platform posts.', $TSX$
const Component = ({ data, schema }) => {
  const posts = data?.output_data || [];
  const [filter, setFilter] = React.useState('ALL');
  const filteredPosts = filter === 'ALL' ? posts : posts.filter(p => p.platform === filter);
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
  if (!posts.length) return <Card className="p-12 text-center">No posts generated.</Card>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 pb-4 border-b border-white/5">
        {['ALL', 'LINKEDIN', 'TWITTER', 'THREADS', 'FACEBOOK'].map(p => (
          <button key={p} onClick={() => setFilter(p)} className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold border", filter === p ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "bg-white/5 text-slate-500 border-white/10 hover:border-white/20")}>{p}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPosts.map((post, idx) => (
          <Card key={idx} className={cn("transition-all", getPlatformColor(post.platform))}>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-2">{getPlatformIcon(post.platform)}<CardTitle className="text-xs font-bold">{post.platform}</CardTitle></div>
              <Badge variant="outline" className="text-[10px] font-mono opacity-50">{post.char_count} chars</Badge>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-4">
              <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{post.content}</div>
              <div className="flex flex-wrap gap-1.5">{post.hashtags?.map((tag, i) => (<span key={i} className="text-primary text-xs font-medium">{tag.startsWith('#') ? tag : `#${tag}`}</span>))}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
$TSX$, FALSE, v_user_id) ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code;

    INSERT INTO public.prompt_templates (id, name, template, default_ai_settings, is_active, created_by, custom_component_id, stage_key)
    VALUES 
    ('p0500000-0000-0000-0000-00000000000a', 'ORC-05 Stage A: Message Distiller', $P$
# SYSTEM INSTRUCTION: STAGE 1 - CORE MESSAGE DISTILLER (BATCH)
> **Mode:** BATCH - Chiết xuất nội dung cốt lõi từ tài liệu gốc.
## MISSION
You are the **Lead Content Strategist**. Your goal is to identify the most compelling messages, Unique Selling Points (USPs), and Calls to Action (CTA) from a given input.
$P$, '{"model_id": "gemini-flash-latest"}', TRUE, v_user_id, NULL, 'distiller'),
    ('p0500000-0000-0000-0000-00000000000b', 'ORC-05 Stage B: Platform Adapter', $P$
# SYSTEM INSTRUCTION: STAGE 2 - PLATFORM ADAPTER (BATCH)
## MISSION
You are the **Social Media Manager Specialist**. Your goal is to adapt a core message into multiple platform-specific posts. (V1: LinkedIn, V2: X, V3: Threads, V4: FB/IG)
$P$, '{"model_id": "gemini-flash-latest"}', TRUE, v_user_id, 'c0500000-0000-0000-0000-000000000005', 'adapter')
    ON CONFLICT (id) DO UPDATE SET template = EXCLUDED.template;
    -- ORC-05
    INSERT INTO public.lab_orchestrator_configs (id, name, description, steps, created_by, is_public)
    VALUES ('00500000-0000-0000-0000-000000000005', 'ORC-05: Social Media Pack Generator', 'Multi-stage marketing pipeline', 
    '[{"id":"step_A","name":"A","label":"Message Distiller","stage_key":"distiller","task_type":"marketing_analysis","prompt_template_id":"p0500000-0000-0000-0000-00000000000a","cardinality":"1:1","dependsOn":[],"ai_settings":{"model_id":"gemini-1.5-flash-latest","generationConfig":{"temperature":0.5,"maxOutputTokens":2048}}},{"id":"step_B","name":"B","label":"Platform Adapter","stage_key":"adapter","task_type":"content_adaptation","prompt_template_id":"p0500000-0000-0000-0000-00000000000b","cardinality":"1:N","split_path":"output_data","split_mode":"per_item","dependsOn":["step_A"],"ai_settings":{"model_id":"gemini-1.5-flash-latest","generationConfig":{"temperature":1.1,"maxOutputTokens":4096}}}]'::jsonb, 
    v_user_id, TRUE) ON CONFLICT (id) DO UPDATE SET steps = EXCLUDED.steps, is_public = EXCLUDED.is_public;


    -- ==========================================
    -- 3. ORC-09: Code Review & Refactor Advisor
    -- ==========================================

    INSERT INTO public.custom_components (id, name, description, code, is_public, created_by)
    VALUES ('c0900000-0000-0000-0000-000000000009', 'Code Review Dashboard', 'Audit log, refactored code viewer, and QA validation dashboard.', $TSX$
const Component = ({ data }) => {
  const auditResults = data?.output_data || [];
  const refactorData = auditResults[0]; 
  const [activeTab, setActiveTab] = React.useState('AUDIT');
  if (!auditResults.length) return <div className="p-12 text-center opacity-50"><Terminal className="w-12 h-12 mx-auto mb-4" />No audit data found.</div>;
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="p-4 rounded-xl bg-white/5 border border-white/10"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Issues Found</div><div className="text-2xl font-bold text-slate-200">{auditResults.length}</div></div>
      </div>
      <div className="flex gap-2 p-1 bg-white/5 rounded-lg w-fit">
        {['AUDIT', 'REFACTOR', 'QA'].map(t => (<button key={t} onClick={() => setActiveTab(t)} className={cn("px-4 py-1.5 rounded-md text-[10px] font-bold transition-all", activeTab === t ? "bg-primary text-white" : "text-slate-500 hover:text-slate-300")}>{t}</button>))}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'AUDIT' && (
          <div className="space-y-3 overflow-y-auto h-full pr-2">
            {auditResults.map((issue, idx) => (
              <Card key={idx} className="bg-slate-900/50 border-white/5 p-4">
                <Badge variant="outline" className="text-[9px] mb-2">{issue.severity} • {issue.issue_type}</Badge>
                <CardTitle className="text-sm text-slate-200">{issue.description}</CardTitle>
                <p className="text-xs text-slate-400 mt-2">{issue.evidence}</p>
              </Card>
            ))}
          </div>
        )}
        {activeTab === 'REFACTOR' && <div className="h-full bg-slate-950 p-4 font-mono text-xs overflow-auto text-emerald-400/90 leading-relaxed"><pre>{refactorData.refactored_code || "// Waiting for Refactor Stage"}</pre></div>}
      </div>
    </div>
  );
};
$TSX$, FALSE, v_user_id) ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code;

    INSERT INTO public.prompt_templates (id, name, template, default_ai_settings, is_active, created_by, custom_component_id, stage_key)
    VALUES 
    ('p0900000-0000-0000-0000-00000000000a', 'ORC-09 Stage A: Deep Static Auditor', $P$
# SYSTEM INSTRUCTION: STAGE 1 - STATIC ANALYZER (THINKING MODE)
> **Mode:** BATCH - Phân tích mã nguồn chuyên sâu.
> **AI Persona:** Senior Staff Engineer / Security Expert.
## MISSION
You are the **Lead Static Security & Quality Auditor**. Your goal is to deeply analyze the provided code for non-obvious bugs, security vulnerabilities.
$P$, '{"model_id": "gemini-2.5-flash"}', TRUE, v_user_id, NULL, 'auditor'),
    ('p0900000-0000-0000-0000-00000000000b', 'ORC-09 Stage B: Refactor Architect', $P$
# SYSTEM INSTRUCTION: STAGE 2 - REFACTOR ARCHITECT (BATCH)
## MISSION
You are the **Refactor Specialist**. Your goal is to take the raw code and produce a high-quality, refactored version.
$P$, '{"model_id": "gemini-pro-latest"}', TRUE, v_user_id, NULL, 'architect'),
    ('p0900000-0000-0000-0000-00000000000c', 'ORC-09 Stage C: Quality Validator', $P$
# SYSTEM INSTRUCTION: STAGE 3 - DIFF VALIDATOR (BATCH)
## MISSION
You are the **Chief Quality Officer**. Your goal is to compare original vs refactored.
$P$, '{"model_id": "gemini-flash-latest"}', TRUE, v_user_id, 'c0900000-0000-0000-0000-000000000009', 'validator')
    ON CONFLICT (id) DO UPDATE SET template = EXCLUDED.template;
    -- ORC-09
    INSERT INTO public.lab_orchestrator_configs (id, name, description, steps, created_by, is_public)
    VALUES ('00900000-0000-0000-0000-000000000009', 'ORC-09: Code Review Advisor', 'Advanced static audit and refactor advisor', 
    '[{"id":"step_A","name":"A","label":"Deep Static Auditor","stage_key":"auditor","task_type":"security_audit","prompt_template_id":"p0900000-0000-0000-0000-00000000000a","cardinality":"1:1","dependsOn":[],"ai_settings":{"model_id":"gemini-2.0-flash-thinking-exp","generationConfig":{"temperature":0.3,"maxOutputTokens":16000}}},{"id":"step_B","name":"B","label":"Refactor Architect","stage_key":"architect","task_type":"code_refactor","prompt_template_id":"p0900000-0000-0000-0000-00000000000b","cardinality":"1:1","dependsOn":["step_A"],"ai_settings":{"model_id":"gemini-1.5-pro-latest","generationConfig":{"temperature":0.7,"maxOutputTokens":8192}}},{"id":"step_C","name":"C","label":"Quality Validator","stage_key":"validator","task_type":"qa_validation","prompt_template_id":"p0900000-0000-0000-0000-00000000000c","cardinality":"1:1","dependsOn":["step_B"],"ai_settings":{"model_id":"gemini-1.5-flash-latest","generationConfig":{"temperature":0.2,"maxOutputTokens":4096}}}]'::jsonb, 
    v_user_id, TRUE) ON CONFLICT (id) DO UPDATE SET steps = EXCLUDED.steps, is_public = EXCLUDED.is_public;

    RAISE NOTICE 'Sample workflows published successfully for user %', v_user_id;
END $$;
