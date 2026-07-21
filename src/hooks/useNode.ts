import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  ensureStarted,
  getNodeSnapshot,
  getNodeTrafficTrendSnapshot,
  getVisibleNodeUuidsSnapshot,
  subscribe,
  subscribeToNode,
  getSnapshot,
} from "@/services/wsStore";
import type { NodeDisplay, TrafficTrendSample } from "@/types/komari";

const EMPTY_TRAFFIC_TREND_SNAPSHOT: { up: TrafficTrendSample[]; down: TrafficTrendSample[] } = {
  up: [],
  down: [],
};

function useEnsured(enabled = true) {
  useEffect(() => {
    if (enabled) ensureStarted();
  }, [enabled]);
}

const noopUnsubscribe = () => undefined;

export function useNode(uuid: string, enabled = true): NodeDisplay | undefined {
  useEnsured(enabled);
  // subscribe 身份必须稳定：useSyncExternalStore 会在其变化时退订再订阅，
  // 内联箭头会导致组件每次 render 都重订阅一次。
  const subscribeFn = useCallback(
    (cb: () => void) => (enabled ? subscribeToNode(uuid, cb) : noopUnsubscribe),
    [uuid, enabled],
  );
  const getSnapshotFn = useCallback(
    () => (enabled ? getNodeSnapshot(uuid) : undefined),
    [uuid, enabled],
  );
  return useSyncExternalStore(subscribeFn, getSnapshotFn, getSnapshotFn);
}

export function useNodeTrafficTrend(
  uuid: string,
  enabled = true,
): { up: TrafficTrendSample[]; down: TrafficTrendSample[] } {
  useEnsured(enabled);
  const subscribeFn = useCallback(
    (cb: () => void) => (enabled ? subscribeToNode(uuid, cb) : noopUnsubscribe),
    [uuid, enabled],
  );
  const getSnapshotFn = useCallback(
    () => (enabled ? getNodeTrafficTrendSnapshot(uuid) : EMPTY_TRAFFIC_TREND_SNAPSHOT),
    [uuid, enabled],
  );
  return useSyncExternalStore(subscribeFn, getSnapshotFn, getSnapshotFn);
}

export function useVisibleNodeUuids(): string[] {
  useEnsured();
  return useSyncExternalStore(
    subscribe,
    getVisibleNodeUuidsSnapshot,
    getVisibleNodeUuidsSnapshot,
  );
}

export function useNodeStoreStatus() {
  useEnsured();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () => ({
      lastSuccessAt: snap.lastSuccessAt,
      failureStreak: snap.failureStreak,
    }),
    [snap.failureStreak, snap.lastSuccessAt],
  );
}
