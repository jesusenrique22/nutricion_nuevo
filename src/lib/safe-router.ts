type RouterLike = { refresh: () => void; push: (href: string) => void };

const ROUTER_INIT_ERROR =
  "Router action dispatched before initialization";

function isRouterInitError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes(ROUTER_INIT_ERROR)
  );
}

function runWhenRouterReady(run: () => void, attempt = 0) {
  if (typeof window === "undefined") return;

  try {
    run();
  } catch (error) {
    if (!isRouterInitError(error) || attempt >= 20) throw error;
    window.setTimeout(() => runWhenRouterReady(run, attempt + 1), 50);
  }
}

export function safeRouterRefresh(router: RouterLike) {
  window.requestAnimationFrame(() => {
    runWhenRouterReady(() => router.refresh());
  });
}

export function safeRouterPush(router: RouterLike, href: string) {
  window.requestAnimationFrame(() => {
    runWhenRouterReady(() => router.push(href));
  });
}
