"use client";

const BASE_PATH = "/dashboard/admin/patients";

export function PatientsListSearch({ initialQuery }: { initialQuery: string }) {
  return (
    <form
      method="get"
      action={BASE_PATH}
      className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <input
        type="search"
        name="q"
        defaultValue={initialQuery}
        placeholder="Buscar por nombre o email..."
        className="min-w-0 flex-1 rounded-full border border-foreground/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold hover:bg-muted/50"
      >
        Buscar
      </button>
    </form>
  );
}
