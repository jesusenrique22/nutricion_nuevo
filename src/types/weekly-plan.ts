export interface WeeklyMeal {
  time?: string;
  title: string;
  description?: string;
  items?: string;
}

export interface WeeklyDayPlan {
  day: string;
  meals: WeeklyMeal[];
}

export interface WeeklyPlanData {
  id: string;
  title: string;
  weekLabel: string | null;
  imageUrl: string | null;
  notes: string | null;
  days: WeeklyDayPlan[];
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

export const DEFAULT_WEEKLY_DAYS: WeeklyDayPlan[] = [
  {
    day: "Lunes",
    meals: [
      { time: "08:00", title: "Desayuno", description: "Opción 1" },
      { time: "13:00", title: "Almuerzo", description: "Opción 1" },
      { time: "20:00", title: "Cena", description: "Opción 1" },
    ],
  },
  {
    day: "Martes",
    meals: [
      { time: "08:00", title: "Desayuno", description: "Opción 1" },
      { time: "13:00", title: "Almuerzo", description: "Opción 1" },
      { time: "20:00", title: "Cena", description: "Opción 1" },
    ],
  },
  {
    day: "Miércoles",
    meals: [
      { time: "08:00", title: "Desayuno", description: "Opción 1" },
      { time: "13:00", title: "Almuerzo", description: "Opción 1" },
      { time: "20:00", title: "Cena", description: "Opción 1" },
    ],
  },
  {
    day: "Jueves",
    meals: [
      { time: "08:00", title: "Desayuno", description: "Opción 1" },
      { time: "13:00", title: "Almuerzo", description: "Opción 1" },
      { time: "20:00", title: "Cena", description: "Opción 1" },
    ],
  },
  {
    day: "Viernes",
    meals: [
      { time: "08:00", title: "Desayuno", description: "Opción 1" },
      { time: "13:00", title: "Almuerzo", description: "Opción 1" },
      { time: "20:00", title: "Cena", description: "Opción 1" },
    ],
  },
  {
    day: "Sábado",
    meals: [
      { time: "09:00", title: "Desayuno", description: "Opción libre" },
      { time: "14:00", title: "Almuerzo", description: "Opción libre" },
      { time: "21:00", title: "Cena", description: "Opción libre" },
    ],
  },
  {
    day: "Domingo",
    meals: [
      { time: "09:00", title: "Desayuno", description: "Opción libre" },
      { time: "14:00", title: "Almuerzo", description: "Opción libre" },
      { time: "21:00", title: "Cena", description: "Opción libre" },
    ],
  },
];
