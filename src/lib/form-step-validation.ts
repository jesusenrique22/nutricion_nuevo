/** Valida los campos requeridos visibles de un paso del wizard antes de avanzar. */
export function validateFormStep(
  form: HTMLFormElement | null,
  step: number,
): boolean {
  if (!form) return false;

  const stepEl = form.querySelector(`[data-step="${step}"]`);
  if (!stepEl) return true;

  const checkboxGroups = stepEl.querySelectorAll<HTMLElement>(
    "[data-checkbox-group]",
  );
  for (const group of checkboxGroups) {
    if (group.dataset.groupRequired !== "true") continue;
    const name = group.dataset.checkboxGroup;
    if (!name) continue;
    const boxes = group.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][name="${name}"]`,
    );
    const anyChecked = Array.from(boxes).some((b) => b.checked);
    if (!anyChecked) {
      const first = boxes[0];
      first?.setCustomValidity("Selecciona al menos una opción.");
      first?.reportValidity();
      first?.setCustomValidity("");
      return false;
    }
  }

  const fields = stepEl.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >("input, select, textarea");

  for (const field of fields) {
    if (field.disabled) continue;
    if (
      field instanceof HTMLInputElement &&
      (field.type === "hidden" || field.readOnly)
    ) {
      continue;
    }
    if (
      (field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement) &&
      field.readOnly
    ) {
      continue;
    }

    if (
      field instanceof HTMLInputElement &&
      field.type === "checkbox" &&
      field.closest("[data-checkbox-group]")
    ) {
      continue;
    }

    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }

  return true;
}
