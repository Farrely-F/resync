import type { Metadata } from "next";

import { ResumeEditor } from "@/components/theme/resume-editor";

export const metadata: Metadata = { title: "Edit resume" };

export default async function EditResumePage({ params }: PageProps<"/resumes/[id]/edit">) {
  const { id } = await params;

  return <ResumeEditor resumeId={id} />;
}
