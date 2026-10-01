import type { Metadata } from "next";

import { ResumeEditor } from "@/components/theme/resume-editor";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Edit resume", "Edit a resume, its LaTeX and its PDF.");

export default async function EditResumePage({ params }: PageProps<"/resumes/[id]/edit">) {
  const { id } = await params;

  return <ResumeEditor resumeId={id} />;
}
