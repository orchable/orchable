# Tài liệu Kiến trúc Chi tiết: Hệ thống Tạo Học liệu Tự động - Hybrid Approach

## 📋 Tổng quan Hệ thống

### Mục tiêu
Xây dựng hệ thống cho phép người dùng thiết kế bộ điều phối (orchestrator) để tự động tạo học liệu từ syllabus, với khả năng theo dõi tiến trình thực thi real-time.

### Kiến trúc Tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Web App (Netlify)                      │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │   Designer     │  │    Launcher    │  │     Monitor      │  │
│  │   Component    │  │   Component    │  │    Component     │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ (API calls)
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Database                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ orchestrator_    │  │   executions     │  │  step_results │ │
│  │   configs        │  │                  │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕ (reads config & writes results)
┌─────────────────────────────────────────────────────────────────┐
│                   n8n Workflows (Self-hosted)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Master Workflow (Dynamic Orchestrator)           │  │
│  │  • Reads config from Supabase                             │  │
│  │  • Executes steps based on dependencies                   │  │
│  │  • Handles retry logic                                    │  │
│  │  • Writes execution status to Supabase                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                  │
│  │ Step│  │ Step│  │ Step│  │ Step│  │ Step│                  │
│  │  A  │  │  B  │  │  C  │  │  D  │  │  E  │                  │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘                  │
│  (Project) (Docs)  (Lesson) (Slides) (Quiz)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema (Supabase)

### Bảng 1: `orchestrator_configs`
Lưu trữ cấu hình bộ điều phối do user thiết kế.

```sql
CREATE TABLE orchestrator_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255), -- User ID nếu có auth
  
  -- Index để query nhanh
  CONSTRAINT valid_steps CHECK (jsonb_typeof(steps) = 'array')
);

-- Index
CREATE INDEX idx_configs_created_at ON orchestrator_configs(created_at DESC);
CREATE INDEX idx_configs_name ON orchestrator_configs(name);
```

**Cấu trúc JSONB của `steps`:**
```json
[
  {
    "id": "step-a",
    "name": "A",
    "label": "Generate Sample Project",
    "webhookUrl": "https://n8n.example.com/webhook/step-a",
    "dependsOn": [],
    "timeout": 300000,
    "retryConfig": {
      "maxRetries": 3,
      "retryDelay": 5000
    }
  },
  {
    "id": "step-b",
    "name": "B",
    "label": "Generate Student Documentation",
    "webhookUrl": "https://n8n.example.com/webhook/step-b",
    "dependsOn": ["step-a"],
    "timeout": 300000,
    "retryConfig": {
      "maxRetries": 3,
      "retryDelay": 5000
    }
  },
  {
    "id": "step-c",
    "name": "C",
    "label": "Generate Lesson Plan",
    "webhookUrl": "https://n8n.example.com/webhook/step-c",
    "dependsOn": ["step-b"],
    "timeout": 300000,
    "retryConfig": {
      "maxRetries": 3,
      "retryDelay": 5000
    }
  },
  {
    "id": "step-d",
    "name": "D",
    "label": "Generate Presentation Slides",
    "webhookUrl": "https://n8n.example.com/webhook/step-d",
    "dependsOn": ["step-c"],
    "timeout": 300000,
    "retryConfig": {
      "maxRetries": 2,
      "retryDelay": 3000
    }
  },
  {
    "id": "step-e",
    "name": "E",
    "label": "Generate Quiz Questions",
    "webhookUrl": "https://n8n.example.com/webhook/step-e",
    "dependsOn": ["step-c"],
    "timeout": 180000,
    "retryConfig": {
      "maxRetries": 2,
      "retryDelay": 3000
    }
  }
]
```

---

### Bảng 2: `executions`
Lưu trữ thông tin về mỗi lần thực thi bộ điều phối.

```sql
CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES orchestrator_configs(id),
  syllabus_row JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Status: 'pending', 'running', 'completed', 'failed', 'cancelled'
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Metadata
  total_steps INT,
  completed_steps INT DEFAULT 0,
  failed_steps INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_executions_config_id ON executions(config_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_created_at ON executions(created_at DESC);

-- Trigger để auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_executions_updated_at BEFORE UPDATE
ON executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Cấu trúc JSONB của `syllabus_row`:**
```json
{
  "lessonId": "L001",
  "lessonTitle": "Introduction to React Hooks",
  "objective": "Students will learn to use useState and useEffect hooks",
  "resources": [
    {
      "type": "video",
      "url": "https://youtube.com/watch?v=xxx",
      "title": "React Hooks Tutorial"
    },
    {
      "type": "documentation",
      "url": "https://react.dev/reference/react/hooks",
      "title": "Official React Hooks Docs"
    }
  ],
  "duration": "90 minutes",
  "difficulty": "beginner"
}
```

---

### Bảng 3: `step_executions`
Lưu trữ trạng thái và kết quả của từng bước trong execution.

```sql
CREATE TABLE step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  step_id VARCHAR(50) NOT NULL, -- 'step-a', 'step-b', etc.
  step_name VARCHAR(10) NOT NULL, -- 'A', 'B', 'C', 'D', 'E'
  
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Status: 'pending', 'running', 'completed', 'failed', 'skipped'
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Results
  result JSONB,
  error_message TEXT,
  
  -- Retry tracking
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  
  -- Metadata
  n8n_execution_id VARCHAR(255), -- n8n's internal execution ID
  duration_ms INT, -- Duration in milliseconds
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(execution_id, step_id)
);

-- Indexes
CREATE INDEX idx_step_executions_execution_id ON step_executions(execution_id);
CREATE INDEX idx_step_executions_status ON step_executions(status);
CREATE INDEX idx_step_executions_step_id ON step_executions(step_id);

-- Trigger
CREATE TRIGGER update_step_executions_updated_at BEFORE UPDATE
ON step_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Cấu trúc JSONB của `result`:**
```json
{
  "outputFiles": [
    {
      "type": "code",
      "filename": "sample-project.zip",
      "url": "https://storage.example.com/executions/xxx/step-a/sample-project.zip",
      "size": 1234567
    }
  ],
  "summary": "Generated a React project with hooks examples",
  "metadata": {
    "tokensUsed": 5000,
    "model": "claude-sonnet-4-20250514",
    "processingTime": 45000
  }
}
```

