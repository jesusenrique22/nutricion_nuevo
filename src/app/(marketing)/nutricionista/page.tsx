import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { NutricionistaCvDocument } from "@/components/marketing/nutricionista-cv-document";

export default function NutricionistaPage() {
  return (
    <div className="bg-accent-soft/25 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <ContentLobbyShell
          title="Conoceme más"
          description="Lic. Ma Antonieta Lanza — nutrición, antropometría ISAK y entrenamiento personalizado con enfoque integral."
        >
          <NutricionistaCvDocument />
        </ContentLobbyShell>
      </div>
    </div>
  );
}
