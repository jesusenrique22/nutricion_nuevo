export function ContentLobbyShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-foreground/60 sm:text-base">
            {description}
          </p>
        )}
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}
