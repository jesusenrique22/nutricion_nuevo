export const appointmentStatusLabels: Record<string, string> = {
  PENDING: "Por confirmar",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

export const paymentStatusLabels: Record<string, string> = {
  PENDING: "Procesando",
  PARTIAL: "Adelanto pagado",
  PAID: "Pagado",
  REFUNDED: "Reembolsado",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
};

export const paymentPhaseLabels: Record<string, string> = {
  PENDING: "Procesando",
  PAID: "Pagado",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
};

export const modalityLabels: Record<string, string> = {
  ONLINE: "Online",
  PRESENCIAL: "Presencial",
};

export const cancelledByLabels: Record<string, string> = {
  PATIENT: "Cancelada por el paciente",
  ADMIN: "Cancelada por Anttova",
};
