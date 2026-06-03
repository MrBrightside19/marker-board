import type { ControlShortcutAction, ControlShortcuts } from "../types/userPreferences";

const KEY_LABELS: Record<string, string> = {
  Space: "Espacio",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  PageUp: "Re Pág",
  PageDown: "Av Pág",
  Enter: "Enter",
  Escape: "Esc",
  Tab: "Tab",
};

export function formatShortcutCode(code: string): string {
  if (!code) return "—";
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  return code;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function findControlActionForKey(
  code: string,
  shortcuts: ControlShortcuts
): ControlShortcutAction | null {
  for (const [action, bound] of Object.entries(shortcuts) as [ControlShortcutAction, string][]) {
    if (bound === code) return action;
  }
  return null;
}
