import { onMounted, onUnmounted, ref } from "vue";
import {
  registerCloseGuardArmOnInteraction,
  registerCloseTabGuard,
} from "../utils/operatorWindows";

/**
 * Confirmación al cerrar pestaña (solo en esta pestaña, tras un clic aquí).
 */
export function useOperatorCloseGuard() {
  const needsArmClick = ref(true);
  const armed = ref(false);

  let removeCloseGuard: (() => void) | null = null;
  let removeArmListeners: (() => void) | null = null;

  function applyArmed() {
    armed.value = true;
    needsArmClick.value = false;
  }

  onMounted(() => {
    removeCloseGuard = registerCloseTabGuard({
      isArmed: () => armed.value,
    });

    removeArmListeners = registerCloseGuardArmOnInteraction(applyArmed);
  });

  onUnmounted(() => {
    removeCloseGuard?.();
    removeArmListeners?.();
  });

  return { needsArmClick, armNow: applyArmed };
}
