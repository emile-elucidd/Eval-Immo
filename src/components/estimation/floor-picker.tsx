"use client";

import { cn } from "@/lib/utils";

/**
 * Floor selection. A slider would be shorter, but the ground floor and the top
 * floor are the two answers that move the price most, so both get a name rather
 * than a number the visitor has to find on a track.
 */

const FLOORS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function FloorPicker({
  floor,
  isLastFloor,
  onFloorChange,
  onLastFloorChange,
}: {
  floor: number;
  isLastFloor: boolean;
  onFloorChange: (floor: number) => void;
  onLastFloorChange: (isLastFloor: boolean) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {FLOORS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={floor === value}
            onClick={() => onFloorChange(value)}
            className={cn(
              "flex h-14 items-center justify-center rounded-md border text-base font-bold tabular-nums transition-all hover:border-primary focus:outline-dashed focus:outline-2 focus:outline-offset-2 focus:outline-primary",
              floor === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground",
            )}
          >
            {value === 0 ? "RdC" : value}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={floor > 10}
          onClick={() => onFloorChange(11)}
          className={cn(
            "flex h-14 items-center justify-center rounded-md border text-base font-bold transition-all hover:border-primary focus:outline-dashed focus:outline-2 focus:outline-offset-2 focus:outline-primary",
            floor > 10
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground",
          )}
        >
          10+
        </button>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-base text-foreground">
        <input
          type="checkbox"
          checked={isLastFloor}
          onChange={(event) => onLastFloorChange(event.target.checked)}
          className="h-5 w-5 accent-[hsl(var(--primary))]"
        />
        Dernier étage
      </label>
    </div>
  );
}
