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
-- Config: ORC-10: Advanced Lesson Plan Generator
INSERT INTO public.lab_orchestrator_configs (id, name, description, steps, is_public, created_at, updated_at)
VALUES ('bd5ac273-94a8-485e-9a6e-a3947ce80458', 'ORC-10: Advanced Lesson Plan Generator', 'Tái tạo tài liệu giáo án chi tiết theo chuẩn định dạng 5E từ Khung Chương trình', '[{"id":"step_A","name":"Process 1","label":"Xác định Dự án Cuối","stage_key":"p1_final_product","task_type":"generation","cardinality":"1:1","dependsOn":[],"prompt_template_id":"2af809e5-6815-4d56-b8b8-173a94bd006c","ai_settings":{"model_id":"gemini-1.5-pro-002","generationConfig":{"temperature":0.5,"maxOutputTokens":2048}}},{"id":"step_B","name":"Process 2","label":"Sản phẩm Từng bài","stage_key":"p2_lesson_products","task_type":"generation","cardinality":"1:1","dependsOn":["step_A"],"prompt_template_id":"2af809e5-6815-4d56-b8b8-173a94bd006d","ai_settings":{"model_id":"gemini-1.5-pro-002","generationConfig":{"temperature":0.5,"maxOutputTokens":4096}}},{"id":"step_C","name":"Process 3","label":"Tóm tắt Học phần","stage_key":"p3_module_summary","task_type":"generation","cardinality":"1:1","dependsOn":["step_A","step_B"],"prompt_template_id":"2af809e5-6815-4d56-b8b8-173a94bd006e","ai_settings":{"model_id":"gemini-1.5-pro-002","generationConfig":{"temperature":0.5,"maxOutputTokens":8192}}},{"id":"step_D","name":"Process 4","label":"Giáo án Chi tiết (5E)","stage_key":"p4_detailed_lesson","task_type":"generation","cardinality":"1:1","dependsOn":["step_A","step_B","step_C"],"prompt_template_id":"2af809e5-6815-4d56-b8b8-173a94bd006f","ai_settings":{"model_id":"gemini-1.5-pro-002","generationConfig":{"temperature":0.5,"maxOutputTokens":8192}}}]'::jsonb, TRUE, NOW(), NOW());

