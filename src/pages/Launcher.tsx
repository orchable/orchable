import { motion } from 'framer-motion';
import { Play, Upload, FileSpreadsheet, Rocket, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Mock data
const mockConfigs = [
  { id: '1', name: 'Standard Course Generator', steps: 5, description: 'Tạo đầy đủ học liệu cho 1 lesson' },
  { id: '2', name: 'Quick Quiz Creator', steps: 2, description: 'Chỉ tạo quiz nhanh' },
  { id: '3', name: 'Slide & Docs Only', steps: 3, description: 'Tạo slides và documentation' },
];

const mockSyllabusData = [
  { lessonId: 'L001', title: 'Introduction to React Hooks', difficulty: 'Beginner' },
  { lessonId: 'L002', title: 'Advanced State Management', difficulty: 'Intermediate' },
  { lessonId: 'L003', title: 'Building Custom Hooks', difficulty: 'Advanced' },
];

export function LauncherPage() {
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
              <div className="grid gap-3">
                {mockConfigs.map((config, idx) => (
                  <motion.div
                    key={config.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      idx === 0 
                        ? 'border-primary bg-primary/5' 
                        : 'border-transparent bg-muted/50 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {idx === 0 && <CheckCircle2 className="w-5 h-5 text-primary" />}
                        <div>
                          <p className="font-semibold">{config.name}</p>
                          <p className="text-sm text-muted-foreground">{config.description}</p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {config.steps} steps
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Step 2: Upload TSV */}
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
                  <CardTitle>Upload Syllabus Data (TSV)</CardTitle>
                  <CardDescription>Tải lên file TSV chứa dữ liệu các bài học</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">Click để upload file TSV</p>
                <p className="text-sm text-muted-foreground">hoặc kéo thả file vào đây</p>
              </motion.div>

              {/* Demo: Uploaded file preview */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.5 }}
                className="mt-4 p-4 rounded-lg bg-success/10 border border-success/20"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-success" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">syllabus_data.tsv</p>
                    <p className="text-xs text-muted-foreground">3 lessons detected</p>
                  </div>
                  <Button variant="ghost" size="sm">Xóa</Button>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Step 3: Preview & Launch */}
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
                  <CardDescription>Xem trước dữ liệu và khởi chạy batch execution</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Data preview table */}
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Lesson ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Difficulty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockSyllabusData.map((row, idx) => (
                      <motion.tr
                        key={row.lessonId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 + idx * 0.1 }}
                        className="border-t"
                      >
                        <td className="px-4 py-3 text-sm font-mono">{row.lessonId}</td>
                        <td className="px-4 py-3 text-sm">{row.title}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            row.difficulty === 'Beginner' ? 'bg-success/10 text-success' :
                            row.difficulty === 'Intermediate' ? 'bg-warning/10 text-warning' :
                            'bg-destructive/10 text-destructive'
                          }`}>
                            {row.difficulty}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tổng số executions:</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-sm text-muted-foreground">Estimated time:</p>
                  <p className="text-2xl font-bold">~15 phút</p>
                </div>
              </div>

              {/* Launch button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  size="lg" 
                  className="w-full h-14 text-lg bg-gradient-to-r from-success to-primary text-white shadow-lg hover:shadow-glow transition-shadow"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  Khởi chạy 3 Executions
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
