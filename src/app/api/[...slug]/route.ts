import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import * as badgesApi from "@/server/api/dashboard-badges";
import * as cronApi from "@/server/api/cron";
import * as currencyApi from "@/server/api/currency-rates";
import * as googleCalendarApi from "@/server/api/google-calendar";
import * as internalEventIcsApi from "@/server/api/internal-event-ics";
import * as mediaApi from "@/server/api/media";
import * as cvApi from "@/server/api/nutricionista-cv";
import * as proofApi from "@/server/api/payments-upload-proof";
import * as resourcesApi from "@/server/api/resources";
import * as secureFileApi from "@/server/api/secure-file";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string[] }> };

async function slugOf(context: RouteContext) {
  return (await context.params).slug ?? [];
}

function notFound() {
  return NextResponse.json({ error: "No encontrado" }, { status: 404 });
}

export async function GET(req: NextRequest, context: RouteContext) {
  const slug = await slugOf(context);

  if (slug[0] === "auth") {
    return handlers.GET(req);
  }
  if (slug[0] === "resources") {
    return resourcesApi.GET(req, {
      params: Promise.resolve({ path: slug.slice(1) }),
    });
  }
  if (slug[0] === "media") {
    return mediaApi.GET(req, {
      params: Promise.resolve({ path: slug.slice(1) }),
    });
  }
  if (slug[0] === "cron" && slug[1]) {
    return cronApi.GET(req, {
      params: Promise.resolve({ job: slug[1] }),
    });
  }
  if (slug[0] === "google" && slug[1] === "calendar" && slug[2]) {
    return googleCalendarApi.GET(req, {
      params: Promise.resolve({ action: slug[2] }),
    });
  }
  if (slug[0] === "currency" && slug[1] === "rates") {
    return currencyApi.GET();
  }
  if (slug[0] === "dashboard" && slug[1] === "badges") {
    return badgesApi.GET();
  }
  if (slug[0] === "nutricionista" && slug[1] === "cv" && slug[2]) {
    return cvApi.GET(req, {
      params: Promise.resolve({ part: slug[2] }),
    });
  }
  if (slug[0] === "secure-file") {
    return secureFileApi.GET(req);
  }
  if (slug[0] === "events" && slug[1] && slug[2] === "ics") {
    return internalEventIcsApi.GET(req, {
      params: Promise.resolve({ id: slug[1] }),
    });
  }

  return notFound();
}

export async function HEAD(req: NextRequest, context: RouteContext) {
  const slug = await slugOf(context);
  if (slug[0] === "resources") {
    return resourcesApi.HEAD(req, {
      params: Promise.resolve({ path: slug.slice(1) }),
    });
  }
  return GET(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  const slug = await slugOf(context);

  if (slug[0] === "auth") {
    return handlers.POST(req);
  }
  if (slug[0] === "resources") {
    return resourcesApi.POST(req, {
      params: Promise.resolve({ path: slug.slice(1) }),
    });
  }
  if (slug[0] === "payments" && slug[1] === "upload-proof") {
    return proofApi.POST(req);
  }
  if (slug[0] === "google" && slug[1] === "calendar" && slug[2]) {
    return googleCalendarApi.POST(req, {
      params: Promise.resolve({ action: slug[2] }),
    });
  }

  return notFound();
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const slug = await slugOf(context);
  if (slug[0] === "media") {
    return mediaApi.DELETE(req, {
      params: Promise.resolve({ path: slug.slice(1) }),
    });
  }
  return notFound();
}
