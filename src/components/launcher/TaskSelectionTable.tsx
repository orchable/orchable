import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getValueByPath, processTaskData } from '@/lib/jsonAnalyzer';
import type { FieldSelection, FieldMapping, StageContract } from '@/lib/types';
import { ScrollBar } from '@/components/ui/scroll-area';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskInspectorDialog } from './TaskInspectorDialog';

interface TaskSelectionTableProps {
    tasks: any[];
    selectedIndices: number[];
    onSelectionChange: (indices: number[]) => void;
    selection: FieldSelection;
    sampleJson: any;
    mapping: FieldMapping;
    contract: StageContract | null;
}

export const TaskSelectionTable: React.FC<TaskSelectionTableProps> = ({
    tasks,
    selectedIndices,
    onSelectionChange,
    selection,
    sampleJson,
    mapping,
    contract
}) => {
    const [inspectorData, setInspectorData] = React.useState<{
        taskIndex: number;
        input_data: any;
        extra: any;
        rawTask: any;
    } | null>(null);

    const toggleAll = () => {
        if (selectedIndices.length === tasks.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(tasks.map((_, i) => i));
        }
    };

    const toggleIndex = (index: number) => {
        if (selectedIndices.includes(index)) {
            onSelectionChange(selectedIndices.filter(i => i !== index));
        } else {
            onSelectionChange([...selectedIndices, index]);
        }
    };

    // Supabase-like View: Fixed high-level columns
    const columns = [
        { key: 'actions', label: '', width: 'w-[40px]' }, // Actions column
        { key: 'task_type', label: 'task_type', width: 'min-w-[120px]' },
        { key: 'lo_code', label: 'lo_code', width: 'min-w-[150px]' },
        { key: 'input_data', label: 'input_data', width: 'min-w-[300px]' },
        { key: 'extra', label: 'extra', width: 'min-w-[300px]' },
    ];

    return (
        <div className="rounded-lg border">
            <ScrollArea className="h-[450px]">
                <div className="overflow-x-auto">
                    <Table className="min-w-full">
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={selectedIndices.length === tasks.length && tasks.length > 0}
                                        onCheckedChange={toggleAll}
                                    />
                                </TableHead>
                                <TableHead className="text-xs">#</TableHead>
                                {columns.map(col => (
                                    <TableHead key={col.key} className={`text-xs font-mono ${col.width}`}>
                                        {col.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.map((task, idx) => (
                                <TableRow key={idx} className={selectedIndices.includes(idx) ? 'bg-primary/5' : ''}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIndices.includes(idx)}
                                            onCheckedChange={() => toggleIndex(idx)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                                    {columns.map(col => {
                                        const processed = processTaskData(
                                            task,
                                            sampleJson,
                                            selection,
                                            mapping,
                                            contract?.input.fields.map(f => f.name) || []
                                        );

                                        let displayValue: any = '';
                                        if (col.key === 'actions') {
                                            displayValue = (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => setInspectorData({
                                                        taskIndex: idx,
                                                        input_data: processed.input_data,
                                                        extra: processed.extra,
                                                        rawTask: task
                                                    })}
                                                    title="Inspect Task Data"
                                                >
                                                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                                </Button>
                                            );
                                        } else if (col.key === 'input_data') {
                                            displayValue = JSON.stringify(processed.input_data);
                                        } else if (col.key === 'extra') {
                                            displayValue = JSON.stringify(processed.extra);
                                        } else if (col.key === 'lo_code') {
                                            displayValue = processed.input_data.lo_code || processed.extra.lo_code || task.lo_code || '';
                                        } else if (col.key === 'task_type') {
                                            displayValue = task.task_type || 'generic';
                                        }

                                        return (
                                            <TableCell key={col.key} className="text-[11px] font-mono max-w-[400px]">
                                                {col.key === 'actions' ? (
                                                    displayValue
                                                ) : (
                                                    <div className="truncate" title={typeof displayValue === 'string' ? displayValue : ''}>
                                                        {displayValue}
                                                    </div>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                            {tasks.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={columns.length + 2} className="text-center py-8 text-muted-foreground italic">
                                        No tasks found in JSON
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <TaskInspectorDialog
                isOpen={!!inspectorData}
                onClose={() => setInspectorData(null)}
                data={inspectorData}
            />
        </div>
    );
};