---

## 🎨 React Web App - Detailed Component Specification

### Tech Stack
```json
{
  "framework": "React 18 + TypeScript",
  "buildTool": "Vite",
  "styling": "Tailwind CSS",
  "uiComponents": "shadcn/ui",
  "stateManagement": "Zustand",
  "dataFetching": "TanStack Query (React Query)",
  "database": "Supabase Client",
  "visualization": "ReactFlow (cho designer), Recharts (cho monitoring)",
  "routing": "React Router v6",
  "forms": "React Hook Form + Zod",
  "hosting": "Netlify"
}
```

---

### App Structure

```
src/
├── main.tsx                      # Entry point
├── App.tsx                       # Root component với routing
│
├── components/
│   ├── designer/                 # Orchestrator Designer Module
│   │   ├── OrchestratorDesigner.tsx
│   │   ├── FlowCanvas.tsx
│   │   ├── StepNode.tsx
│   │   ├── StepConfigPanel.tsx
│   │   ├── SaveConfigDialog.tsx
│   │   └── TemplateSelector.tsx
│   │
│   ├── launcher/                 # Execution Launcher Module
│   │   ├── ExecutionLauncher.tsx
│   │   ├── TSVUploader.tsx
│   │   ├── ConfigSelector.tsx
│   │   ├── SyllabusPreview.tsx
│   │   └── BatchLaunchButton.tsx
│   │
│   ├── monitor/                  # Execution Monitor Module
│   │   ├── ExecutionMonitor.tsx
│   │   ├── ExecutionList.tsx
│   │   ├── ExecutionDetail.tsx
│   │   ├── StepTimeline.tsx
│   │   ├── StepCard.tsx
│   │   └── ResultViewer.tsx
│   │
│   └── common/                   # Shared components
│       ├── Layout.tsx
│       ├── Navbar.tsx
│       ├── StatusBadge.tsx
│       └── LoadingSpinner.tsx
│
├── lib/
│   ├── supabase.ts              # Supabase client setup
│   ├── types.ts                 # TypeScript types
│   └── utils.ts                 # Utility functions
│
├── hooks/
│   ├── useOrchestratorConfigs.ts
│   ├── useExecutions.ts
│   ├── useStepExecutions.ts
│   └── usePolling.ts
│
├── stores/
│   └── designerStore.ts         # Zustand store cho designer
│
└── services/
    ├── configService.ts         # CRUD cho orchestrator configs
    ├── executionService.ts      # Execution management
    └── n8nService.ts            # Trigger n8n workflows
```

---

## 📦 Component Specifications

### Module 1: Orchestrator Designer

#### 1.1 `OrchestratorDesigner.tsx`
**Mục đích:** Container component cho toàn bộ designer module.

**Props:**
```typescript
interface OrchestratorDesignerProps {
  configId?: string; // Nếu có = edit mode, null = create mode
  onSave?: (configId: string) => void;
}
```

**State Management:**
```typescript
// Sử dụng Zustand store
interface DesignerStore {
  nodes: Node[]; // ReactFlow nodes
  edges: Edge[]; // ReactFlow edges
  selectedNode: Node | null;
  config: OrchestratorConfig | null;
  
  // Actions
  addStep: (step: StepConfig) => void;
  removeStep: (stepId: string) => void;
  updateStep: (stepId: string, updates: Partial<StepConfig>) => void;
  addDependency: (fromStepId: string, toStepId: string) => void;
  removeDependency: (fromStepId: string, toStepId: string) => void;
  setSelectedNode: (node: Node | null) => void;
  loadConfig: (config: OrchestratorConfig) => void;
  reset: () => void;
}
```

**Layout:**
```tsx
<div className="h-screen flex flex-col">
  <Navbar title="Orchestrator Designer" />
  
  <div className="flex-1 flex">
    {/* Left sidebar - Step palette */}
    <div className="w-64 bg-gray-50 p-4">
      <h3>Available Steps</h3>
      <StepPalette />
    </div>
    
    {/* Main canvas */}
    <div className="flex-1">
      <FlowCanvas />
    </div>
    
    {/* Right sidebar - Config panel */}
    {selectedNode && (
      <div className="w-80 bg-gray-50 p-4">
        <StepConfigPanel stepId={selectedNode.id} />
      </div>
    )}
  </div>
  
  <div className="p-4 border-t flex justify-between">
    <TemplateSelector />
    <div className="space-x-2">
      <Button variant="outline" onClick={handleReset}>Reset</Button>
      <SaveConfigDialog />
    </div>
  </div>
</div>
```

**Chức năng chính:**
1. Load existing config (nếu `configId` được truyền vào)
2. Quản lý state của designer (nodes, edges)
3. Coordinate giữa các sub-components
4. Validate config trước khi save
5. Call `configService.saveConfig()` để lưu vào Supabase

---

#### 1.2 `FlowCanvas.tsx`
**Mục đích:** Canvas chính để drag-drop và kết nối các steps.

**Dependencies:** `@xyflow/react`

**Props:**
```typescript
interface FlowCanvasProps {
  // Không cần props, lấy state từ Zustand store
}
```

**Implementation:**
```tsx
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export function FlowCanvas() {
  const { nodes, edges, addDependency, removeDependency, setSelectedNode } = useDesignerStore();
  
  const nodeTypes = useMemo(() => ({
    stepNode: StepNode // Custom node component
  }), []);
  
  const onConnect = useCallback((connection: Connection) => {
    addDependency(connection.source, connection.target);
  }, [addDependency]);
  
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Handle node position changes
  }, []);
  
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Handle edge deletions
    changes.forEach(change => {
      if (change.type === 'remove') {
        const edge = edges.find(e => e.id === change.id);
        if (edge) {
          removeDependency(edge.source, edge.target);
        }
      }
    });
  }, [edges, removeDependency]);
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, [setSelectedNode]);
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
```

**Chức năng:**
- Render canvas với ReactFlow
- Cho phép drag nodes để reposition
- Tạo edges bằng cách kéo từ handle này sang handle khác
- Click node để hiển thị config panel
- Validate không tạo circular dependencies

---

#### 1.3 `StepNode.tsx`
**Mục đích:** Custom node component cho mỗi step trong flow.

