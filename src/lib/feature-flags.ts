/**
 * Funcionalidades desactivadas temporalmente.
 * Para reactivar chat o formularios, cambiar el flag correspondiente a `true`.
 */
export const FEATURE_FLAGS = {
  CHAT_ENABLED: false,
  FORMS_ENABLED: false,
} as const;

export function isChatEnabled(): boolean {
  return FEATURE_FLAGS.CHAT_ENABLED;
}

export function areFormsEnabled(): boolean {
  return FEATURE_FLAGS.FORMS_ENABLED;
}

export const CHAT_DISABLED_MESSAGE =
  "El chat no está disponible por el momento.";

export const FORMS_DISABLED_MESSAGE =
  "Los formularios no están disponibles por el momento.";

/** Fuerza chat deshabilitado al leer/guardar políticas. */
export function withoutChatUnlock<T extends {
  chatUnlockOnAppointment: boolean;
  chatUnlockOnAdvancePaid: boolean;
  chatUnlockOnRemainderPaid: boolean;
}>(policy: T): T {
  if (isChatEnabled()) return policy;
  return {
    ...policy,
    chatUnlockOnAppointment: false,
    chatUnlockOnAdvancePaid: false,
    chatUnlockOnRemainderPaid: false,
  };
}
