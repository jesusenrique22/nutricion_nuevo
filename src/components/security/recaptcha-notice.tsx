import { getPublicRecaptchaSite } from "@/lib/recaptcha-env";

export function RecaptchaNotice({ className = "" }: { className?: string }) {
  if (!getPublicRecaptchaSite()) return null;

  return (
    <p className={`text-[10px] leading-snug text-foreground/45 ${className}`}>
      Protegido por reCAPTCHA ·{" "}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground/60"
      >
        Privacidad
      </a>{" "}
      ·{" "}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground/60"
      >
        Términos
      </a>{" "}
      de Google
    </p>
  );
}
