export interface NutricionistaCvContact {
  phone: string;
  email: string;
  location: string;
}

export interface NutricionistaCvEducation {
  year: string;
  title: string;
  place: string;
}

export interface NutricionistaCvExperience {
  year: string;
  role: string;
  company: string;
  bullets: string[];
}

export interface NutricionistaCvData {
  name: string;
  title: string;
  bio: string;
  /** URL de la foto de perfil en el CV (subida o ruta en /public). */
  photoUrl?: string;
  est: string;
  city: string;
  contact: NutricionistaCvContact;
  skills: string[];
  education: NutricionistaCvEducation[];
  experience: NutricionistaCvExperience[];
}

export interface NutricionistaPageData {
  pageTitle: string;
  pageDescription: string;
  cv: NutricionistaCvData;
}

export const NUTRICIONISTA_PAGE_SLUG = "nutricionista_page";
