import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { AdminCouponsPanel } from "@/components/admin/admin-coupons-panel";
import { listCouponsAdmin } from "@/server/actions/coupon.actions";

export const dynamic = "force-dynamic";

export default async function AdminCuponesPage() {
  const coupons = await listCouponsAdmin();

  return (
    <ContentLobbyShell
      title="Cupones"
      description="Creá códigos de descuento para tus pacientes y definí su vigencia."
    >
      <AdminCouponsPanel coupons={coupons} />
    </ContentLobbyShell>
  );
}
