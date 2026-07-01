import type { Metadata } from "next";
import { FunctionalWorkspace } from "@/components/functional-workspace";

export const metadata: Metadata = {
  title: "Studio Penerjemahan",
  description: "Workspace penerjemahan novel China berbantuan AI.",
};

export default function StudioPage() {
  return <FunctionalWorkspace />;
}