**Props:**
```typescript
interface StepNodeProps {
  data: {
    stepId: string;
    name: string; // 'A', 'B', 'C', 'D', 'E'
    label: string;
    webhookUrl: string;
  };
  selected: boolean;
}
```

**Implementation:**
```tsx
import { Handle, Position } from '@xyflow/react';

export function StepNode({ data, selected }: StepNodeProps) {
  const stepColors = {
    'A': 'bg-blue-500',
    'B': 'bg-green-500',
    'C': 'bg-yellow-500',
    'D': 'bg-purple-500',
    'E': 'bg-pink-500'
  };
  
  return (
    <div className={`
      rounded-lg border-2 p-4 min-w-[200px]
      ${selected ? 'border-blue-600 shadow-lg' : 'border-gray-300'}
      bg-white
    `}>
      <Handle type="target" position={Position.Top} />
      
      <div className="flex items-center gap-2">
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center
          text-white font-bold text-lg
          ${stepColors[data.name] || 'bg-gray-500'}
        `}>
          {data.name}
        </div>
        
        <div className="flex-1">
          <div className="font-semibold">{data.label}</div>
          <div className="text-xs text-gray-500 truncate">
            {data.webhookUrl || 'Not configured'}
          </div>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

**Features:**
- Hiển thị step name (A, B, C, D, E) với màu khác nhau
- Hiển thị label mô tả step
- Hiển thị webhook URL (truncated)
- Highlight khi được select
- Có handles ở top (input) và bottom (output) để kết nối

---

#### 1.4 `StepConfigPanel.tsx`
**Mục đích:** Panel để configure chi tiết của step được chọn.

**Props:**
```typescript
interface StepConfigPanelProps {
  stepId: string;
}
```

**Implementation:**
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const stepConfigSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  webhookUrl: z.string().url('Must be a valid URL'),
  timeout: z.number().min(1000).max(600000),
  maxRetries: z.number().min(0).max(10),
  retryDelay: z.number().min(1000).max(60000)
});

export function StepConfigPanel({ stepId }: StepConfigPanelProps) {
  const { nodes, updateStep } = useDesignerStore();
  const step = nodes.find(n => n.id === stepId)?.data;
  
  const form = useForm({
    resolver: zodResolver(stepConfigSchema),
    defaultValues: {
      label: step?.label || '',
      webhookUrl: step?.webhookUrl || '',
      timeout: step?.timeout || 300000,
      maxRetries: step?.retryConfig?.maxRetries || 3,
      retryDelay: step?.retryConfig?.retryDelay || 5000
    }
  });
  
  const onSubmit = (data: z.infer<typeof stepConfigSchema>) => {
    updateStep(stepId, {
      label: data.label,
      webhookUrl: data.webhookUrl,
      timeout: data.timeout,
      retryConfig: {
        maxRetries: data.maxRetries,
        retryDelay: data.retryDelay
      }
    });
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="font-bold">Configure Step {step?.name}</h3>
      
      <div>
        <label>Label</label>
        <input {...form.register('label')} className="w-full border rounded p-2" />
        {form.formState.errors.label && (
          <p className="text-red-500 text-sm">{form.formState.errors.label.message}</p>
        )}
      </div>
      
      <div>
        <label>Webhook URL</label>
        <input {...form.register('webhookUrl')} className="w-full border rounded p-2" />
        {form.formState.errors.webhookUrl && (
          <p className="text-red-500 text-sm">{form.formState.errors.webhookUrl.message}</p>
        )}
      </div>
      
      <div>
        <label>Timeout (ms)</label>
        <input 
          type="number" 
          {...form.register('timeout', { valueAsNumber: true })} 
          className="w-full border rounded p-2" 
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label>Max Retries</label>
          <input 
            type="number" 
            {...form.register('maxRetries', { valueAsNumber: true })} 
            className="w-full border rounded p-2" 
          />
        </div>
        
        <div>
          <label>Retry Delay (ms)</label>
          <input 
            type="number" 
            {...form.register('retryDelay', { valueAsNumber: true })} 
            className="w-full border rounded p-2" 
          />
        </div>
      </div>
      
      <button type="submit" className="w-full bg-blue-500 text-white rounded p-2">
        Save Changes
      </button>
    </form>
  );
}
```

**Chức năng:**
- Form để edit step configuration
- Validation với Zod schema
- Real-time update vào Zustand store
- Hiển thị errors

---

#### 1.5 `SaveConfigDialog.tsx`
**Mục đích:** Dialog để lưu orchestrator config vào Supabase.

**Implementation:**
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { configService } from '@/services/configService';

export function SaveConfigDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  
  const { nodes, edges } = useDesignerStore();
  
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Validate
      if (nodes.length === 0) {
        alert('Please add at least one step');
        return;
      }
      
      // Convert nodes + edges to config format
      const steps = nodes.map(node => ({
        id: node.id,
        name: node.data.name,
        label: node.data.label,
        webhookUrl: node.data.webhookUrl,
        dependsOn: edges
          .filter(edge => edge.target === node.id)
          .map(edge => edge.source),
        timeout: node.data.timeout,
        retryConfig: node.data.retryConfig
      }));
      
      // Save to Supabase
      const config = await configService.saveConfig({
        name,
        description,
        steps
      });
      
      alert(`Config saved successfully! ID: ${config.id}`);
      setOpen(false);
      
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save config');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="bg-green-500 text-white px-4 py-2 rounded"
      >
        Save Configuration
      </button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Orchestrator Configuration</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block mb-1">Configuration Name</label>
              <input 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border rounded p-2"
                placeholder="e.g., Standard Course Material Generator"
              />
            </div>
            
            <div>
              <label className="block mb-1">Description (optional)</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full border rounded p-2"
                rows={3}
                placeholder="Describe what this orchestrator does..."
              />
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm font-semibold mb-2">Summary:</p>
              <p className="text-sm">Steps: {nodes.length}</p>
              <p className="text-sm">Dependencies: {edges.length}</p>
            </div>
            
            <button 
              onClick={handleSave}
              disabled={saving || !name}
              className="w-full bg-blue-500 text-white rounded p-2 disabled:bg-gray-300"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

### Module 2: Execution Launcher

#### 2.1 `ExecutionLauncher.tsx`
**Mục đích:** Container component để upload syllabus và launch executions.

**Layout:**
```tsx
<div className="max-w-4xl mx-auto p-6">
  <h1 className="text-2xl font-bold mb-6">Launch Batch Execution</h1>
  
  <div className="space-y-6">
    {/* Step 1: Select config */}
    <Card>
      <CardHeader>
        <CardTitle>1. Select Orchestrator Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <ConfigSelector onSelect={setSelectedConfig} />
      </CardContent>
    </Card>
    
    {/* Step 2: Upload TSV */}
    <Card>
      <CardHeader>
        <CardTitle>2. Upload Syllabus Data (TSV)</CardTitle>
      </CardHeader>
      <CardContent>
        <TSVUploader onUpload={setSyllabusData} />
      </CardContent>
    </Card>
    
    {/* Step 3: Preview & Launch */}
    {syllabusData.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>3. Preview & Launch</CardTitle>
        </CardHeader>
        <CardContent>
          <SyllabusPreview data={syllabusData} />
          <BatchLaunchButton 
            configId={selectedConfig.id}
            syllabusData={syllabusData}
            onLaunch={handleLaunch}
          />
        </CardContent>
      </Card>
    )}
  </div>
