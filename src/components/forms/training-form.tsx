"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitTrainingForm } from "@/server/actions/training.actions";
import { validateFormStep } from "@/lib/form-step-validation";
import {
  Field,
  FormSection,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/forms/form-primitives";

const TOTAL_STEPS = 5;

const ANALYSIS_OPTIONS = [
  {
    id: "seguimiento_personal",
    label: "Seguimiento personal (comparación con mis propias mediciones)",
  },
  {
    id: "referencia_nacional",
    label:
      "Referencia nacional (comparación con promedios de la población argentina)",
  },
  {
    id: "seguimiento_deporte",
    label:
      "Seguimiento personal + las demandas de mi deporte (índices de rendimiento) — costo extra",
  },
] as const;

export function TrainingFormClient({
  appointmentId,
  patientEmail,
  appointmentLabel,
}: {
  appointmentId: string;
  patientEmail: string;
  appointmentLabel: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [consent, setConsent] = useState(false);
  const [analysisTypes, setAnalysisTypes] = useState<string[]>([
    "seguimiento_personal",
  ]);

  function toggleAnalysis(id: string) {
    setAnalysisTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      consentAccepted: consent,
      fullName: fd.get("fullName"),
      consultationReason: fd.get("consultationReason"),
      phone: fd.get("phone"),
      gender: fd.get("gender"),
      birthDate: fd.get("birthDate"),
      previousAnthropometry: fd.get("previousAnthropometry"),
      dominantHand: fd.get("dominantHand"),
      dominantFoot: fd.get("dominantFoot"),
      activityLevel: fd.get("activityLevel"),
      activityFrequency: fd.get("activityFrequency"),
      sportsPracticed: fd.get("sportsPracticed"),
      reportAnalysisTypes: analysisTypes,
      mainObjective: fd.get("mainObjective"),
      evaluationFrequency: fd.get("evaluationFrequency"),
      reservedSlotNote: fd.get("reservedSlotNote") || appointmentLabel,
      procedureQuestions: fd.get("procedureQuestions"),
    };

    startTransition(async () => {
      const res = await submitTrainingForm(appointmentId, payload);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push("/dashboard/patient/appointments");
      router.refresh();
    });
  }

  function nextStep() {
    if (step === 1 && !consent) {
      setError("Debes aceptar el consentimiento para continuar.");
      return;
    }
    if (step > 1 && !validateFormStep(formRef.current, step)) {
      return;
    }
    if (step === 4 && analysisTypes.length === 0) {
      setError("Selecciona al menos un tipo de análisis.");
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function prevStep() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm font-semibold text-foreground/60">
          <span>
            Página {step} de {TOTAL_STEPS}
          </span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {step === 1 && (
        <div data-step="1">
        <FormSection
          title="Consentimiento informado"
          description="Gracias por elegirme. Para ayudarte a alcanzar tus objetivos de la manera más efectiva, necesito conocerte un poco más."
        >
          <Field label="Correo">
            <input
              type="email"
              value={patientEmail}
              readOnly
              className={`${inputClass} bg-muted`}
            />
          </Field>

          <p className="text-sm text-foreground/70">
            Puedes ver en qué consiste la evaluación dando click al siguiente
            enlace:{" "}
            <span className="font-semibold text-primary">(Puntos anatómicos)</span>
          </p>

          <div className="rounded-xl bg-muted/60 p-4 text-sm text-foreground/80">
            <p className="font-semibold">Comprendiendo los siguientes puntos:</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>
                Conozco y estoy de acuerdo con el propósito de las mediciones
                que se van a realizar.
              </li>
              <li>
                Conozco la naturaleza de lo requerido durante las valoraciones
                antropométricas y sobre los datos registrados. Doy permiso al
                contacto corporal que las mediciones requieren.
              </li>
              <li>
                Si no me sintiera cómodo durante el proceso, soy libre de
                abandonarlo en el momento que desee.
              </li>
              <li>
                He sido informado de que mis datos personales serán protegidos
                conforme a la normativa vigente de protección de datos.
              </li>
            </ol>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-foreground/15 p-4">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm">
              He leído/visto y comprendido la información proporcionada sobre el
              procedimiento de evaluación antropométrica y doy mi consentimiento
              para participar. <span className="text-red-600">*</span>
            </span>
          </label>
        </FormSection>
        </div>
      )}

      {step === 2 && (
        <div data-step="2">
        <FormSection title="Datos personales">
          <Field label="Nombre completo">
            <input name="fullName" required className={inputClass} />
          </Field>
          <Field label="Motivo de consulta">
            <input
              name="consultationReason"
              required
              minLength={5}
              className={inputClass}
            />
          </Field>
          <Field label="Número de teléfono incluyendo código de área">
            <input name="phone" type="tel" required className={inputClass} />
          </Field>
          <Field label="Sexo">
            <select name="gender" required className={selectClass}>
              <option value="">Seleccionar…</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="otro">Otro / Prefiero no decirlo</option>
            </select>
          </Field>
          <Field label="Fecha de nacimiento">
            <input name="birthDate" type="date" required className={inputClass} />
          </Field>
        </FormSection>
        </div>
      )}

      {step === 3 && (
        <div data-step="3">
        <FormSection title="Historial y actividad física">
          <Field label="¿Alguna vez te realizaste una antropometría?">
            <select name="previousAnthropometry" required className={selectClass}>
              <option value="">Seleccionar…</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mano dominante">
              <select name="dominantHand" required className={selectClass}>
                <option value="diestro">Diestro</option>
                <option value="zurdo">Zurdo</option>
                <option value="ambidiestro">Ambidiestro</option>
              </select>
            </Field>
            <Field label="Pie dominante">
              <select name="dominantFoot" required className={selectClass}>
                <option value="diestro">Diestro</option>
                <option value="zurdo">Zurdo</option>
                <option value="ambidiestro">Ambidiestro</option>
              </select>
            </Field>
          </div>
          <Field label="¿Cuál es tu nivel actual de actividad física?">
            <select name="activityLevel" required className={selectClass}>
              <option value="">Seleccionar…</option>
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
            <select name="activityFrequency" required className={selectClass}>
              <option value="">Seleccionar…</option>
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
        </FormSection>
        </div>
      )}

      {step === 4 && (
        <div data-step="4">
        <FormSection title="Objetivos personales">
          <Field label="¿Qué tipo de análisis te gustaría recibir en tu informe? (puedes seleccionar más de una)">
            <div className="mt-2 space-y-2">
              {ANALYSIS_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-start gap-3 rounded-xl border border-foreground/15 p-3"
                >
                  <input
                    type="checkbox"
                    checked={analysisTypes.includes(opt.id)}
                    onChange={() => toggleAnalysis(opt.id)}
                    className="mt-1"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </Field>

          <Field label="¿Cuál es tu objetivo principal en este momento?">
            <select name="mainObjective" required className={selectClass}>
              <option value="">Seleccionar…</option>
              <option value="rendimiento_deportivo">
                Mejorar mi rendimiento deportivo
              </option>
              <option value="composicion_corporal">
                Monitorear mi composición corporal
              </option>
              <option value="salud_general">
                Optimizar mi salud en general
              </option>
              <option value="competencia">
                Prepararme para una competencia
              </option>
              <option value="otro">Otro</option>
            </select>
          </Field>

          <Field label="¿Cada cuánto te gustaría repetir esta evaluación?">
            <select name="evaluationFrequency" required className={selectClass}>
              <option value="">Seleccionar…</option>
              <option value="cada_mes">Cada mes</option>
              <option value="cada_2_3_meses">Cada 2-3 meses</option>
              <option value="cuando_necesite">
                Cuando sienta que lo necesito
              </option>
              <option value="no_se">No lo sé todavía</option>
            </select>
          </Field>

          <Field label="Turno reservado (fecha/hora)">
            <input
              name="reservedSlotNote"
              required
              defaultValue={appointmentLabel}
              className={inputClass}
            />
          </Field>
        </FormSection>
        </div>
      )}

      {step === 5 && (
        <div data-step="5">
        <FormSection title="Recordatorio y preparación">
          <div className="rounded-xl bg-accent/10 p-4 text-sm text-foreground/80">
            <p className="font-semibold">Recomendaciones adicionales (ISAK):</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>
                Evitar la ingesta de alimentos y bebidas (excepto agua) al menos
                2 horas antes de la evaluación.
              </li>
              <li>
                No realizar ejercicio físico intenso 24 horas antes de la
                medición.
              </li>
              <li>
                Usar ropa ligera y ajustada el día de la evaluación (short / top
                deportivo).
              </li>
              <li>
                Informar sobre cualquier cambio reciente en el estado de salud.
              </li>
              <li>
                Informar sobre consumo de creatina, en especial si recién inició
                su suplementación.
              </li>
            </ol>
            <p className="mt-3 text-xs text-foreground/60">
              Si bien los puntos 1 y 2 no son excluyentes para realizar la
              evaluación, estas recomendaciones están alineadas con las
              directrices ISAK para garantizar un resultado más preciso.
            </p>
          </div>

          <Field label="Deja tus dudas o inquietudes respecto al procedimiento">
            <textarea
              name="procedureQuestions"
              required
              minLength={5}
              placeholder="Tu respuesta"
              className={textareaClass}
            />
          </Field>
        </FormSection>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="rounded-full border border-foreground/15 px-6 py-3 font-semibold transition hover:bg-muted"
          >
            Atrás
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={nextStep}
            className="flex-1 rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:scale-[1.01]"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:scale-[1.01] disabled:opacity-50"
          >
            {isPending ? "Enviando…" : "Enviar formulario"}
          </button>
        )}
      </div>
    </form>
  );
}
