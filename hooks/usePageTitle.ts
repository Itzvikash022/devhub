"use client";

import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    if (!title || !title.trim()) {
      return; // Do not reset title to DevHub while title is loading
    }

    if (title.trim().toLowerCase() === "devhub") {
      document.title = "DevHub";
    } else {
      document.title = `${title} - DevHub`;
    }
  }, [title]);
}
