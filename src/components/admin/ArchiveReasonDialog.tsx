import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type ArchiveReason = "wording" | "price" | "image" | "other";

const REASONS: { value: ArchiveReason; label: string }[] = [
  { value: "wording", label: "בעיית ניסוח" },
  { value: "price", label: "בעיית מחיר" },
  { value: "image", label: "בעיית תמונה" },
  { value: "other", label: "אחר" },
];

interface ArchiveReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: ArchiveReason, notes: string) => void | Promise<void>;
  loading?: boolean;
}

export function ArchiveReasonDialog({ open, onOpenChange, onConfirm, loading }: ArchiveReasonDialogProps) {
  const [reason, setReason] = useState<ArchiveReason>("wording");
  const [notes, setNotes] = useState("");

  const handleConfirm = async () => {
    await onConfirm(reason, notes.trim());
    setNotes("");
    setReason("wording");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>העברה לארכיון</DialogTitle>
          <DialogDescription>
            בחרו סיבה כדי שנוכל לזהות תקלות חוזרות במוצרים.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={(v) => setReason(v as ArchiveReason)} className="gap-3 py-2">
          {REASONS.map((r) => (
            <div key={r.value} className="flex items-center gap-3 flex-row-reverse justify-end">
              <Label htmlFor={`reason-${r.value}`} className="cursor-pointer flex-1 text-right">
                {r.label}
              </Label>
              <RadioGroupItem id={`reason-${r.value}`} value={r.value} />
            </div>
          ))}
        </RadioGroup>

        <Textarea
          placeholder="הערה חופשית (אופציונלי)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="resize-none"
        />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            ביטול
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "מעביר..." : "אישור"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const ARCHIVE_REASON_LABELS: Record<string, string> = {
  sent: "נשלח",
  wording: "בעיית ניסוח",
  price: "בעיית מחיר",
  image: "בעיית תמונה",
  other: "אחר",
};
