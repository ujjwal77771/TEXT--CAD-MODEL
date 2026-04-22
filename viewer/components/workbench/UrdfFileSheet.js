import { memo, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "../ui/accordion";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import FileSheet from "./FileSheet";

const fieldLabelClasses = "block text-xs font-medium text-muted-foreground";
const compactInputClasses = "h-8 text-xs font-medium tabular-nums";

function formatJointValue(valueDeg) {
  const rounded = Math.round(Number(valueDeg) * 10) / 10;
  return `${Number.isFinite(rounded) ? rounded : 0}\u00b0`;
}

function formatJointInput(valueDeg) {
  const rounded = Math.round(Number(valueDeg) * 10) / 10;
  return Number.isFinite(rounded) ? String(rounded) : "";
}

function clampJointInputValue(valueDeg, minValueDeg, maxValueDeg, fallbackValueDeg) {
  const numericValue = Number.isFinite(Number(valueDeg)) ? Number(valueDeg) : fallbackValueDeg;
  return Math.min(Math.max(numericValue, minValueDeg), Math.max(minValueDeg, maxValueDeg));
}

const UrdfJointRow = memo(function UrdfJointRow({
  joint,
  valueDeg,
  onValueChange
}) {
  const jointName = String(joint?.name || "").trim();
  const minValueDeg = Number.isFinite(Number(joint?.minValueDeg)) ? Number(joint.minValueDeg) : -180;
  const maxValueDeg = Number.isFinite(Number(joint?.maxValueDeg)) ? Number(joint.maxValueDeg) : 180;
  const safeValueDeg = clampJointInputValue(valueDeg, minValueDeg, maxValueDeg, 0);
  const pendingFrameRef = useRef(0);
  const pendingValueRef = useRef(safeValueDeg);
  const [liveValueDeg, setLiveValueDeg] = useState(safeValueDeg);
  const [draftValue, setDraftValue] = useState(() => formatJointInput(safeValueDeg));

  useEffect(() => {
    pendingValueRef.current = safeValueDeg;
    setLiveValueDeg(safeValueDeg);
    setDraftValue(formatJointInput(safeValueDeg));
  }, [safeValueDeg]);

  useEffect(() => () => {
    if (pendingFrameRef.current && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(pendingFrameRef.current);
    }
  }, []);

  const scheduleValueChange = (nextValueDeg) => {
    pendingValueRef.current = nextValueDeg;
    if (typeof requestAnimationFrame !== "function") {
      onValueChange(joint, nextValueDeg);
      return;
    }
    if (pendingFrameRef.current) {
      return;
    }
    pendingFrameRef.current = requestAnimationFrame(() => {
      pendingFrameRef.current = 0;
      onValueChange(joint, pendingValueRef.current);
    });
  };

  const commitValue = (nextValueDeg) => {
    const normalizedValueDeg = clampJointInputValue(nextValueDeg, minValueDeg, maxValueDeg, liveValueDeg);
    pendingValueRef.current = normalizedValueDeg;
    if (pendingFrameRef.current && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(pendingFrameRef.current);
      pendingFrameRef.current = 0;
    }
    setLiveValueDeg(normalizedValueDeg);
    setDraftValue(formatJointInput(normalizedValueDeg));
    onValueChange(joint, normalizedValueDeg);
  };

  return (
    <div className="px-3 py-2">
      <label className="block">
        <span className={fieldLabelClasses}>{jointName || "Joint"}</span>
        <div className="mt-1.5 flex items-center gap-2">
          <Slider
            className="h-8 min-w-0 flex-1"
            min={minValueDeg}
            max={maxValueDeg}
            step={1}
            value={[liveValueDeg]}
            onValueChange={(nextValue) => {
              const nextValueDeg = clampJointInputValue(nextValue?.[0], minValueDeg, maxValueDeg, liveValueDeg);
              setLiveValueDeg(nextValueDeg);
              setDraftValue(formatJointInput(nextValueDeg));
              scheduleValueChange(nextValueDeg);
            }}
            onValueCommit={(nextValue) => {
              commitValue(nextValue?.[0]);
            }}
            aria-label={jointName || "Joint angle"}
          />

          <div className="relative w-20 shrink-0">
            <Input
              type="number"
              min={String(minValueDeg)}
              max={String(maxValueDeg)}
              step="0.1"
              inputMode="decimal"
              value={draftValue}
              onChange={(event) => {
                setDraftValue(event.target.value);
              }}
              onFocus={(event) => {
                event.currentTarget.select();
              }}
              onMouseUp={(event) => {
                event.preventDefault();
              }}
              onBlur={() => {
                commitValue(draftValue);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              className={`${compactInputClasses} pr-8 text-right`}
              aria-label={`${jointName || "Joint"} angle in degrees`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">deg</span>
          </div>
        </div>
      </label>

      <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
        <span>{formatJointValue(minValueDeg)}</span>
        <span>{formatJointValue(maxValueDeg)}</span>
      </div>
    </div>
  );
});

export default function UrdfFileSheet({
  open,
  isDesktop,
  width,
  joints,
  jointValues,
  onJointValueChange,
  onResetPose
}) {
  const movableJoints = Array.isArray(joints) ? joints : [];

  return (
    <FileSheet
      open={open}
      title="URDF"
      isDesktop={isDesktop}
      width={width}
    >
      <Accordion type="multiple" defaultValue={["joints"]}>
        <AccordionItem value="joints">
          <AccordionTrigger>Joints</AccordionTrigger>
          <AccordionContent className="py-1">
            {movableJoints.length ? (
              <>
                {movableJoints.map((joint) => (
                  <UrdfJointRow
                    key={joint.name}
                    joint={joint}
                    valueDeg={jointValues?.[joint.name] ?? joint?.defaultValueDeg ?? 0}
                    onValueChange={onJointValueChange}
                  />
                ))}
                <div className="px-2.5 py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={onResetPose}
                  >
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    <span>Reset pose</span>
                  </Button>
                </div>
              </>
            ) : (
              <p className="px-3 py-2 text-xs text-muted-foreground">No movable joints are available.</p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </FileSheet>
  );
}
