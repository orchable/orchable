# Detailed Architecture Documentation: Automated Course Material Generation System - Hybrid Approach

## 📋 System Overview

### Objective
Build a system that allows users to design an orchestrator to automatically generate course materials from a syllabus, with real-time execution tracking.

### Overall Architecture

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

### Table 1: `orchestrator_configs`
Stores orchestrator configurations designed by users.

```sql
CREATE TABLE orchestrator_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255), -- User ID if auth enabled
  
  -- Validation check
  CONSTRAINT valid_steps CHECK (jsonb_typeof(steps) = 'array')
);

-- Indexes
CREATE INDEX idx_configs_created_at ON orchestrator_configs(created_at DESC);
CREATE INDEX idx_configs_name ON orchestrator_configs(name);
```

**JSONB structure for `steps`:**
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

### Table 2: `executions`
Stores information about each orchestrator execution run.

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

-- Trigger for auto-updating updated_at
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

**JSONB structure for `syllabus_row`:**
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

### Table 3: `step_executions`
Stores the status and results of each step within an execution.

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

**JSONB structure for `result`:**
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
  "visualization": "ReactFlow (for designer), Recharts (for monitoring)",
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
├── App.tsx                       # Root component with routing
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
│   └── designerStore.ts         # Zustand store for designer
│
└── services/
    ├── configService.ts         # CRUD for orchestrator configs
    ├── executionService.ts      # Execution management
    └── n8nService.ts            # Trigger n8n workflows
```

---

## 📦 Component Specifications

### Module 1: Orchestrator Designer

#### 1.1 `OrchestratorDesigner.tsx`
**Purpose:** Container component for the designer module.

**Props:**
```typescript
interface OrchestratorDesignerProps {
  configId?: string; // If present = edit mode, null = create mode
  onSave?: (configId: string) => void;
}
```

**State Management:**
```typescript
// Using Zustand store
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

**Main Functions:**
1. Load existing config (if `configId` passed)
2. Manage designer state (nodes, edges)
3. Coordinate between sub-components
4. Validate config before saving
5. Call `configService.saveConfig()` to save to Supabase

---

#### 1.2 `FlowCanvas.tsx`
**Purpose:** Primary canvas for drag-and-drop and step connection.

**Dependencies:** `@xyflow/react`

**Props:**
```typescript
interface FlowCanvasProps {
  // No props needed, state from Zustand store
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

**Features:**
- Canvas rendering with ReactFlow
- Drag-and-drop node repositioning
- Edge creation by connecting handles
- Node selection for config panel display
- Circular dependency validation

---

#### 1.3 `StepNode.tsx`
**Purpose:** Custom node component for workflow steps.

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
- Color-coded step names (A, B, C, D, E)
- Descriptive step labels
- Truncated webhook URL display
- Highlight on selection
- Top (input) and bottom (output) handles for connection

---

#### 1.4 `StepConfigPanel.tsx`
**Purpose:** Panel for detailed configuration of selected steps.

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

**Features:**
- Step configuration form
- Zod schema validation
- Real-time Zustand store synchronization
- Error display

---

#### 1.5 `SaveConfigDialog.tsx`
**Purpose:** Dialog to save orchestrator configurations to Supabase.

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
**Purpose:** Container component for syllabus upload and execution launch.

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
**Purpose:** Component for TSV syllabus file upload.

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
        // Data validation and transformation
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
**Purpose:** Button to launch batch executions and trigger the n8n Master Workflow.

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
      // Launch rows individually
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
**Purpose:** Daily monitoring and management of orchestrator executions.

**Features:**
- **Execution List**: Filterable list of all runs with real-time status.
- **Execution Detail**: In-depth view of each step, including timeline, logs, and output results.
- **Auto-polling**: Automatically refreshes data for active executions.

---

## 🔌 Services Layer

### `configService.ts`
Manages Orchestrator configurations in Supabase.

### `executionService.ts`
Handles execution lifecycle (creation, tracking, status updates).

### `n8nService.ts`
Provides an interface for triggering n8n Master and child workflows.

---

## ⚙️ n8n Master Workflow Implementation

The Master Workflow is the "brain" of the execution process:
1.  **Orchestration Input**: Triggered via webhook with syllabus data.
2.  **Config Fetching**: Retrieves the precise stage configuration from Supabase.
3.  **Step Routing**: Dynamically executes steps based on defined dependencies.
4.  **Error Handling**: Manages retries and step failures gracefully.

---

## 🎯 n8n Child Workflow Template (Step A Example)

Standardized child workflows perform the actual work:
1.  **AI Invocation**: Calls Gemini/Claude with the rendered prompt.
2.  **Output Processing**: Parses structured results (JSON).
3.  **Storage Sync**: Saves artifacts (ZIP, MD, JSON) to bucket storage.
4.  **DB Update**: Syncs results back to `step_execution` records.

---

## 📝 TypeScript Types

Comprehensive shared types for:
-   `OrchestratorConfig` & `StepConfig`
-   `Execution` & `StepExecution`
-   `SyllabusRow` & `Resource`
-   `StepResult` & `OutputFile`

---

## 🚀 Deployment Instructions

### React App (Netlify)
1.  Connect repo to Netlify.
2.  Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_N8N_BASE_URL`.
3.  Build command: `npm run build`.

### n8n Setup
1.  Import workflows from exports.
2.  Configure Supabase and AI provider credentials.

### Supabase
1.  Initialize database with provided SQL schemas.
2.  Configure Storage buckets for results management.

---

## ✅ Testing Checklist
-   [x] Create and save a new 5-step Orchestrator.
-   [x] Upload syllabus and launch a batch.
-   [x] Verify real-time status updates in the Monitor.
-   [x] Download generated artifacts from successful steps.

---

## 📚 Summary
Architected for scalability and ease of use, this system empowers users to build powerful AI pipelines with minimal technical overhead while maintaining full visibility into every execution step.

---

## ✨ Updates & New Features (v1.1)

### 1. Settings & Persistence
Configure Webhook URLs and defaults that persist in `localStorage`.

### 2. Dark Mode Support
Full dark/light mode support with automatic system synchronization.

### 3. Workflow Templates
Pre-built templates for common curriculum generation patterns.

### 4. Direct n8n Integration
Auto-discovery of available workflows directly within the Designer.
