type Deps = {
  /** Close the top-most open popup / drawer. Returns true if there was one. */
  runTopBackHandler: () => boolean;
  getPathname: () => string;
  /** Screens where back should leave the app (dashboards, login) instead of going to the previous page. */
  isRoot: (pathname: string) => boolean;
  goBack: () => void;
  exitApp: () => void;
  notify: (message: string) => void;
  now?: () => number;
};

/**
 * What the Android back button does:
 * 1. an open popup / drawer closes first
 * 2. on a normal screen it goes back one page
 * 3. on a home screen it asks to press again within 2 seconds, then leaves the app
 */
export function createBackButtonHandler(deps: Deps) {
  let lastPress = Number.NEGATIVE_INFINITY; // "never pressed", whatever clock `now` uses
  return ({ canGoBack }: { canGoBack: boolean }) => {
    if (deps.runTopBackHandler()) return;
    if (canGoBack && !deps.isRoot(deps.getPathname())) {
      deps.goBack();
      return;
    }
    const now = (deps.now ?? Date.now)();
    if (now - lastPress < 2000) {
      deps.exitApp();
      return;
    }
    lastPress = now;
    deps.notify("Press back again to exit");
  };
}