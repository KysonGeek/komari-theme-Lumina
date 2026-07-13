import { CanvasStrip, fillRoundedRect, resolveCssColor } from "./CanvasStrip";
import { latencyHeatColor } from "@/utils/metricTone";
import { isValidPingLatency } from "@/utils/pingValues";
import type { PingOverviewBucket } from "@/types/komari";

const ACTIVE_BAR_HEIGHT = 0.84;

interface MiniBarsProps {
  /** Raw latency values (ms) ordered oldest→newest. Negative values are treated as lost and dimmed. */
  values: number[];
  /** Color tier threshold based on this value (fallback path only). */
  lastValue?: number;
  /** How many bars to render (pads older buckets with empty). */
  count?: number;
  buckets?: PingOverviewBucket[];
  redrawKey?: string;
  onHoverIndex?: (index: number | null) => void;
}

/** Pixel-matched latency strip, visually aligned with the packet-loss strip. */
export function MiniBars({
  values,
  lastValue,
  count = 24,
  buckets,
  redrawKey,
  onHoverIndex,
}: MiniBarsProps) {
  const bars: Array<{
    value: number;
    bucket: PingOverviewBucket | null;
    hasSamples: boolean;
    hasValue: boolean;
    tone: string;
  }> =
    buckets && buckets.length > 0
      ? buckets.map((bucket) => {
          const value = bucket.value ?? 0;
          return {
            value,
            bucket,
            hasSamples: bucket.total > 0,
            hasValue: bucket.value != null,
            tone: latencyHeatColor(bucket.value),
          };
        })
      : (() => {
          const fallbackTone = latencyHeatColor(lastValue);
          const nextBars: Array<{
            value: number;
            bucket: PingOverviewBucket | null;
            hasSamples: boolean;
            hasValue: boolean;
            tone: string;
          }> = [];

          if (values.length === 0) {
            for (let i = 0; i < count; i++) {
              nextBars.push({
                value: 0,
                bucket: null,
                hasSamples: false,
                hasValue: false,
                tone: fallbackTone,
              });
            }
            return nextBars;
          }

          if (values.length <= count) {
            const padding = count - values.length;
            for (let i = 0; i < padding; i++) {
              nextBars.push({
                value: 0,
                bucket: null,
                hasSamples: false,
                hasValue: false,
                tone: fallbackTone,
              });
            }
            values.forEach((value) => {
              const hasValue = isValidPingLatency(value);
              nextBars.push({
                value,
                bucket: null,
                hasSamples: true,
                hasValue,
                tone: latencyHeatColor(hasValue ? value : lastValue),
              });
            });
            return nextBars;
          }

          const bucketSize = values.length / count;
          for (let i = 0; i < count; i++) {
            const start = Math.floor(i * bucketSize);
            const end = Math.floor((i + 1) * bucketSize);
            const slice = values.slice(start, end);
            const valid = slice.filter(isValidPingLatency);
            const avg = valid.length
              ? valid.reduce((a, b) => a + b, 0) / valid.length
              : 0;
            nextBars.push({
              value: avg,
              bucket: null,
              hasSamples: slice.length > 0,
              hasValue: valid.length > 0,
              tone: latencyHeatColor(valid.length > 0 ? avg : lastValue),
            });
          }
          return nextBars;
        })();

  return (
    <CanvasStrip
      className="mini-bar-row"
      height={16}
      ariaHidden
      redrawKey={redrawKey}
      getHoverIndex={(offsetX, width) => {
        if (bars.length === 0 || width <= 0) return null;
        const slotWidth = width / bars.length;
        const index = Math.max(0, Math.min(bars.length - 1, Math.floor(offsetX / slotWidth)));
        const bar = bars[index];
        return bar?.bucket?.index ?? (bar?.hasSamples ? index : null);
      }}
      onHoverIndex={onHoverIndex}
      draw={(ctx, width, height) => {
        const inactiveColor = resolveCssColor("var(--progress-bg)");
        const gap = bars.length > 48 ? 1 : 2;
        const barWidth = Math.max(1, (width - gap * (bars.length - 1)) / Math.max(1, bars.length));

        const barHeight = height * ACTIVE_BAR_HEIGHT;
        const y = height - barHeight;

        bars.forEach(({ hasValue, tone }, index) => {
          const x = index * (barWidth + gap);

          ctx.globalAlpha = hasValue ? 0.94 : 0.42;
          ctx.fillStyle = hasValue ? tone : inactiveColor;
          fillRoundedRect(ctx, x, y, barWidth, barHeight, 2);
        });

        ctx.globalAlpha = 1;
      }}
    />
  );
}
