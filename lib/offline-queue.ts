"use client";

import * as React from "react";

import { api, isNetworkError } from "./api";

// NFR-07: a field tap made without network is kept on the phone and sent later
// with the time it was tapped. The server ignores replays of steps already done.

type Queued = { url: string; body: Record<string, unknown>; queuedAt: number };

const KEY = "smvs108.queue";
const listeners = new Set<() => void>();

function read(): Queued[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Queued[];
  } catch {
    return [];
  }
}

function write(items: Queued[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage unavailable: the tap is lost, but the caller already showed an error
  }
  listeners.forEach((l) => l());
}

/** Posts now; if the network is down, queues the call with tappedAt and returns { queued: true }. */
export async function postOrQueue(url: string, body: Record<string, unknown>) {
  const withTime = { ...body, tappedAt: new Date().toISOString() };
  try {
    const r = await api.post(url, withTime);
    return { queued: false, data: r.data.data };
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    write([...read(), { url, body: withTime, queuedAt: Date.now() }]);
    return { queued: true, data: null };
  }
}

let flushing = false;

export async function flushQueue() {
  if (flushing) return;
  flushing = true;
  try {
    let items = read();
    while (items.length) {
      const [first, ...rest] = items;
      try {
        await api.post(first.url, first.body);
      } catch (err) {
        if (isNetworkError(err)) break; // still offline: keep the rest
        // a real error (e.g. already released): drop it so the queue does not block
      }
      items = rest;
      write(items);
    }
  } finally {
    flushing = false;
  }
}

export function useQueuedCount() {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    const update = () => setCount(read().length);
    update();
    listeners.add(update);
    const onOnline = () => void flushQueue();
    window.addEventListener("online", onOnline);
    const id = window.setInterval(() => {
      if (read().length) void flushQueue();
    }, 15_000);
    return () => {
      listeners.delete(update);
      window.removeEventListener("online", onOnline);
      window.clearInterval(id);
    };
  }, []);
  return count;
}
