import { CalendarWithPanel } from "@/components/calendar/calendar-with-panel";
import { ScheduleBlocksPanel } from "@/components/calendar/schedule-blocks-panel";
import { GoogleCalendarConnect } from "@/components/calendar/google-calendar-connect";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar/config";
import { auth } from "@/lib/auth";
import { getAllAppointments } from "@/server/actions/booking.queries";
import { getBlockedDays, getScheduleBlocks } from "@/server/actions/schedule-block.actions";
import {
  getCalendarAdminStatus,
  getGoogleCalendarConnectionSummary,
} from "@/server/services/google-calendar.service";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await auth();
  const adminUserId = session?.user?.id;

  const [appointments, connection, adminStatus, scheduleBlocks, blockedDays] =
    await Promise.all([
    getAllAppointments(),
    adminUserId
      ? getGoogleCalendarConnectionSummary(adminUserId)
      : Promise.resolve(null),
    adminUserId
      ? getCalendarAdminStatus(adminUserId)
      : Promise.resolve({ isDefaultCalendarAdmin: false }),
    getScheduleBlocks(),
    getBlockedDays(),
  ]);

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">
            anttova · admin
          </p>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Calendario de citas
          </h1>
        </div>
        <p className="max-w-md text-xs text-foreground/55 sm:text-right">
          Mini calendario + agenda sincronizados. Toca una cita para gestionarla.
        </p>
      </div>

      <GoogleCalendarConnect
        configured={isGoogleCalendarConfigured()}
        connection={connection}
        isDefaultCalendarAdmin={adminStatus.isDefaultCalendarAdmin}
      />

      <ScheduleBlocksPanel
        blockedDays={blockedDays}
        blocks={scheduleBlocks}
      />

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <CalendarWithPanel appointments={appointments} />
      </div>
    </div>
  );
}
