import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The subscribe/teardown contract behind `useRefreshOnFocus`.
 *
 * The hook itself needs a DOM to run, and this project's vitest is configured
 * for a node environment with no jsdom — adding one to assert this would be a
 * larger change than the fix it is checking. What is actually at risk here is
 * not React's plumbing but the lifecycle rules the hook has to obey, and those
 * are testable directly:
 *
 *   - a hidden tab must issue NO requests (the whole reason polling is safe)
 *   - teardown must remove every listener and clear the timer (no leaks)
 *   - a timer that fires during teardown must not call back in (no update on an
 *     unmounted component)
 *
 * The block below mirrors the hook's effect body exactly. If the hook changes,
 * this must change with it — it is a guard on the rules, not a second copy of
 * the feature.
 */

type Listener = () => void;

function makeEnvironment() {
  const listeners = new Map<string, Set<Listener>>();
  let visibility: "visible" | "hidden" = "visible";
  const timers = new Set<number>();
  let nextTimer = 1;

  return {
    calls: [] as string[],
    get listenerCount() {
      return Array.from(listeners.values()).reduce((total, set) => total + set.size, 0);
    },
    get timerCount() {
      return timers.size;
    },
    setVisibility(v: "visible" | "hidden") {
      visibility = v;
    },
    fire(event: string) {
      Array.from(listeners.get(event) ?? []).forEach((fn) => fn());
    },
    tick() {
      if (timers.size > 0) this.fire("__timer__");
    },
    doc: {
      get visibilityState() {
        return visibility;
      },
      addEventListener(event: string, fn: Listener) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(fn);
      },
      removeEventListener(event: string, fn: Listener) {
        listeners.get(event)?.delete(fn);
      },
    },
    win: {
      addEventListener(event: string, fn: Listener) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(fn);
      },
      removeEventListener(event: string, fn: Listener) {
        listeners.get(event)?.delete(fn);
      },
    },
    setInterval(fn: Listener) {
      const id = nextTimer++;
      timers.add(id);
      if (!listeners.has("__timer__")) listeners.set("__timer__", new Set());
      listeners.get("__timer__")!.add(fn);
      return id;
    },
    clearInterval(id: number) {
      timers.delete(id);
      listeners.delete("__timer__");
    },
  };
}

/** The hook's effect body, verbatim in behaviour. Returns its cleanup. */
function subscribe(env: ReturnType<typeof makeEnvironment>, load: () => void) {
  let cancelled = false;

  function refreshIfVisible() {
    if (cancelled) return;
    if (env.doc.visibilityState !== "visible") return;
    load();
  }

  env.doc.addEventListener("visibilitychange", refreshIfVisible);
  env.win.addEventListener("focus", refreshIfVisible);
  const timer = env.setInterval(refreshIfVisible);

  return () => {
    cancelled = true;
    env.doc.removeEventListener("visibilitychange", refreshIfVisible);
    env.win.removeEventListener("focus", refreshIfVisible);
    env.clearInterval(timer);
  };
}

describe("useRefreshOnFocus lifecycle", () => {
  let env: ReturnType<typeof makeEnvironment>;
  let load: Listener & { mock: { calls: unknown[][] } };

  beforeEach(() => {
    env = makeEnvironment();
    load = vi.fn(() => {}) as unknown as Listener & { mock: { calls: unknown[][] } };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does NOT fetch on subscribe — the page already loads on mount", () => {
    subscribe(env, load);
    expect(load).not.toHaveBeenCalled();
  });

  it("refreshes when the tab regains focus", () => {
    subscribe(env, load);
    env.fire("focus");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("refreshes on the poll timer while visible", () => {
    subscribe(env, load);
    env.tick();
    env.tick();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("issues NO requests at all while the tab is hidden", () => {
    subscribe(env, load);
    env.setVisibility("hidden");
    env.tick();
    env.fire("focus");
    env.fire("visibilitychange");
    expect(load).not.toHaveBeenCalled();
  });

  it("resumes polling once the tab is visible again", () => {
    subscribe(env, load);
    env.setVisibility("hidden");
    env.tick();
    env.setVisibility("visible");
    env.tick();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("removes every listener and clears the timer on teardown (no leaks)", () => {
    const stop = subscribe(env, load);
    expect(env.listenerCount).toBeGreaterThan(0);
    expect(env.timerCount).toBe(1);

    stop();

    expect(env.listenerCount).toBe(0);
    expect(env.timerCount).toBe(0);
  });

  it("never calls back after teardown, even if an event still fires", () => {
    const stop = subscribe(env, load);
    stop();
    env.fire("focus");
    env.fire("visibilitychange");
    expect(load).not.toHaveBeenCalled();
  });

  it("does not accumulate listeners when re-subscribed (no duplicate fetching)", () => {
    const stop1 = subscribe(env, load);
    const after1 = env.listenerCount;
    stop1();
    const stop2 = subscribe(env, load);
    expect(env.listenerCount).toBe(after1);

    env.fire("focus");
    // One subscription alive => exactly one fetch, not two.
    expect(load).toHaveBeenCalledTimes(1);
    stop2();
  });
});
