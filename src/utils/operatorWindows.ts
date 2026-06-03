import type { RouteLocationRaw, Router } from "vue-router";
import { message } from "ant-design-vue";
import {
  basketballBoardRoute,
  basketballControlsRoute,
  boardRoute,
  controlsRoute,
} from "./routes";

type CloseGuardOptions = {
  isArmed?: () => boolean;
};

/**
 * Avisa al cerrar o recargar. Chrome solo muestra el diálogo si hubo clic/tecla en ESTA pestaña.
 */
export function registerCloseTabGuard(options: CloseGuardOptions = {}): () => void {
  const isArmed = options.isArmed ?? (() => true);

  const handler = (event: BeforeUnloadEvent) => {
    if (!isArmed()) return;
    event.preventDefault();
    event.returnValue = " ";
    return " ";
  };

  window.addEventListener("beforeunload", handler);

  return () => {
    window.removeEventListener("beforeunload", handler);
  };
}

/** Registra el primer clic o tecla en esta pestaña para activar la confirmación al cerrar. */
export function registerCloseGuardArmOnInteraction(onArm?: () => void): () => void {
  const arm = () => {
    onArm?.();
    removeListeners();
  };

  const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown"];
  const opts: AddEventListenerOptions = { capture: true };

  const removeListeners = () => {
    events.forEach((name) => window.removeEventListener(name, arm, opts));
  };

  events.forEach((name) => window.addEventListener(name, arm, opts));

  return removeListeners;
}

function openRouteInNewTab(router: Router, route: RouteLocationRaw): Window | null {
  const href = router.resolve(route).href;
  return window.open(href, "_blank");
}

function warnIfPopupsBlocked(windows: (Window | null)[]) {
  if (windows.some((w) => !w)) {
    message.warning(
      "El navegador bloqueó una ventana. Permite ventanas emergentes para este sitio y vuelve a intentarlo."
    );
  }
}

export function openHockeyBoardInNewTab(router: Router, matchId?: string): Window | null {
  return openRouteInNewTab(router, boardRoute(matchId));
}

export function openHockeyControlsInNewTab(router: Router, matchId?: string): Window | null {
  return openRouteInNewTab(router, controlsRoute(matchId));
}

export function openBasketballBoardInNewTab(router: Router, matchId?: string): Window | null {
  return openRouteInNewTab(router, basketballBoardRoute(matchId));
}

export function openBasketballControlsInNewTab(router: Router, matchId?: string): Window | null {
  return openRouteInNewTab(router, basketballControlsRoute(matchId));
}

/** Abre marcador + controles. Debe llamarse de forma síncrona desde un clic del usuario. */
export function openHockeyOperatorSession(router: Router, matchId?: string): boolean {
  const board = openHockeyBoardInNewTab(router, matchId);
  const controls = openHockeyControlsInNewTab(router, matchId);
  warnIfPopupsBlocked([board, controls]);
  return Boolean(board && controls);
}

export function openBasketballOperatorSession(router: Router, matchId?: string): boolean {
  const board = openBasketballBoardInNewTab(router, matchId);
  const controls = openBasketballControlsInNewTab(router, matchId);
  warnIfPopupsBlocked([board, controls]);
  return Boolean(board && controls);
}
