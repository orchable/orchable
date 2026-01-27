import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, CheckCircle2, XCircle, Loader2, ChevronDown, ExternalLink, FileCode, FileText, Presentation, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { StepBadge } from '@/components/common/StepBadge';
import type { ExecutionStatus, StepStatus } from '@/lib/types';

// Mock data
interface MockExecution {
  id: string;
  lessonId: string;
  lessonTitle: string;
  status: ExecutionStatus;
  completedSteps: number;
  totalSteps: number;
  createdAt: string;
}

interface MockStepExecution {
  id: string;
  stepId: string;
  stepName: string;
  label: string;
  status: StepStatus;
  duration?: number;
  result?: {
    summary: string;
    files: { name: string; type: string }[];
  };
}

const mockExecutions: MockExecution[] = [
  { id: '1', lessonId: 'L001', lessonTitle: 'Introduction to React Hooks', status: 'completed', completedSteps: 5, totalSteps: 5, createdAt: '5 phút trước' },
  { id: '2', lessonId: 'L002', lessonTitle: 'Advanced State Management', status: 'running', completedSteps: 3, totalSteps: 5, createdAt: '3 phút trước' },
  { id: '3', lessonId: 'L003', lessonTitle: 'Building Custom Hooks', status: 'pending', completedSteps: 0, totalSteps: 5, createdAt: '1 phút trước' },
  { id: '4', lessonId: 'L004', lessonTitle: 'Performance Optimization', status: 'failed', completedSteps: 2, totalSteps: 5, createdAt: '10 phút trước' },
];

const mockStepExecutions: MockStepExecution[] = [
  { id: '1', stepId: 'step-a', stepName: 'A', label: 'Generate Sample Project', status: 'completed', duration: 45000, result: { summary: 'Đã tạo React project với hooks examples', files: [{ name: 'sample-project.zip', type: 'code' }] } },
  { id: '2', stepId: 'step-b', stepName: 'B', label: 'Generate Documentation', status: 'completed', duration: 32000, result: { summary: 'Đã tạo student documentation', files: [{ name: 'docs.pdf', type: 'document' }] } },
  { id: '3', stepId: 'step-c', stepName: 'C', label: 'Generate Lesson Plan', status: 'running', duration: undefined },
  { id: '4', stepId: 'step-d', stepName: 'D', label: 'Generate Slides', status: 'pending' },
  { id: '5', stepId: 'step-e', stepName: 'E', label: 'Generate Quiz', status: 'pending' },
];

export function MonitorPage() {
  const [selectedExecution, setSelectedExecution] = useState<string | null>('2');
  const [expandedStep, setExpandedStep] = useState<string | null>('1');

  const selected = mockExecutions.find(e => e.id === selectedExecution);

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Execution List */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-80 border-r bg-muted/20 overflow-auto"
      >
        <div className="p-4 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Executions</h2>
          </div>
        </div>

        <div className="p-3 space-y-2">
          {mockExecutions.map((execution, idx) => (
            <motion.div
              key={execution.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedExecution(execution.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                selectedExecution === execution.id
                  ? 'bg-primary/10 border-2 border-primary/30'
                  : 'bg-card border border-transparent hover:border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-medium">{execution.lessonId}</span>
                <StatusBadge status={execution.status} size="sm" />
              </div>
              <p className="text-sm truncate mb-2">{execution.lessonTitle}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{execution.completedSteps}/{execution.totalSteps} steps</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {execution.createdAt}
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(execution.completedSteps / execution.totalSteps) * 100}%` }}
                  className={`h-full rounded-full ${
                    execution.status === 'completed' ? 'bg-success' :
                    execution.status === 'failed' ? 'bg-destructive' :
                    execution.status === 'running' ? 'bg-primary' : 'bg-muted-foreground'
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Main Content - Execution Detail */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold">{selected.lessonTitle}</h1>
                    <StatusBadge status={selected.status} size="lg" />
                  </div>
                  <Button variant="outline" size="sm">
                    Chi tiết đầy đủ
                  </Button>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="font-mono bg-muted px-2 py-1 rounded">{selected.lessonId}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Bắt đầu: {selected.createdAt}
                  </span>
                </div>
              </div>

              {/* Step Timeline */}
              <div className="mb-8">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Execution Timeline
                </h2>

                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />

                  <div className="space-y-4">
                    {mockStepExecutions.map((step, idx) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative flex gap-4"
                      >
                        {/* Circle indicator */}
                        <div className={`
                          relative z-10 w-8 h-8 rounded-full flex items-center justify-center
                          ${step.status === 'completed' ? 'bg-success text-white' :
                            step.status === 'running' ? 'bg-info text-white' :
                            step.status === 'failed' ? 'bg-destructive text-white' :
                            'bg-muted text-muted-foreground'}
                        `}>
                          {step.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                          {step.status === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
                          {step.status === 'failed' && <XCircle className="w-4 h-4" />}
                          {step.status === 'pending' && <Clock className="w-4 h-4" />}
                        </div>

                        {/* Content */}
                        <Card 
                          className={`flex-1 cursor-pointer transition-all ${
                            expandedStep === step.id ? 'ring-2 ring-primary/30' : ''
                          }`}
                          onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <StepBadge name={step.stepName} size="sm" />
                                <div>
                                  <p className="font-semibold">{step.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {step.duration ? `${(step.duration / 1000).toFixed(1)}s` : 
                                     step.status === 'running' ? 'Đang xử lý...' : 'Chờ xử lý'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={step.status} size="sm" showIcon={false} />
                                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${
                                  expandedStep === step.id ? 'rotate-180' : ''
                                }`} />
                              </div>
                            </div>

                            {/* Expanded content */}
                            <AnimatePresence>
                              {expandedStep === step.id && step.result && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-4 pt-4 border-t space-y-3"
                                >
                                  <div className="p-3 rounded-lg bg-info/10 border border-info/20">
                                    <p className="text-sm">{step.result.summary}</p>
                                  </div>

                                  <div>
                                    <p className="text-sm font-medium mb-2">Output Files</p>
                                    <div className="space-y-2">
                                      {step.result.files.map((file, fIdx) => (
                                        <div
                                          key={fIdx}
                                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                        >
                                          <div className="flex items-center gap-2">
                                            {file.type === 'code' ? <FileCode className="w-4 h-4 text-step-a" /> :
                                             file.type === 'document' ? <FileText className="w-4 h-4 text-step-b" /> :
                                             <Presentation className="w-4 h-4 text-step-d" />}
                                            <span className="text-sm font-medium">{file.name}</span>
                                          </div>
                                          <Button variant="ghost" size="sm">
                                            <ExternalLink className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex items-center justify-center text-muted-foreground"
            >
              <div className="text-center">
                <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chọn một execution để xem chi tiết</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
