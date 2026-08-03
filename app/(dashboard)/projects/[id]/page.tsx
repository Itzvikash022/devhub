"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProjectWorkspacePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  useEffect(() => {
    // Read the last visited tab for this project from localStorage
    const lastTab = localStorage.getItem(`project-tab-${id}`) || "details";
    router.replace(`/projects/${id}/${lastTab}`);
  }, [id, router]);

  return null;
}