</div>
```

---

#### 2.2 `TSVUploader.tsx`
**Mục đích:** Component để upload file TSV syllabus.

**Props:**
```typescript
interface TSVUploaderProps {
  onUpload: (data: SyllabusRow[]) => void;
}
```

**Implementation:**
```tsx
import { useCallback } from 'react';
import { parse } from 'papaparse';

export function TSVUploader({ onUpload }: TSVUploaderProps) {
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    parse(file, {
      header: true,
      delimiter: '\t',
      skipEmptyLines: true,
      complete: (results) => {
        // Validate và transform data
        const syllabusData = results.data.map((row: any) => ({
          lessonId: row.lesson_id || row.lessonId,
          lessonTitle: row.lesson_title || row.lessonTitle,
          objective: row.objective,
          resources: row.resources ? JSON.parse(row.resources) : [],
          duration: row.duration,
          difficulty: row.difficulty
        }));
        
        onUpload(syllabusData);
      },
      error: (error) => {
        console.error('Parse error:', error);
        alert('Failed to parse TSV file');
      }
    });
  }, [onUpload]);
  
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <input
        type="file"
        accept=".tsv,.txt"
        onChange={handleFileUpload}
        className="hidden"
        id="tsv-upload"
      />
      <label htmlFor="tsv-upload" className="cursor-pointer">
        <div className="text-gray-600">
          <p className="text-lg mb-2">Click to upload TSV file</p>
          <p className="text-sm">or drag and drop</p>
        </div>
      </label>
    </div>
  );
}
```

**Expected TSV format:**
```
lesson_id	lesson_title	objective	resources	duration	difficulty
L001	Introduction to React Hooks	Learn useState and useEffect	[{"type":"video","url":"..."}]	90 minutes	beginner
L002	Advanced Hooks	Learn useContext and useReducer	[{"type":"video","url":"..."}]	120 minutes	intermediate
```

---

#### 2.3 `BatchLaunchButton.tsx`
**Mục đích:** Button để launch batch executions và trigger n8n Master Workflow.

**Props:**
```typescript
interface BatchLaunchButtonProps {
  configId: string;
  syllabusData: SyllabusRow[];
  onLaunch: (executionIds: string[]) => void;
}
```

**Implementation:**
```tsx
import { useState } from 'react';
import { executionService } from '@/services/executionService';
import { n8nService } from '@/services/n8nService';

