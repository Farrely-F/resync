import type { Jd } from "@/lib/jd/schema";

/**
 * Recorded `extract-jd` output for AI_MODE=mock.
 *
 * This is the feature's own recording, captured from a real backend job
 * posting. Mock mode replays it verbatim so the app runs offline, and it is
 * schema-validated on read just like live output, so a stale recording fails
 * loudly instead of silently producing a wrong shape.
 */
export const extractJdFixture: Jd = {
  title: "Senior Software Engineer - Go (Golang)",
  company: "General Motors",
  seniority: "Senior",
  location: "Warren, MI",
  requirements: [
    "Strong Go (Golang) experience building backend services and middleware",
    "Experience designing scalable, reliable distributed systems",
    "Familiarity with cloud-connected platforms and vehicle or device integration",
    "Ability to own delivery end to end and collaborate across cross-functional teams",
  ],
  niceToHave: [
    "Experience with in-vehicle infotainment or connected vehicle systems",
    "Exposure to high-performance networking or streaming workloads",
  ],
  skills: ["Go", "backend services", "middleware", "distributed systems", "cloud platforms", "REST APIs"],
  responsibilities: [
    "Design, develop and maintain high-performance backend services and middleware",
    "Deliver platform applications for infotainment and connected vehicle systems",
    "Write clean, maintainable and well-tested code",
    "Collaborate with product, hardware and cloud teams on integration",
  ],
  keywords: ["Golang", "Go", "middleware", "infotainment", "connected vehicle", "scalability", "reliability", "cloud"],
};
