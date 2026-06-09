import {
  Field,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/forms/form-primitives";

export function PersonalDataFields() {
  return (
    <>
      <Field label="Nombre completo">
        <input name="fullName" required className={inputClass} />
      </Field>
      <Field label="Número de teléfono incluyendo código de área">
        <input name="phone" type="tel" required className={inputClass} />
      </Field>
      <Field label="Sexo">
        <select name="gender" required className={selectClass} defaultValue="">
          <option value="" disabled>
            Seleccionar…
          </option>
          <option value="femenino">Femenino</option>
          <option value="masculino">Masculino</option>
          <option value="otro">Otro / Prefiero no decirlo</option>
        </select>
      </Field>
      <Field label="Fecha de nacimiento">
        <input name="birthDate" type="date" required className={inputClass} />
      </Field>
    </>
  );
}

export function ActivityFields() {
  return (
    <>
      <Field label="¿Cuál es tu nivel actual de actividad física?">
        <select name="activityLevel" required className={selectClass} defaultValue="">
          <option value="" disabled>
            Seleccionar…
          </option>
          <option value="sedentario">
            Sedentario (poco o ningún esfuerzo físico)
          </option>
          <option value="principiante">
            Principiante (empezaste a entrenar, sin rutina establecida)
          </option>
          <option value="intermedio">
            Intermedio (entrenas regularmente)
          </option>
          <option value="avanzado">
            Avanzado (rutina de entrenamiento consistente)
          </option>
        </select>
      </Field>
      <Field label="Frecuencia de actividad">
        <select
          name="activityFrequency"
          required
          className={selectClass}
          defaultValue=""
        >
          <option value="" disabled>
            Seleccionar…
          </option>
          <option value="menos_3">Menos de 3 veces a la semana</option>
          <option value="3_a_5">De 3 a 5 veces a la semana</option>
          <option value="mas_5">Más de 5 veces a la semana</option>
        </select>
      </Field>
      <Field label="¿Practicas algún deporte?">
        <input
          name="sportsPracticed"
          required
          minLength={2}
          placeholder="Tu respuesta"
          className={inputClass}
        />
      </Field>
    </>
  );
}

export function AppointmentClosingFields({
  appointmentLabel,
}: {
  appointmentLabel: string;
}) {
  return (
    <>
      <Field label="Turno reservado (fecha/hora)">
        <input
          name="reservedSlotNote"
          required
          defaultValue={appointmentLabel}
          className={inputClass}
        />
      </Field>
      <Field label="¿Cómo te gustaría continuar luego de la primera consulta?">
        <div className="mt-2 space-y-2">
          {[
            {
              value: "turnos_individuales",
              label:
                "Turnos individuales: consultas de seguimiento según necesidad, con ajustes progresivos del plan.",
            },
            {
              value: "packs",
              label:
                "Packs de consultas: acompañamiento más continuo, con beneficios como antropometrías, rutinas y material educativo.",
            },
            {
              value: "conversar_en_consulta",
              label: "Aún no lo sé / prefiero conversarlo en consulta.",
            },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-3 rounded-xl border border-foreground/15 p-3"
            >
              <input
                type="radio"
                name="continuationPreference"
                value={opt.value}
                required
                className="mt-1"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </Field>
    </>
  );
}

export function ConsultationReasonField({
  placeholder,
}: {
  placeholder: string;
}) {
  return (
    <Field label="¿Qué te trae a consulta hoy?">
      <textarea
        name="consultationReason"
        required
        minLength={5}
        placeholder={placeholder}
        className={textareaClass}
      />
    </Field>
  );
}
