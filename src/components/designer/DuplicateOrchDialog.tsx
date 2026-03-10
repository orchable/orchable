import { useState, useEffect } from "react";
import { useDesignerStore } from "@/stores/designerStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface DuplicateOrchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DuplicateOrchDialog({
    open,
    onOpenChange,
}: DuplicateOrchDialogProps) {
    const { orchestratorName, duplicateOrchestrationToCanvas } =
        useDesignerStore();
    const [newName, setNewName] = useState("");
    const [suffix, setSuffix] = useState("_copy");

    useEffect(() => {
        if (open) {
            setNewName(`${orchestratorName} - Copy`);
            setSuffix("_copy");
        }
    }, [open, orchestratorName]);

    const handleDuplicate = () => {
        if (!newName.trim()) {
            toast.error("Vui lòng nhập tên mới cho Orchestration");
            return;
        }

        duplicateOrchestrationToCanvas(newName.trim(), suffix.trim());
        toast.success("Đã tạo bản sao trên canvas. Hãy bấm Lưu để hoàn tất.");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Duplicate Orchestration</DialogTitle>
                    <DialogDescription>
                        Tạo một bản sao của orchestration hiện tại với các stage
                        key mới để tránh trùng lặp.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label htmlFor="name" className="text-sm font-medium">
                            Tên Orchestration mới
                        </label>
                        <Input
                            id="name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="e.g. Pipeline Gen V2"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="suffix" className="text-sm font-medium">
                            Stage Key Suffix
                        </label>
                        <Input
                            id="suffix"
                            value={suffix}
                            onChange={(e) => setSuffix(e.target.value)}
                            placeholder="e.g. _v2"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Hệ thống sẽ tự động thêm hậu tố này vào sau tất cả các
                            stage key hiện có.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button onClick={handleDuplicate}>Duplicate</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
