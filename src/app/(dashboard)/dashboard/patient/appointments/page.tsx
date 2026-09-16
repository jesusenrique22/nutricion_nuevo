import { BrandFlowShell } from "@/components/brand/brand-flow-shell";
import { PatientAppointmentsPayment } from "@/components/appointments/patient-appointments-payment";
import { BookingForm } from "@/components/booking/booking-form";
import { PatientCartPendingBanner } from "@/components/cart/patient-cart-pending-banner";
import { PatientInternalEvents } from "@/components/appointments/patient-internal-events";
import {
  getBookingAvailabilitySnapshot,
  getConsultationTypes,
  getMyAppointments,
} from "@/server/actions/booking.queries";
import { getCartItems } from "@/server/actions/cart.actions";
import { getMyInternalEvents } from "@/server/actions/internal-event.actions";

export const dynamic = "force-dynamic";

export default async function PatientAppointmentsPage() {
  const [types, appointments, cartItems, availability, internalEvents] =
    await Promise.all([
      getConsultationTypes(),
      getMyAppointments(),
      getCartItems(),
      getBookingAvailabilitySnapshot(),
      getMyInternalEvents(),
    ]);

  return (
    <BrandFlowShell
      backHref="/dashboard"
      hub={{
        greeting: "Agenda tu consulta con el mismo flujo Anttova.",
        sectionTitle: "",
        compact: true,
      }}
    >
      <BookingForm types={types} availability={availability} />
      <PatientCartPendingBanner items={cartItems} />
      <PatientInternalEvents events={internalEvents} />
      <PatientAppointmentsPayment appointments={appointments} />
    </BrandFlowShell>
  );
}
