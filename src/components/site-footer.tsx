const sourceUrl = "https://github.com/Farrely-F/resync";
const authorUrl = "https://github.com/farrely-F/";

export function SiteFooter() {
  return (
    <footer className="px-5 pb-28 pt-4 text-xs text-muted-foreground md:px-6 md:pb-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p>No accounts. Resumes and job descriptions stay in this browser.</p>
        <p className="flex items-center gap-3">
          <a
            className="underline decoration-foreground/25 underline-offset-4 transition-colors hover:text-foreground hover:decoration-primary"
            href={sourceUrl}
            rel="noreferrer"
          >
            Source (AGPL-3.0)
          </a>
          <span aria-hidden="true">·</span>
          <a
            className="underline decoration-foreground/25 underline-offset-4 transition-colors hover:text-foreground hover:decoration-primary"
            href={authorUrl}
            target="_blank"
            rel="noreferrer"
          >
            Developed by xfarr.dev
          </a>
        </p>
      </div>
    </footer>
  );
}
