import { BrandFlowShell } from "@/components/brand/brand-flow-shell";
import { PatientAppointmentHistory } from "@/components/appointments/patient-appointment-history";
import { BookingForm } from "@/components/booking/booking-form";
import { PatientCartPendingBanner } from "@/components/cart/patient-cart-pending-banner";
import {
  getBookingAvailabilitySnapshot,
  getConsultationTypes,
  getMyAppointments,
} from "@/server/actions/booking.queries";
import { getCartItems } from "@/server/actions/cart.actions";

export default async function PatientAppointmentsPage() {
  const [types, appointments, cartItems, availability] = await Promise.all([
    getConsultationTypes(),
    getMyAppointments(),
    getCartItems(),
    getBookingAvailabilitySnapshot(),
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
      <PatientAppointmentHistory appointments={appointments} />
    </BrandFlowShell>
  );
}
