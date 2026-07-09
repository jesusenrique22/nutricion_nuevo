/** Re-export OAuth (liviano) y API Calendar (googleapis) por separado. */
export {
  exchangeCodeForTokens,
  fetchGoogleAccountEmail,
  getCalendarAdminStatus,
  getGoogleCalendarAuthUrl,
  getGoogleCalendarConnectionSummary,
  disconnectGoogleCalendar,
  saveGoogleCalendarConnection,
} from "@/server/services/google-calendar-oauth";

export {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  type CalendarEventInput,
} from "@/server/services/google-calendar-api";