-- Prompt for p1_final_product
INSERT INTO public.prompt_templates (id, name, template, default_ai_settings, is_active, stage_key)
VALUES ('2af809e5-6815-4d56-b8b8-173a94bd006c', 'Xác định Dự án Cuối', 'Bạn là chuyên gia thiết kế chương trình IoT/STEM cho học sinh 15–18 tuổi.

## MISSION
Xác định và mô tả chi tiết Sản phẩm Cuối Học phần — một dự án lớn, tích hợp mà học sinh hoàn thành để kết thúc học phần, dựa trên bảng khung chương trình được cung cấp.

## INPUT DATA
<curriculum_table>
%%input_data%%
</curriculum_table>

## INSTRUCTIONS
Nhiệm vụ của bạn: Phân tích toàn bộ bảng khung chương trình trên và xác định Sản phẩm Cuối Học phần (một dự án tích hợp). 

**Lưu ý khi thực hiện:**
- Sản phẩm cuối phải tích hợp kiến thức từ ÍT NHẤT 70% số bài trong học phần.
- Ưu tiên tính thực tế: dự án giải quyết một vấn đề có trong đời sống thực.
- Tham khảo các "Sản phẩm bài học" để đảm bảo sản phẩm cuối là sự tích hợp tự nhiên của các sản phẩm nhỏ.
- Nếu input đã chỉ rõ tên dự án (ví dụ: "Trạm Thời Tiết"), giữ nguyên và bổ sung chi tiết.

## VALIDATION
- [ ] Dự án cuối có tên cụ thể chưa?
- [ ] Có liệt kê phần cứng/phần mềm rõ ràng chưa?
- [ ] Luồng hoạt động có logic từ đầu đến cuối chưa?
- [ ] Kiến thức tích hợp có map được về các bài cụ thể chưa?

## OUTPUT FORMAT
Hãy output tiếng Việt (giữ nguyên thuật ngữ kỹ thuật tiếng Anh), định dạng Markdown, theo ĐÚNG cấu trúc sau (dài khoảng 400-600 từ):

---

## Tổng hợp Sản phẩm / Dự án Cuối Học phần

### 1. Tên dự án cuối
[Tên dự án ngắn gọn, hấp dẫn]

### 2. Mô tả tổng quan
[2–4 câu mô tả dự án, nêu rõ: dự án tạo ra cái gì, hoạt động như thế nào, phục vụ mục đích thực tế gì]

### 3. Các thành phần của hệ thống
[Liệt kê từng thành phần phần cứng và phần mềm, vai trò của từng thành phần]

### 4. Luồng hoạt động (Data Flow)
[Mô tả từng bước: dữ liệu/tín hiệu đi từ đâu → qua gì → đến đâu → hiển thị/hành động gì]

### 5. Kiến thức học phần được tích hợp
[Map từng bài học (tên bài + số bài) sang kiến thức/kỹ năng cụ thể được dùng trong dự án]

### 6. Sản phẩm đầu ra mong đợi (Demo Day)
[Mô tả cụ thể cảnh demo: HS làm gì → hệ thống phản hồi thế nào → người quan sát thấy gì]

### 7. Outcome tổng thể học phần
[Liệt kê 6–10 kỹ năng học sinh có thể làm được sau khi hoàn thành dự án]
', '{"model_id":"gemini-1.5-pro-002","generationConfig":{"temperature":0.5,"maxOutputTokens":2048}}'::jsonb, TRUE, 'p1_final_product');

-- Prompt for p2_lesson_products
INSERT INTO public.prompt_templates (id, name, template, default_ai_settings, is_active, stage_key)
VALUES ('1706a890-e44b-4884-bffb-c2da7cdf3bbf', 'Sản phẩm Từng bài', 'Bạn là chuyên gia thiết kế chương trình IoT/STEM cho học sinh 15–18 tuổi.

## MISSION
Xác định Sản phẩm cụ thể của TỪNG bài học sao cho các sản phẩm nhỏ tích lũy dần và hội tụ về sản phẩm cuối học phần.

## INPUT DATA
Khung chương trình:
<curriculum_table>
%%input_data%%
</curriculum_table>

Sản phẩm cuối học phần (đã xác định):
<final_product>
{{p1_final_product}}
</final_product>

## INSTRUCTIONS
Nhiệm vụ: Với mỗi bài học trong khung chương trình, xác định **Sản phẩm cụ thể** — thứ học sinh tạo ra được, chạy được, quan sát được vào cuối buổi học đó.

**Nguyên tắc thiết kế sản phẩm từng bài:**
1. **Tích lũy:** Sản phẩm bài N phải kế thừa / mở rộng từ sản phẩm bài N-1.
2. **Hội tụ:** Đến bài cuối dự án, tất cả sản phẩm nhỏ hội tụ vào sản phẩm cuối.
3. **Quan sát được:** Học sinh phải nhìn thấy hoặc đo được kết quả (đèn sáng, serial monitor, dashboard...).
4. **Vừa sức:** Sản phẩm phải hoàn thành được trong thời lượng buổi học.
5. **Cụ thể:** Nêu rõ INPUT nào → PROCESSING gì → OUTPUT gì.

## VALIDATION
- [ ] Tất cả các bài đều có sản phẩm chưa?
- [ ] Chuỗi sản phẩm có tính tích lũy chưa?
- [ ] Sản phẩm bài cuối có phải là sản phẩm cuối học phần không?
- [ ] Mỗi sản phẩm có quan sát được không?

## OUTPUT FORMAT
Hãy output tiếng Việt (giữ nguyên thuật ngữ kỹ thuật tiếng Anh), định dạng Markdown, theo ĐÚNG cấu trúc sau CHO TỪNG BÀI:

---

### Bài [X]: [Tên bài]

**Sản phẩm:** [Tên sản phẩm ngắn gọn]

**Mô tả hoạt động:**
[2–3 câu: mô tả hệ thống làm gì, quan sát được gì, thể hiện kiến thức gì của bài]

**Kế thừa từ bài trước:** [Thành phần/code nào được giữ lại từ bài trước — hoặc "Bài đầu tiên" nếu là bài 1]

**Đóng góp cho sản phẩm cuối:** [Thành phần/kỹ năng này sẽ được dùng ở đâu trong dự án cuối]

---
[Lặp lại cho tất cả các bài trong học phần]
', '{"model_id":"gemini-1.5-pro-002","generationConfig":{"temperature":0.5,"maxOutputTokens":4096}}'::jsonb, TRUE, 'p2_lesson_products');

-- Prompt for p3_module_summary
INSERT INTO public.prompt_templates (id, name, template, default_ai_settings, is_active, stage_key)
VALUES ('5a46fe9c-b38f-4d85-b978-046a1a41521e', 'Tóm tắt Học phần', 'Bạn là chuyên gia thiết kế chương trình IoT/STEM cho học sinh 15–18 tuổi.

## MISSION
Tạo Tóm tắt Học phần cho từng bài bao gồm Mục tiêu, Chi tiết Nội dung, Sản phẩm cụ thể và Outcome.

## INPUT DATA
Khung chương trình và Learning Objectives:
<learning_objectives_json>
%%input_data%%
</learning_objectives_json>

Sản phẩm cuối học phần:
<final_product>
{{p1_final_product}}
</final_product>

Sản phẩm từng bài:
<lesson_products>
{{p2_lesson_products}}
</lesson_products>

## INSTRUCTIONS
Nhiệm vụ: Với MỖI BÀI HỌC, viết phần TÓM TẮT theo đúng 4 mục của định dạng mẫu.

**Hướng dẫn điền từng mục:**
- **Mục tiêu chính:** Dịch CIO/SIO thành câu tiếng Việt (bắt đầu bằng động từ hành động).
- **Chi tiết hóa nội dung:** Mỗi SIO → 1 chủ đề con với giải thích + code mẫu.
- **Sản phẩm/Kết quả cụ thể:** Lấy từ Sản phẩm từng bài, chia nhỏ thành kết quả quan sát được.
- **Outcome:** Viết lại mục tiêu chính dưới dạng "HS có thể làm được...".
- **Lưu ý:** Xử lý kỹ bài ôn tập, dự án. Chèn code block đúng ngôn ngữ.

## VALIDATION
- [ ] Tất cả bài đều có đủ 4 mục chưa?
- [ ] Chi tiết hóa có code mẫu ở những bài lập trình chưa?
- [ ] Mục tiêu chính và Outcome có tương ứng với nhau không?
- [ ] Sản phẩm/Kết quả có cụ thể không?

## OUTPUT FORMAT
Hãy output tiếng Việt, định dạng Markdown, theo ĐÚNG cấu trúc sau CHO TỪNG BÀI:

---

### **Buổi [X.Y]: [Tên bài học]**

* Mục tiêu chính:
  * [Mục tiêu 1 — bắt đầu bằng động từ hành động: Hiểu / Biết / Lập trình...]
  * [...] 

* Chi tiết hóa nội dung:
  * [Chủ đề con 1]:
    * [Giải thích khái niệm]
    * [Code mẫu nếu cần — code block]
    * [Lưu ý kỹ thuật]
  * [...]

* Sản phẩm/Kết quả cụ thể:
  * [Kết quả quan sát được 1]
  * [...]

* Outcome (Học sinh có thể làm được):
  * [Kỹ năng 1 — bắt đầu bằng động từ: Giải thích / Khởi tạo / Viết...]
  * [...]

---
[Lặp lại cho tất cả các bài]
', '{"model_id":"gemini-1.5-pro-002","generationConfig":{"temperature":0.5,"maxOutputTokens":8192}}'::jsonb, TRUE, 'p3_module_summary');

-- Prompt for p4_detailed_lesson
INSERT INTO public.prompt_templates (id, name, template, default_ai_settings, is_active, stage_key)
VALUES ('269410e8-a7fa-412e-bf79-a8b9a9050e16', 'Giáo án Chi tiết (5E)', 'Bạn là chuyên gia thiết kế giáo án IoT/STEM cho học sinh 15–18 tuổi.

## MISSION
Tạo giáo án chi tiết đầy đủ cho tất cả các bài học dựa trên Tóm tắt Học phần, theo mô hình 5E.

## INPUT DATA
Thông tin học phần:
<curriculum_table>
%%input_data%%
</curriculum_table>

Tóm tắt học phần (cho tất cả các bài):
<module_summary>
{{p3_module_summary}}
</module_summary>

Sản phẩm từng bài:
<lesson_products>
{{p2_lesson_products}}
</lesson_products>

Sản phẩm cuối học phần:
<final_product>
{{p1_final_product}}
</final_product>

## INSTRUCTIONS
Nhiệm vụ: Viết giáo án chi tiết đầy đủ cho CÁC BUỔI HỌC theo đúng cấu trúc mô hình 5E.

**HƯỚNG DẪN CHI TIẾT CHO TỪNG GIAI ĐOẠN 5E:**
- **Engage (~10%):** Dùng câu hỏi từ vấn đề thực tế, GV demo ngắn, đặt mục tiêu.
- **Explore (~40%):** Chia thành 2-3 hoạt động nhỏ, HS tự khám phá trước, GV hỗ trợ.
- **Explain (~20%):** GV giải thích SAU KHI HS đã khám phá, tập trung vào bản chất.
- **Elaborate (~20%):** Yêu cầu nâng cao, mở rộng trong phạm vi bài.
- **Evaluate (~10%):** Kiểm tra tại chỗ, hỏi nhanh có đáp án, giới thiệu bài tiếp theo.

## VALIDATION
- [ ] Tài liệu có phần đọc kỹ thuật và code mẫu không?
- [ ] Tiến trình 5E có chia phút rõ ràng không?
- [ ] Explore có để HS tự khám phá trước không?
- [ ] Evaluate có kiểm tra tại chỗ không?

## OUTPUT FORMAT
Hãy output format Markdown cho từng bài học theo ĐÚNG cấu trúc sau (Lặp lại cho tất cả các bài):

---

## **Giáo án Buổi học [X.Y]: [Tên bài]**

* Học phần: [Tên học phần]
* Dự án: [Mô tả ngắn liên quan đến dự án cuối]
* Mục tiêu buổi học:
  * [Các mục tiêu]
* Chuẩn bị:
  * GV: [...]
  * HS: [...]
* Tài liệu đọc/hướng dẫn: "[Tên tài liệu]"

---

Tài liệu đọc/hướng dẫn: "[Tên tài liệu]"

1. [Phần giới thiệu ngữ cảnh / Vấn đề thực tế]
2. [Khái niệm/Lý thuyết chính]
3. [Hướng dẫn kỹ thuật từng bước - nhắc lại code mẫu, lưu ý]
Thực Hành: [Các bước thực hành]

---

Tiến trình bài học (Mô hình 5E)
*(Phân bổ thời gian: Engage 10%, Explore 40%, Explain 20%, Elaborate 20%, Evaluate 10%)*

1\. Engage (Gắn kết — [X] phút)
* Hoạt động: [...]
* Tóm tắt mục tiêu.

2\. Explore (Khám phá — [X] phút)
* Hoạt động 1: [...]
* Hoạt động 2: [...]

3\. Explain (Giải thích — [X] phút)
* Hoạt động: Giải thích khái niệm, thảo luận.

4\. Elaborate (Mở rộng/Áp dụng — [X] phút)
* Hoạt động: Thử thách mở rộng.

5\. Evaluate (Đánh giá — [X] phút)
* Hoạt động: Kiểm tra tại chỗ, Câu hỏi nhanh.
* Kết thúc buổi học: Tóm tắt, giới thiệu buổi tiếp theo.

---
', '{"model_id":"gemini-1.5-pro-002","generationConfig":{"temperature":0.5,"maxOutputTokens":8192}}'::jsonb, TRUE, 'p4_detailed_lesson');

