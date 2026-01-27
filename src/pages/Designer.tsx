import { motion } from 'framer-motion';
import { Boxes, Plus, GitBranch, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StepBadge } from '@/components/common/StepBadge';

// Mock data for demo
const mockSteps = [
  { id: 'step-a', name: 'A', label: 'Generate Sample Project', x: 100, y: 100 },
  { id: 'step-b', name: 'B', label: 'Generate Documentation', x: 350, y: 100 },
  { id: 'step-c', name: 'C', label: 'Generate Lesson Plan', x: 350, y: 250 },
  { id: 'step-d', name: 'D', label: 'Generate Slides', x: 150, y: 400 },
  { id: 'step-e', name: 'E', label: 'Generate Quiz', x: 550, y: 400 },
];

const mockConnections = [
  { from: 'step-a', to: 'step-b' },
  { from: 'step-b', to: 'step-c' },
  { from: 'step-c', to: 'step-d' },
  { from: 'step-c', to: 'step-e' },
];

export function DesignerPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="px-6 py-4 border-b bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-step-a to-step-b flex items-center justify-center">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Orchestrator Designer</h1>
              <p className="text-sm text-muted-foreground">Thiết kế workflow tạo học liệu với drag-and-drop</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-white shadow-glow">
              <Save className="w-4 h-4 mr-2" />
              Lưu cấu hình
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Sidebar - Step Palette */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-64 border-r bg-muted/30 p-4 space-y-4"
        >
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Thêm Step
            </h3>
            <div className="space-y-2">
              {['A', 'B', 'C', 'D', 'E'].map((name) => (
                <motion.div
                  key={name}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-3 rounded-lg border bg-card cursor-grab hover:shadow-md transition-shadow flex items-center gap-3"
                >
                  <StepBadge name={name} size="sm" />
                  <span className="text-sm font-medium">Step {name}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Templates
            </h3>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                Standard Course
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                Quick Lesson
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                Full Material Set
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Main Canvas */}
        <div className="flex-1 relative bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[size:20px_20px] overflow-hidden">
          {/* Demo Nodes */}
          <svg className="absolute inset-0 pointer-events-none">
            {mockConnections.map((conn, idx) => {
              const from = mockSteps.find(s => s.id === conn.from);
              const to = mockSteps.find(s => s.id === conn.to);
              if (!from || !to) return null;
              return (
                <motion.path
                  key={idx}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  d={`M ${from.x + 100} ${from.y + 40} C ${from.x + 100} ${(from.y + to.y) / 2 + 40}, ${to.x + 100} ${(from.y + to.y) / 2 + 40}, ${to.x + 100} ${to.y + 40}`}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="5,5"
                  opacity="0.5"
                />
              );
            })}
          </svg>

          {mockSteps.map((step, idx) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              style={{ left: step.x, top: step.y }}
              className="absolute"
            >
              <Card className="w-52 p-4 cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all border-2 hover:border-primary/50 group">
                <div className="flex items-center gap-3">
                  <StepBadge name={step.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{step.label}</p>
                    <p className="text-xs text-muted-foreground truncate">Click để cấu hình</p>
                  </div>
                </div>
                {/* Connection handles */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-background border-muted-foreground/30 group-hover:border-primary transition-colors" />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-background border-muted-foreground/30 group-hover:border-primary transition-colors" />
              </Card>
            </motion.div>
          ))}

          {/* Help overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2"
          >
            <div className="glass px-4 py-2 rounded-full text-sm text-muted-foreground">
              Kéo thả steps từ bảng bên trái • Kết nối bằng cách kéo từ handle này sang handle khác
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar - Config Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 border-l bg-muted/30 p-4"
        >
          <h3 className="font-semibold mb-4">Cấu hình Step</h3>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3 mb-4">
                <StepBadge name="A" />
                <div>
                  <p className="font-semibold">Step A</p>
                  <p className="text-xs text-muted-foreground">Đã chọn</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Label</label>
                  <input 
                    type="text" 
                    defaultValue="Generate Sample Project"
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Webhook URL</label>
                  <input 
                    type="url" 
                    placeholder="https://n8n.example.com/webhook/step-a"
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Timeout (ms)</label>
                    <input 
                      type="number" 
                      defaultValue={300000}
                      className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Max Retries</label>
                    <input 
                      type="number" 
                      defaultValue={3}
                      className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <Button className="w-full" size="sm">
                  Áp dụng thay đổi
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-muted/50">
              <h4 className="font-medium text-sm mb-2">Dependencies</h4>
              <p className="text-xs text-muted-foreground">Step A không có dependency (Step đầu tiên)</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
