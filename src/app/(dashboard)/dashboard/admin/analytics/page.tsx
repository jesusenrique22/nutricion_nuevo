import { AdminAnalyticsDashboard } from "@/components/dashboard/admin-analytics-dashboard";
import { getAnalyticsSummary } from "@/server/actions/analytics.queries";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getAnalyticsSummary();

  if (!data) {
    return <p>No autorizado.</p>;
  }

  return <AdminAnalyticsDashboard data={data} />;
}
