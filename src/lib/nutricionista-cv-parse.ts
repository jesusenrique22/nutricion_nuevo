import { DEFAULT_NUTRICIONISTA_PAGE } from "@/lib/nutricionista-cv-defaults";
import { BRAND_PROFILE } from "@/lib/brand-assets";
import type {
  NutricionistaCvData,
  NutricionistaCvEducation,
  NutricionistaCvExperience,
  NutricionistaPageData,
} from "@/types/nutricionista-cv";

function parseEducation(raw: unknown): NutricionistaCvEducation[] {
  if (!Array.isArray(raw)) return DEFAULT_NUTRICIONISTA_PAGE.cv.education;

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const year = String(o.year ?? "").trim();
      const title = String(o.title ?? "").trim();
      const place = String(o.place ?? "").trim();
      if (!year || !title || !place) return null;
      return { year, title, place };
    })
    .filter((x): x is NutricionistaCvEducation => x !== null);
}

function parseExperience(raw: unknown): NutricionistaCvExperience[] {
  if (!Array.isArray(raw)) return DEFAULT_NUTRICIONISTA_PAGE.cv.experience;

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const year = String(o.year ?? "").trim();
      const role = String(o.role ?? "").trim();
      const company = String(o.company ?? "").trim();
      if (!year || !role || !company) return null;
      const bullets = Array.isArray(o.bullets)
        ? o.bullets.map((b) => String(b).trim()).filter(Boolean)
        : [];
      return { year, role, company, bullets };
    })
    .filter((x): x is NutricionistaCvExperience => x !== null);
}

function parseCv(raw: unknown): NutricionistaCvData {
  const defaults = DEFAULT_NUTRICIONISTA_PAGE.cv;
  if (!raw || typeof raw !== "object") return defaults;

  const o = raw as Record<string, unknown>;
  const contactRaw =
    o.contact && typeof o.contact === "object"
      ? (o.contact as Record<string, unknown>)
      : {};

  const skills = Array.isArray(o.skills)
    ? o.skills.map((s) => String(s).trim()).filter(Boolean)
    : defaults.skills;

  return {
    name: String(o.name ?? defaults.name).trim() || defaults.name,
    title: String(o.title ?? defaults.title).trim() || defaults.title,
    bio: String(o.bio ?? defaults.bio).trim() || defaults.bio,
    photoUrl:
      typeof o.photoUrl === "string" && o.photoUrl.trim()
        ? o.photoUrl.trim()
        : defaults.photoUrl ?? BRAND_PROFILE.professional,
    est: String(o.est ?? defaults.est).trim() || defaults.est,
    city: String(o.city ?? defaults.city).trim() || defaults.city,
    contact: {
      phone:
        String(contactRaw.phone ?? defaults.contact.phone).trim() ||
        defaults.contact.phone,
      email:
        String(contactRaw.email ?? defaults.contact.email).trim() ||
        defaults.contact.email,
      location:
        String(contactRaw.location ?? defaults.contact.location).trim() ||
        defaults.contact.location,
    },
    skills: skills.length > 0 ? skills : defaults.skills,
    education:
      parseEducation(o.education).length > 0
        ? parseEducation(o.education)
        : defaults.education,
    experience:
      parseExperience(o.experience).length > 0
        ? parseExperience(o.experience)
        : defaults.experience,
  };
}

export function parseNutricionistaPage(raw: unknown): NutricionistaPageData {
  const defaults = DEFAULT_NUTRICIONISTA_PAGE;
  if (!raw || typeof raw !== "object") return defaults;

  const o = raw as Record<string, unknown>;
  const cvRaw = o.cv ?? o;

  return {
    pageTitle:
      String(o.pageTitle ?? defaults.pageTitle).trim() || defaults.pageTitle,
    pageDescription:
      String(o.pageDescription ?? defaults.pageDescription).trim() ||
      defaults.pageDescription,
    cv: parseCv(cvRaw),
  };
}

export function nutricionistaPageToRecord(
  data: NutricionistaPageData,
): Record<string, unknown> {
  return {
    pageTitle: data.pageTitle,
    pageDescription: data.pageDescription,
    cv: data.cv,
  };
}
