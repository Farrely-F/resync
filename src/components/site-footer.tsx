const sourceUrl = "https://github.com/Farrely-F/resync";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 px-5 py-6 text-xs text-muted-foreground md:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>No accounts. Resumes and job descriptions stay in this browser.</p>
        <p>
          <a className="underline underline-offset-4 hover:text-foreground" href={sourceUrl} rel="noreferrer">
            Source (AGPL-3.0)
          </a>
        </p>
      </div>
    </footer>
  );
}
