import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { hubService } from "@/services/hubService";
import { toast } from "sonner";
import { Flag, AlertTriangle } from "lucide-react";

interface ReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assetId: string;
    assetTitle: string;
}

export const ReportDialog: React.FC<ReportDialogProps> = ({
    open,
    onOpenChange,
    assetId,
    assetTitle,
}) => {
    const [reason, setReason] = useState<string>("spam");
    const [details, setDetails] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await hubService.reportAsset(assetId, reason, details);
            toast.success("Thank you. Asset reported for moderation.");
            onOpenChange(false);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to submit report";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                        <Flag className="w-5 h-5 text-destructive" />
                    </div>
                    <DialogTitle>Report Asset</DialogTitle>
                    <DialogDescription>
                        Help us keep the Hub safe. Why are you reporting "{assetTitle}"?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Reason</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="spam">Spam / Low Quality</SelectItem>
                                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                                <SelectItem value="copyright">Copyright Violation</SelectItem>
                                <SelectItem value="malicious">Malicious Code / Phishing</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Additional Details (Optional)</Label>
                        <Textarea
                            placeholder="Provide more context for our moderators..."
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            className="h-24 resize-none"
                        />
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground border border-border/50">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <p>
                            Intentional misuse of the reporting system may result in account restrictions.
                            Assets with ≥5 reports are automatically hidden pending review.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Submitting..." : "Submit Report"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
