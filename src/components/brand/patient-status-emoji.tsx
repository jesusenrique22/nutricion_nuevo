"use client";

import { BrandCharacter } from "@/components/brand/brand-character";
import type { BrandCharacterId } from "@/lib/brand-characters";

export function PatientStatusEmoji({
  hasCompletedIntake,
}: {
  hasCompletedIntake: boolean;
}) {
  const id: BrandCharacterId = hasCompletedIntake ? "heart-hands" : "motivation1";

  return (
    <span className="inline-flex align-middle">
      <BrandCharacter id={id} size="sm" delay={0.1} subtle />
    </span>
  );
}
