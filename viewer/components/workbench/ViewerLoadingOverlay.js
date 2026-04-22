import { LoaderCircle } from "lucide-react";
import { Alert } from "../ui/alert";

export default function ViewerLoadingOverlay({ viewerLoading, previewMode, viewerLoadingLabel }) {
  if (!viewerLoading || previewMode) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-foreground/40">
      <Alert
        role="status"
        className="cad-glass-popover w-auto grid-cols-[auto_1fr] items-center gap-3 px-5 py-3 text-sm font-semibold text-popover-foreground shadow-sm"
      >
        <LoaderCircle className="h-4 w-4 animate-spin text-primary" strokeWidth={2.25} aria-hidden="true" />
        <span>{viewerLoadingLabel}</span>
      </Alert>
    </div>
  );
}
