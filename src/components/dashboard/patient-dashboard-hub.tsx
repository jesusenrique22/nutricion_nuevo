"use client";

import { BrandLinkHub } from "@/components/brand/brand-link-hub";
import { getPatientAppLinks } from "@/lib/brand-links";

export function PatientDashboardHub({
  userName,
  pendingForms,
  upcomingAppointments,
}: {
  userName: string;
  pendingForms: number;
  upcomingAppointments: number;
}) {
  const firstName = userName.split(" ")[0] ?? userName;
  const links = getPatientAppLinks({ pendingForms, upcomingAppointments });

  return (
    <BrandLinkHub
      greeting={`Hola, ${firstName}. ${pendingForms > 0 ? "Tienes formularios pendientes." : "¿Qué quieres hacer hoy?"}`}
      sectionTitle="Tu panel"
      showSocialIcons={false}
      showSeal={false}
      links={links}
    />
  );
}
