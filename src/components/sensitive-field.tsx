import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useStore } from "@/data/store";

/**
 * Champ confidentiel (médical / salarial / disciplinaire).
 * Masqué par défaut ; chaque révélation est journalisée dans l'audit.
 */
export function SensitiveField({
  label,
  value,
  auditTarget,
}: {
  label: string;
  value: string;
  auditTarget: string;
}) {
  const { logSensitiveAccess, settings } = useStore();
  const [revealed, setRevealed] = useState(!settings.maskConfidential);

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Lock className="size-3" /> {label}
        </p>
        <p className="mt-1 truncate text-sm" aria-live="polite">
          {revealed ? value : "•••••• (masqué)"}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs"
        onClick={() => {
          if (!revealed) logSensitiveAccess(auditTarget, `Révélation du champ « ${label} ».`);
          setRevealed((prev) => !prev);
        }}
      >
        {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {revealed ? "Masquer" : "Révéler"}
      </Button>
    </div>
  );
}
