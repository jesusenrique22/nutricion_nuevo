"use client";

import { Suspense } from "react";
import { MessageToast } from "@/components/realtime/message-toast";

/** Wrapper para useSearchParams (requiere Suspense en App Router). */
export function MessageToastHost() {
  return (
    <Suspense fallback={null}>
      <MessageToast />
    </Suspense>
  );
}
