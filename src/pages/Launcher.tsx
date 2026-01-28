import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Upload, FileSpreadsheet, Rocket, ChevronRight, CheckCircle2, Loader2, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useConfigs } from '@/hooks/useConfigs';
import { useCreateExecution } from '@/hooks/useExecutions';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { SyllabusRow } from '@/lib/types';
import { n8nService } from '@/services/n8nService';

export function LauncherPage() {
  const navigate = useNavigate();
  const { data: configs, isLoading: isLoadingConfigs } = useConfigs();
  const createExecutionMutation = useCreateExecution();

  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [syllabusData, setSyllabusData] = useState<SyllabusRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.trim().split('\n').map(row => row.split('\t'));

      // Assume header row exists and check mapping, or simple index mapping
      // For now, simple mapping based on expected columns: lessonId, title, objective, etc.
      // Or just map to SyllabusRow interface assuming columns match README example or standard

      // Let's assume standard columns: lessonId, lessonTitle, objective, resources(json?), duration, difficulty
      // Skip header
      const data: SyllabusRow[] = rows.slice(1).map(cols => ({
        lessonId: cols[0],
        lessonTitle: cols[1],
        objective: cols[2],
        resources: [], // Parse if needed or kept simple
        duration: cols[4] || 'N/A',
        difficulty: cols[5] || 'Start'
      })).filter(r => r.lessonId); // Filter empty

      setSyllabusData(data);
      toast.success(`Parsed ${data.length} lessons from ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleLaunch = async () => {
    if (!selectedConfigId) return;

    try {
      setIsLaunching(true);
      let startedCount = 0;

      const dataToProcess = syllabusData.length > 0 ? syllabusData : [{
        lessonId: `manual-${Date.now()}`,
        lessonTitle: 'Manual Execution',
        objective: 'Manual Run',
        resources: [],
        duration: 'N/A',
        difficulty: 'N/A'
      }];

      for (const row of dataToProcess) {
        // 1. Create Execution record
        const execution = await createExecutionMutation.mutateAsync({
          configId: selectedConfigId,
          syllabusRow: row
        });

        // 2. Trigger n8n Master Workflow
        // Note: In a real app we might want to do this via Edge Function triggered by DB insert
        // But per requirements we trigger it here or service.
        await n8nService.triggerMasterWorkflow({
          executionId: execution.id,
          configId: selectedConfigId,
          syllabusRow: row
        });

        startedCount++;
      }

      toast.success(`Successfully launched ${startedCount} execution(s)`);
      navigate('/monitor');
    } catch (error) {
      console.error('Launch failed', error);
      toast.error('Failed to launch executions. Check console.');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success to-primary flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Execution Launcher</h1>
            <p className="text-muted-foreground">Khởi chạy batch execution từ dữ liệu syllabus</p>
          </div>
        </motion.div>

        {/* Step 1: Select Config */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <CardTitle>Chọn Orchestrator Configuration</CardTitle>
                  <CardDescription>Chọn một cấu hình đã lưu để sử dụng</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingConfigs ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search configurations..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                    {configs
                      ?.filter(config =>
                        !searchTerm ||
                        config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        config.description?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((config, idx) => (
                        <motion.div
                          key={config.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + idx * 0.1 }}
                          onClick={() => setSelectedConfigId(config.id)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedConfigId === config.id
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent bg-muted/50 hover:border-primary/30'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {selectedConfigId === config.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                              <div>
                                <p className="font-semibold">{config.name}</p>
                                <p className="text-sm text-muted-foreground">{config.description}</p>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {config.steps?.length || 0} steps
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    {(!configs || configs.length === 0) && (
                      <div className="text-center p-4 text-muted-foreground border border-dashed rounded-lg">
                        No configurations found. Please create one in Designer.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Step 2: Upload Input Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <CardTitle>Orchestrator Input Data (TSV) <span className="text-sm font-normal text-muted-foreground">(Optional)</span></CardTitle>
                  <CardDescription>Tải lên file TSV chứa dữ liệu đầu vào (nếu có)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <input
                  type="file"
                  accept=".tsv,.txt,.csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium mb-1">Click để upload file TSV</p>
                  <p className="text-sm text-muted-foreground">hoặc kéo thả file vào đây</p>
                </motion.div>
              </div>

              {fileName && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ delay: 0.1 }}
                  className="mt-4 p-4 rounded-lg bg-success/10 border border-success/20"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-success" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{fileName}</p>
                      <p className="text-xs text-muted-foreground">{syllabusData.length} rows detected</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setFileName(null); setSyllabusData([]); }}>Xóa</Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Step 3: Preview & Launch */}
        {selectedConfigId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <CardTitle>Preview & Launch</CardTitle>
                    <CardDescription>{syllabusData.length > 0 ? 'Xem trước dữ liệu và khởi chạy batch execution' : 'Khởi chạy execution (Single Run)'}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Data preview table (Only show if data exists) */}
                {syllabusData.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">Lesson ID</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Difficulty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syllabusData.map((row, idx) => (
                          <motion.tr
                            key={idx}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="border-t hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 text-sm font-mono">{row.lessonId}</td>
                            <td className="px-4 py-3 text-sm">{row.lessonTitle}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground`}>
                                {row.difficulty}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-muted/30 text-center text-muted-foreground text-sm">
                    Không có dữ liệu input. Hệ thống sẽ khởi chạy 1 execution test.
                  </div>
                )}

                {/* Summary */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Tổng số executions:</p>
                    <p className="text-2xl font-bold">{syllabusData.length || 1}</p>
                  </div>
                  {syllabusData.length > 0 && (
                    <div className="space-y-1 text-right">
                      <p className="text-sm text-muted-foreground">Estimated time:</p>
                      <p className="text-2xl font-bold">~{syllabusData.length * 5} phút</p>
                    </div>
                  )}
                </div>

                {/* Launch button */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg bg-gradient-to-r from-success to-primary text-white shadow-lg hover:shadow-glow transition-shadow"
                    onClick={handleLaunch}
                    disabled={isLaunching || !selectedConfigId}
                  >
                    {isLaunching ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-5 h-5 mr-2" />
                        Khởi chạy {syllabusData.length || 1} Execution{syllabusData.length !== 1 ? 's' : ''}
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
