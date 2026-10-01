/**
 * The guided tours: what each page says about itself, once.
 *
 * A tour is data, not code: a list of steps that point at elements by a
 * `data-tour` id. That is what makes the copy reviewable on its own, what lets a
 * step whose element is not on screen be dropped rather than pointing at nothing,
 * and what keeps the overlay free of knowledge about any particular page.
 *
 * The copy follows the product's own rule — say what happens, including what it
 * costs. A tour is the first place a new reader learns that nothing is uploaded,
 * that the score is arithmetic rather than a model's opinion, and that the
 * typesetting engine is a 127 MB download they can decline.
 */

export interface TourStep {
  /**
   * The `data-tour` id of the element to point at. `null` centres the step, for
   * something that is true of the whole page.
   */
  target: string | null;
  title: string;
  body: string;
}

export interface Tour {
  /** Stable id: it is what records that this tour has been seen. */
  id: string;
  /** The page it belongs to, for the settings list. */
  page: string;
  title: string;
  steps: readonly TourStep[];
}

const libraryTour: Tour = {
  id: "library",
  page: "/resumes",
  title: "Adding your first resume",
  steps: [
    {
      target: "resume-add",
      title: "Start here",
      body: "A resume arrives as a file or as text. Either way it is read in this browser, and only the extracted text is sent to be turned into structured data.",
    },
    {
      target: "resume-file",
      title: "Choose a file",
      body: "PDF, DOCX, TXT or Markdown. Nothing is uploaded. A scanned PDF with no text layer is reported as such, rather than becoming an empty resume.",
    },
    {
      target: "resume-paste",
      title: "Or paste the text",
      body: "The same path without a file, for a resume that lives in an email or on a page you cannot download.",
    },
    {
      target: "resume-list",
      title: "Your library",
      body: "Every resume you add stays in this browser. Open one to edit it, or delete it from its row — deleting asks first, and says what it takes with it.",
    },
  ],
};

const matchTour: Tour = {
  id: "match",
  page: "/match",
  title: "Matching a resume to a posting",
  steps: [
    {
      target: "match-resume",
      title: "1. Your resume",
      body: "Pick the resume to match. It stays on this device; the analysis sends the structured resume and the posting, and nothing else.",
    },
    {
      target: "match-posting",
      title: "2. The job posting",
      body: "Choose a posting you already saved, or add a new one by pasting its text or giving a link. A posting is stored, so you can match another resume against it without reading it twice.",
    },
    {
      target: "match-run",
      title: "3. Match",
      body: "The model answers one question per requirement — met, partly met, missing — and this app computes the percentage from those answers. No score is asked of the model, so the same evidence always gives the same number.",
    },
    {
      target: "match-ai",
      title: "What it costs",
      body: "The mode and today's model request count are here. In mock mode the answers come from recorded samples and nothing leaves the browser.",
    },
  ],
};

const editorTour: Tour = {
  id: "editor",
  page: "/resumes/[id]/edit",
  title: "Editing a resume",
  steps: [
    {
      target: "editor-fields",
      title: "The fields are the source",
      body: "Edit here and the document follows. Drag a handle to reorder a section, an entry or a line; collapse a section to read past it.",
    },
    {
      target: "editor-theme",
      title: "Theme and page",
      body: "Pick one of ten styles, then set the paper size and margin. The LaTeX and PDF are regenerated from your data with them. The themes are ATS-friendly: one column, real text, no tables.",
    },
    {
      target: "editor-latex",
      title: "The LaTeX is the document",
      body: "Download it, or edit it by hand — hand-editing makes the document yours and stops the fields rewriting it, until you regenerate from your data.",
    },
    {
      target: "editor-preview",
      title: "Live preview",
      body: "Compiled on this device by a real LaTeX engine, after you stop typing. The engine is a 127 MB download the first time, then cached; nothing is uploaded.",
    },
  ],
};

const reportTour: Tour = {
  id: "report",
  page: "/report/[id]",
  title: "Reading a match report",
  steps: [
    {
      target: "report-score",
      title: "The score",
      body: "Computed here, from the verdicts below, by weights that live in this app — so the number can be checked rather than trusted.",
    },
    {
      target: "report-criteria",
      title: "Every verdict, with its evidence",
      body: "Each requirement is met, partly met or missing, and quotes the resume text it rests on. A verdict without evidence is a verdict you can disagree with.",
    },
    {
      target: "report-arithmetic",
      title: "How the score is made",
      body: "The weights, itemised, and the criteria they counted. Nothing on this page is a number the model chose.",
    },
  ],
};

const settingsTour: Tour = {
  id: "settings",
  page: "/settings",
  title: "Your data, and this app's",
  steps: [
    {
      target: "settings-storage",
      title: "What is stored",
      body: "Resumes, postings and reports, with what each one costs on this device. There is no account and no server copy.",
    },
    {
      target: "settings-engine",
      title: "The typesetting engine",
      body: "Cached separately from your data, so PDFs compile offline. Clearing it costs nothing but the next download.",
    },
    {
      target: "settings-danger",
      title: "Removing things",
      body: "Every destructive action asks first, and says what goes with it — deleting a resume takes its reports, and the prompt says so.",
    },
    {
      target: "settings-tours",
      title: "These tours",
      body: "Replay any of them from here, or from the page each one describes. They appear once on their own, and never again unless asked.",
    },
  ],
};

export const tours: readonly Tour[] = [libraryTour, matchTour, editorTour, reportTour, settingsTour];

export function tourById(id: string): Tour | null {
  return tours.find((tour) => tour.id === id) ?? null;
}

/** A trailing slash is the same page; `/` is the landing page and has no tour. */
function normalise(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/**
 * The tour for a page, or `null` where there is none.
 *
 * The editor is matched before the library because `/resumes/<id>/edit` starts
 * with `/resumes`, and the more specific page is the one the reader is on.
 */
export function tourForPath(pathname: string): Tour | null {
  const path = normalise(pathname);

  if (/^\/resumes\/[^/]+\/edit$/.test(path)) {
    return editorTour;
  }
  if (path === "/resumes") {
    return libraryTour;
  }
  if (path === "/match") {
    return matchTour;
  }
  if (/^\/report\/[^/]+$/.test(path)) {
    return reportTour;
  }
  if (path === "/settings") {
    return settingsTour;
  }

  return null;
}

/**
 * The steps whose element is actually on screen.
 *
 * A page can be in a state the tour did not anticipate — no resumes yet, so no
 * picker; a panel that has not rendered. Pointing at nothing would be worse than
 * saying less, so those steps are dropped, and a step with no target is always
 * kept because it is about the page rather than about an element.
 */
export function resolveSteps(
  steps: readonly TourStep[],
  isPresent: (target: string) => boolean,
): TourStep[] {
  return steps.filter((step) => step.target === null || isPresent(step.target));
}