export function BatchLaunchButton({ configId, syllabusData, onLaunch }: BatchLaunchButtonProps) {
  const [launching, setLaunching] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const handleLaunch = async () => {
    setLaunching(true);
    setProgress(0);
    
    const executionIds: string[] = [];
    
    try {
      // Launch từng row một
      for (let i = 0; i < syllabusData.length; i++) {
        const row = syllabusData[i];
        
        // 1. Create execution record in Supabase
        const execution = await executionService.createExecution({
          configId,
          syllabusRow: row
        });
        
        // 2. Trigger n8n Master Workflow
        await n8nService.triggerMasterWorkflow({
          executionId: execution.id,
          configId,
          syllabusRow: row
        });
        
        executionIds.push(execution.id);
        setProgress(((i + 1) / syllabusData.length) * 100);
      }
      
      alert(`Successfully launched ${executionIds.length} executions!`);
      onLaunch(executionIds);
      
    } catch (error) {
      console.error('Launch error:', error);
      alert('Failed to launch executions');
    } finally {
      setLaunching(false);
    }
  };
  
  return (
    <div className="mt-4">
      <button
        onClick={handleLaunch}
        disabled={launching}
        className="w-full bg-green-500 text-white rounded p-3 text-lg font-semibold disabled:bg-gray-300"
      >
        {launching ? `Launching... ${progress.toFixed(0)}%` : `Launch ${syllabusData.length} Executions`}
      </button>
      
      {launching && (
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

---

### Module 3: Execution Monitor

#### 3.1 `ExecutionMonitor.tsx`
**Mục đích:** Container component để hiển thị danh sách executions và chi tiết.

**Layout:**
```tsx
<div className="h-screen flex">
  {/* Left sidebar - Execution list */}
  <div className="w-80 border-r overflow-y-auto">
    <ExecutionList onSelectExecution={setSelectedExecutionId} />
  </div>
  
  {/* Main content - Execution detail */}
  <div className="flex-1 overflow-y-auto">
    {selectedExecutionId ? (
      <ExecutionDetail executionId={selectedExecutionId} />
    ) : (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select an execution to view details
      </div>
    )}
  </div>
</div>
```

---

#### 3.2 `ExecutionList.tsx`
**Mục đích:** Hiển thị danh sách tất cả executions với status.

**Props:**
```typescript
interface ExecutionListProps {
  onSelectExecution: (executionId: string) => void;
}
```

**Implementation:**
```tsx
import { useExecutions } from '@/hooks/useExecutions';

export function ExecutionList({ onSelectExecution }: ExecutionListProps) {
  const { data: executions, isLoading } = useExecutions();
  
  if (isLoading) return <div className="p-4">Loading...</div>;
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Executions</h2>
      
      <div className="space-y-2">
        {executions?.map(execution => (
          <div
            key={execution.id}
            onClick={() => onSelectExecution(execution.id)}
            className="border rounded p-3 cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm">
                {execution.syllabus_row.lessonId}
              </span>
              <StatusBadge status={execution.status} />
            </div>
            
            <div className="text-sm text-gray-600 truncate">
              {execution.syllabus_row.lessonTitle}
            </div>
            
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>{execution.completed_steps}/{execution.total_steps} steps</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(execution.created_at))} ago</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

#### 3.3 `ExecutionDetail.tsx`
**Mục đích:** Hiển thị chi tiết một execution với timeline và results.

**Props:**
```typescript
interface ExecutionDetailProps {
  executionId: string;
}
```

**Implementation:**
```tsx
import { useExecution } from '@/hooks/useExecutions';
import { useStepExecutions } from '@/hooks/useStepExecutions';
import { usePolling } from '@/hooks/usePolling';

export function ExecutionDetail({ executionId }: ExecutionDetailProps) {
  const { data: execution } = useExecution(executionId);
  const { data: stepExecutions } = useStepExecutions(executionId);
  
  // Auto-refresh nếu execution đang chạy
  usePolling(
    () => {
      // Refetch data
    },
    execution?.status === 'running' ? 3000 : null
  );
  
  if (!execution) return <div>Loading...</div>;
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">
            {execution.syllabus_row.lessonTitle}
          </h1>
          <StatusBadge status={execution.status} size="lg" />
        </div>
        
        <p className="text-gray-600">{execution.syllabus_row.objective}</p>
        
        <div className="flex gap-4 mt-4 text-sm">
          <div>
            <span className="text-gray-500">Started:</span>{' '}
            {execution.started_at ? format(new Date(execution.started_at), 'PPpp') : 'N/A'}
          </div>
          {execution.completed_at && (
            <div>
              <span className="text-gray-500">Completed:</span>{' '}
              {format(new Date(execution.completed_at), 'PPpp')}
            </div>
          )}
          <div>
            <span className="text-gray-500">Duration:</span>{' '}
            {execution.completed_at 
              ? formatDuration(
                  new Date(execution.completed_at).getTime() - 
                  new Date(execution.started_at).getTime()
                )
              : 'In progress...'
            }
          </div>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Execution Timeline</h2>
        <StepTimeline steps={stepExecutions || []} />
      </div>
      
      {/* Step Details */}
      <div>
        <h2 className="text-xl font-bold mb-4">Step Results</h2>
        <div className="space-y-4">
          {stepExecutions?.map(stepExec => (
            <StepCard key={stepExec.id} stepExecution={stepExec} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

#### 3.4 `StepTimeline.tsx`
**Mục đích:** Visualization dạng timeline cho các steps.

**Props:**
```typescript
interface StepTimelineProps {
  steps: StepExecution[];
}
```

**Implementation:**
```tsx
export function StepTimeline({ steps }: StepTimelineProps) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300" />
      
      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="relative flex items-start gap-4">
            {/* Circle indicator */}
            <div className={`
              relative z-10 w-8 h-8 rounded-full flex items-center justify-center
              font-bold text-sm
              ${step.status === 'completed' ? 'bg-green-500 text-white' :
                step.status === 'running' ? 'bg-blue-500 text-white animate-pulse' :
                step.status === 'failed' ? 'bg-red-500 text-white' :
                'bg-gray-300 text-gray-600'}
            `}>
              {step.step_name}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-8">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{step.step_name} - {step.step_id}</h3>
                <StatusBadge status={step.status} />
              </div>
              
              {step.started_at && (
                <p className="text-sm text-gray-500 mt-1">
                  Started: {format(new Date(step.started_at), 'HH:mm:ss')}
                </p>
              )}
              
              {step.completed_at && (
                <p className="text-sm text-gray-500">
                  Completed: {format(new Date(step.completed_at), 'HH:mm:ss')}
                  {' '}({step.duration_ms}ms)
                </p>
              )}
              
              {step.error_message && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {step.error_message}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

#### 3.5 `StepCard.tsx`
**Mục đích:** Card hiển thị kết quả của một step.

**Props:**
```typescript
interface StepCardProps {
  stepExecution: StepExecution;
}
```

**Implementation:**
```tsx
export function StepCard({ stepExecution }: StepCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="border rounded-lg p-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center
            font-bold text-white
            ${stepExecution.status === 'completed' ? 'bg-green-500' :
              stepExecution.status === 'running' ? 'bg-blue-500' :
              stepExecution.status === 'failed' ? 'bg-red-500' :
              'bg-gray-400'}
          `}>
            {stepExecution.step_name}
          </div>
          
          <div>
            <h3 className="font-semibold">{stepExecution.step_id}</h3>
            <p className="text-sm text-gray-500">
              {stepExecution.duration_ms ? `${stepExecution.duration_ms}ms` : 'In progress...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <StatusBadge status={stepExecution.status} />
          <ChevronDown className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Result preview */}
          {stepExecution.result && (
            <div>
              <h4 className="font-semibold mb-2">Result</h4>
              <ResultViewer result={stepExecution.result} />
            </div>
          )}
          
          {/* Metadata */}
          {stepExecution.result?.metadata && (
            <div>
              <h4 className="font-semibold mb-2">Metadata</h4>
              <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                {Object.entries(stepExecution.result.metadata).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-600">{key}:</span>{' '}
                    <span className="font-mono">{JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Retry info */}
          {stepExecution.retry_count > 0 && (
            <div className="text-sm text-orange-600">
              ⚠️ Retried {stepExecution.retry_count} time(s)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

#### 3.6 `ResultViewer.tsx`
**Mục đích:** Component để hiển thị kết quả của step (files, summaries, etc.)

**Props:**
```typescript
interface ResultViewerProps {
  result: StepResult;
}
```

**Implementation:**
```tsx
export function ResultViewer({ result }: ResultViewerProps) {
  return (
    <div className="space-y-3">
      {/* Summary */}
      {result.summary && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm">{result.summary}</p>
        </div>
      )}
      
      {/* Output files */}
      {result.outputFiles && result.outputFiles.length > 0 && (
        <div>
          <h5 className="font-semibold text-sm mb-2">Output Files</h5>
          <div className="space-y-2">
            {result.outputFiles.map((file, index) => (
              
                key={index}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50"
              >
                <FileIcon type={file.type} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{file.filename}</p>
                  <p className="text-xs text-gray-500">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🔌 Services Layer

### `configService.ts`

```typescript
import { supabase } from '@/lib/supabase';
import { OrchestratorConfig, StepConfig } from '@/lib/types';

export const configService = {
  async saveConfig(config: {
    name: string;
    description?: string;
    steps: StepConfig[];
  }): Promise<OrchestratorConfig> {
    const { data, error } = await supabase
      .from('orchestrator_configs')
      .insert({
        name: config.name,
        description: config.description,
        steps: config.steps
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async listConfigs(): Promise<OrchestratorConfig[]> {
    const { data, error } = await supabase
      .from('orchestrator_configs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  async getConfig(id: string): Promise<OrchestratorConfig> {
    const { data, error } = await supabase
      .from('orchestrator_configs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async updateConfig(id: string, updates: Partial<OrchestratorConfig>): Promise<OrchestratorConfig> {
    const { data, error } = await supabase
      .from('orchestrator_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async deleteConfig(id: string): Promise<void> {
    const { error } = await supabase
      .from('orchestrator_configs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
```

---

### `executionService.ts`

```typescript
import { supabase } from '@/lib/supabase';
import { Execution, StepExecution, SyllabusRow } from '@/lib/types';

export const executionService = {
  async createExecution(data: {
    configId: string;
    syllabusRow: SyllabusRow;
  }): Promise<Execution> {
    // Đầu tiên, lấy config để biết total_steps
    const { data: config } = await supabase
      .from('orchestrator_configs')
      .select('steps')
      .eq('id', data.configId)
      .single();
    
    const totalSteps = config?.steps?.length || 0;
    
    // Tạo execution record
    const { data: execution, error } = await supabase
      .from('executions')
      .insert({
        config_id: data.configId,
        syllabus_row: data.syllabusRow,
        status: 'pending',
        total_steps: totalSteps,
        completed_steps: 0,
        failed_steps: 0
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Tạo step_execution records cho tất cả các steps
    const stepExecutions = config.steps.map((step: any) => ({
      execution_id: execution.id,
      step_id: step.id,
      step_name: step.name,
      status: 'pending',
      max_retries: step.retryConfig?.maxRetries || 3,
      retry_count: 0
    }));
    
    await supabase
      .from('step_executions')
      .insert(stepExecutions);
    
    return execution;
  },
  
  async listExecutions(): Promise<Execution[]> {
    const { data, error } = await supabase
      .from('executions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  async getExecution(id: string): Promise<Execution> {
    const { data, error } = await supabase
      .from('executions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async updateExecutionStatus(
    id: string, 
    status: Execution['status'],
    additionalData?: Partial<Execution>
  ): Promise<void> {
    const { error } = await supabase
      .from('executions')
      .update({
        status,
        ...additionalData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
  }
};
```

---

### `n8nService.ts`

```typescript
const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL;

export const n8nService = {
  async triggerMasterWorkflow(data: {
    executionId: string;
    configId: string;
    syllabusRow: any;
  }): Promise<void> {
    const response = await fetch(
      `${N8N_BASE_URL}/webhook/master-orchestrator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
    
    if (!response.ok) {
      throw new Error(`n8n trigger failed: ${response.statusText}`);
    }
    
    // n8n sẽ xử lý async, không cần chờ response
  }
};
```

---

## ⚙️ n8n Master Workflow Implementation

### Webhook Input Node
```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "master-orchestrator",
    "responseMode": "onReceived"
  },
  "name": "Webhook Trigger",
  "type": "n8n-nodes-base.webhook"
}
```

### Load Config from Supabase
```json
{
  "parameters": {
    "operation": "select",
    "table": "orchestrator_configs",
    "returnAll": false,
    "filters": {
      "conditions": [
        {
          "field": "id",
          "operator": "equals",
          "value": "={{ $json.configId }}"
        }
      ]
    }
  },
  "name": "Load Config",
  "type": "n8n-nodes-base.supabase"
}
```

### Initialize Execution
```javascript
// Code node
const executionId = $input.item.json.executionId;
const config = $input.item.json;
const steps = config.steps;

// Update execution status to 'running'
await $supabase
  .from('executions')
  .update({
    status: 'running',
    started_at: new Date().toISOString()
  })
  .eq('id', executionId);

return {
  json: {
    executionId,
    steps,
    syllabusRow: $input.item.json.syllabusRow,
    completedSteps: []
  }
};
```

### Execute Steps Loop
```javascript
// Loop node - lặp qua từng step
const steps = $json.steps;
const completedSteps = $json.completedSteps || [];
const syllabusRow = $json.syllabusRow;
const executionId = $json.executionId;

// Tìm step tiếp theo có thể execute (dependencies đã complete)
const nextStep = steps.find(step => {
  // Chưa được execute
  if (completedSteps.includes(step.id)) return false;
  
  // Dependencies đã complete
  return step.dependsOn.every(dep => completedSteps.includes(dep));
});

if (!nextStep) {
  // Không còn step nào execute được -> kết thúc
  return null;
}

return {
  json: {
    executionId,
    currentStep: nextStep,
    syllabusRow,
    steps,
    completedSteps,
    previousResults: await getPreviousResults(executionId, nextStep.dependsOn)
  }
};

async function getPreviousResults(executionId, stepIds) {
  const { data } = await $supabase
    .from('step_executions')
    .select('step_id, result')
    .eq('execution_id', executionId)
    .in('step_id', stepIds);
  
  return data.reduce((acc, item) => {
    acc[item.step_id] = item.result;
    return acc;
  }, {});
}
```

### Update Step Status to Running
```javascript
// Code node
await $supabase
  .from('step_executions')
  .update({
    status: 'running',
    started_at: new Date().toISOString()
  })
  .eq('execution_id', $json.executionId)
  .eq('step_id', $json.currentStep.id);

return $input.all();
```

### Call Step Webhook
```json
{
  "parameters": {
    "method": "POST",
    "url": "={{ $json.currentStep.webhookUrl }}",
    "options": {
      "timeout": "={{ $json.currentStep.timeout || 300000 }}"
    },
    "bodyParameters": {
      "parameters": [
        {
          "name": "executionId",
          "value": "={{ $json.executionId }}"
        },
        {
          "name": "stepId",
          "value": "={{ $json.currentStep.id }}"
        },
        {
          "name": "input",
          "value": "={{ { ...($json.syllabusRow), previousResults: $json.previousResults } }}"
        }
      ]
    }
  },
  "name": "Call Step Webhook",
  "type": "n8n-nodes-base.httpRequest"
}
```

### Handle Step Response
```javascript
// Code node - xử lý kết quả từ step workflow

const stepResult = $json;
const currentStep = $node["Loop Steps"].json.currentStep;
const executionId = $node["Loop Steps"].json.executionId;

// Update step_execution với result
await $supabase
  .from('step_executions')
  .update({
    status: stepResult.status || 'completed',
    result: stepResult.result,
    completed_at: new Date().toISOString(),
    duration_ms: stepResult.metadata?.processingTime,
    n8n_execution_id: stepResult.n8nExecutionId
  })
  .eq('execution_id', executionId)
  .eq('step_id', currentStep.id);

// Update execution progress
const { data: execution } = await $supabase
  .from('executions')
  .select('completed_steps, failed_steps')
  .eq('id', executionId)
  .single();

await $supabase
  .from('executions')
  .update({
    completed_steps: execution.completed_steps + 1
  })
  .eq('id', executionId);

// Thêm step vào completedSteps để continue loop
return {
  json: {
    ...($node["Loop Steps"].json),
    completedSteps: [...($node["Loop Steps"].json.completedSteps), currentStep.id]
  }
};
```

### Error Handling & Retry
```javascript
// Error handler node
const error = $json.error;
const currentStep = $node["Loop Steps"].json.currentStep;
const executionId = $node["Loop Steps"].json.executionId;

// Get current retry count
const { data: stepExec } = await $supabase
  .from('step_executions')
  .select('retry_count, max_retries')
  .eq('execution_id', executionId)
  .eq('step_id', currentStep.id)
  .single();

if (stepExec.retry_count < stepExec.max_retries) {
  // Retry
  await $supabase
    .from('step_executions')
    .update({
      retry_count: stepExec.retry_count + 1,
      status: 'pending'
    })
    .eq('execution_id', executionId)
    .eq('step_id', currentStep.id);
  
  // Wait before retry
  await new Promise(resolve => 
    setTimeout(resolve, currentStep.retryConfig?.retryDelay || 5000)
  );
  
  // Return to retry
  return $node["Loop Steps"].json;
  
} else {
  // Max retries reached - fail step
  await $supabase
    .from('step_executions')
    .update({
      status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString()
    })
    .eq('execution_id', executionId)
    .eq('step_id', currentStep.id);
  
  // Update execution
  await $supabase
    .from('executions')
    .update({
      failed_steps: (await $supabase
        .from('executions')
        .select('failed_steps')
        .eq('id', executionId)
        .single()
      ).data.failed_steps + 1
    })
    .eq('id', executionId);
  
  // Continue to next step (skip failed one)
  return {
    json: {
      ...($node["Loop Steps"].json),
      completedSteps: [...($node["Loop Steps"].json.completedSteps), currentStep.id]
    }
  };
}
```

### Finalize Execution
```javascript
// Code node - khi tất cả steps đã complete
const executionId = $json.executionId;

// Check nếu có step nào failed
const { data: stepExecutions } = await $supabase
  .from('step_executions')
  .select('status')
  .eq('execution_id', executionId);

const hasFailures = stepExecutions.some(se => se.status === 'failed');

// Update execution status
await $supabase
  .from('executions')
  .update({
    status: hasFailures ? 'failed' : 'completed',
    completed_at: new Date().toISOString()
  })
  .eq('id', executionId);

return {
  json: {
    executionId,
    status: hasFailures ? 'failed' : 'completed',
    message: 'Execution completed'
  }
};
```

---

## 🎯 n8n Child Workflow Template (Step A Example)

### Webhook Trigger
```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "step-a",
    "responseMode": "onReceived"
  },
  "name": "Webhook",
  "type": "n8n-nodes-base.webhook"
}
```

### Validate Input
```javascript
const input = $json.input;

if (!input.lessonObjective) {
  throw new Error('Missing required field: lessonObjective');
}

return {
  json: {
    executionId: $json.executionId,
    stepId: $json.stepId,
    lessonObjective: input.lessonObjective,
    resources: input.resources || [],
    previousResults: input.previousResults || {}
  }
};
```

### Call AI (Claude API)
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://api.anthropic.com/v1/messages",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "anthropicApi",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "anthropic-version",
          "value": "2023-06-01"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "model",
          "value": "claude-sonnet-4-20250514"
        },
        {
          "name": "max_tokens",
          "value": 4000
        },
        {
          "name": "messages",
          "value": "={{ [{ role: 'user', content: `Generate a sample React project for this lesson objective: ${$json.lessonObjective}. Include all necessary files and code.` }] }}"
        }
      ]
    }
  },
  "name": "Call Claude",
  "type": "n8n-nodes-base.httpRequest"
}
```

### Process AI Response
```javascript
const aiResponse = $json.content[0].text;

// Parse response để extract code files
// (Giả sử AI trả về format cụ thể)

return {
  json: {
    executionId: $node["Validate Input"].json.executionId,
    stepId: $node["Validate Input"].json.stepId,
    projectCode: aiResponse,
    metadata: {
      model: 'claude-sonnet-4-20250514',
      tokensUsed: $json.usage.output_tokens,
      processingTime: Date.now() - startTime
    }
  }
};
```

### Save to Storage (Optional)
```javascript
// Lưu file zip vào storage (S3, Supabase Storage, etc.)
// Trả về URL

const fileUrl = await uploadToStorage(
  $json.projectCode,
  `executions/${$json.executionId}/step-a/project.zip`
);

return {
  json: {
    ...$json,
    fileUrl
  }
};
```

### Update Database
```javascript
// Update step_execution với kết quả
await $supabase
  .from('step_executions')
  .update({
    status: 'completed',
    result: {
      outputFiles: [{
        type: 'code',
        filename: 'sample-project.zip',
        url: $json.fileUrl,
        size: $json.projectCode.length
      }],
      summary: 'Generated React sample project successfully',
      metadata: $json.metadata
    },
    completed_at: new Date().toISOString(),
    duration_ms: $json.metadata.processingTime
  })
  .eq('execution_id', $json.executionId)
  .eq('step_id', $json.stepId);

return $input.all();
```

### Return Response
```javascript
return {
  json: {
    executionId: $json.executionId,
    stepId: $json.stepId,
    status: 'completed',
    result: {
      outputFiles: $json.result.outputFiles,
      summary: $json.result.summary
    },
    metadata: $json.metadata
  }
};
```

---

## 🔄 Hooks Implementation

### `useExecutions.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executionService } from '@/services/executionService';

export function useExecutions() {
  return useQuery({
    queryKey: ['executions'],
    queryFn: () => executionService.listExecutions(),
    refetchInterval: 5000 // Auto-refresh every 5s
  });
}

export function useExecution(executionId: string) {
  return useQuery({
    queryKey: ['execution', executionId],
    queryFn: () => executionService.getExecution(executionId),
    refetchInterval: (data) => {
      // Chỉ auto-refresh nếu đang running
      return data?.status === 'running' ? 3000 : false;
    }
  });
}
```

### `useStepExecutions.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useStepExecutions(executionId: string) {
  return useQuery({
    queryKey: ['stepExecutions', executionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('step_executions')
        .select('*')
        .eq('execution_id', executionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000,
    enabled: !!executionId
  });
}
```

### `usePolling.ts`
```typescript
import { useEffect, useRef } from 'react';

export function usePolling(
  callback: () => void,
  interval: number | null // null = stop polling
) {
  const savedCallback = useRef(callback);
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (interval === null) return;
    
    const id = setInterval(() => savedCallback.current(), interval);
    return () => clearInterval(id);
  }, [interval]);
}
```

---

## 📝 TypeScript Types

### `lib/types.ts`
```typescript
export interface OrchestratorConfig {
  id: string;
  name: string;
  description?: string;
  steps: StepConfig[];
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface StepConfig {
  id: string;
  name: string; // 'A', 'B', 'C', 'D', 'E'
  label: string;
  webhookUrl: string;
  dependsOn: string[];
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

export interface SyllabusRow {
  lessonId: string;
  lessonTitle: string;
  objective: string;
  resources: Resource[];
  duration?: string;
  difficulty?: string;
}

export interface Resource {
  type: 'video' | 'documentation' | 'article';
  url: string;
  title: string;
}

export interface Execution {
  id: string;
  config_id: string;
  syllabus_row: SyllabusRow;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  created_at: string;
  updated_at: string;
}

export interface StepExecution {
  id: string;
  execution_id: string;
  step_id: string;
  step_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  result?: StepResult;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  n8n_execution_id?: string;
  duration_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface StepResult {
  outputFiles?: OutputFile[];
  summary?: string;
  metadata?: Record<string, any>;
}

export interface OutputFile {
  type: string;
  filename: string;
  url: string;
  size: number;
}
```

---

## 🚀 Deployment Instructions

### React App (Netlify)

1. **Build configuration** (`netlify.toml`):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "20"
```

2. **Environment variables** (Netlify dashboard):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_N8N_BASE_URL=https://your-n8n.com
```

### n8n Setup

1. **Self-host n8n** hoặc dùng n8n Cloud
2. **Import workflows** từ JSON exports
3. **Configure credentials**:
   - Supabase connection
   - Claude API key
   - Storage credentials (S3/etc)
4. **Enable webhooks** và note URLs

### Supabase

1. **Create project**
2. **Run SQL migrations** (schema ở trên)
3. **Enable Row Level Security** (optional, cho multi-tenant)
4. **Setup Storage bucket** (nếu lưu files)
5. **Get connection details** cho n8n

---

## ✅ Testing Checklist

- [ ] Designer: Tạo orchestrator mới với 5 steps
- [ ] Designer: Thêm dependencies giữa các steps
- [ ] Designer: Save config vào Supabase
- [ ] Designer: Load config đã save
- [ ] Launcher: Upload TSV file
- [ ] Launcher: Preview syllabus data
- [ ] Launcher: Launch batch executions
- [ ] Monitor: Xem danh sách executions
- [ ] Monitor: Real-time update status
- [ ] Monitor: Xem chi tiết từng step
- [ ] Monitor: Download kết quả files
- [ ] n8n: Master workflow execute đúng thứ tự
- [ ] n8n: Retry khi step fail
- [ ] n8n: Parallel execution D & E
- [ ] Database: Data được lưu đúng
- [ ] End-to-end: Full flow từ design → execute → monitor

---

## 📚 Summary

Kiến trúc Hybrid này cung cấp:

✅ **User empowerment**: Design orchestrator trên UI  
✅ **Reliability**: n8n handle execution, không timeout  
✅ **Real-time monitoring**: Polling từ Supabase  
✅ **Flexibility**: Thay đổi config không rebuild n8n  
✅ **Scalability**: Batch processing nhiều lessons  
✅ **Maintainability**: Clear separation of concerns  


Tài liệu này đủ chi tiết để một AI Agent khác có thể implement đầy đủ hệ thống.

---

## ✨ Updates & New Features (v1.1)

### 1. Settings & Configuration
Hệ thống hiện hỗ trợ cấu hình runtime thông qua trang `/settings`:
- **N8N URL Override**: Cho phép thay đổi N8N Webhook Base URL mà không cần build lại ứng dụng.
- **Defaults**: Cấu hình mặc định cho Timeout và Retry Strategy.
- **Persistence**: Cấu hình được lưu trong `localStorage`.

### 2. Dark Mode Support
Giao diện được tối ưu hóa hoàn toàn cho:
- **Light Mode**: Sạch sẽ, chuyên nghiệp.
- **Dark Mode**: Thân thiện với mắt, màu sắc tương phản cao (Slate-900 canvas).
- Tự động đồng bộ với cài đặt hệ thống hoặc toggle thủ công.

### 3. Workflow Templates
Designer tích hợp sẵn thư viện mẫu (Templates):
- **Standard Course**: Quy trình chuẩn (A -> B -> C -> [D, E]).
- **Quick Lesson**: Quy trình rút gọn (A -> C).
- **Parallel Processing**: Xử lý song song tối đa.

### 4. Custom Steps
Hỗ trợ mở rộng không giới hạn:
- Mặc định: A, B, C, D, E.
- Mở rộng: Cho phép thêm custom steps (F, G, H...) với mã màu tự động (hashing).