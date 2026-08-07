"use client";

import { useEffect, ReactNode } from "react";
import { usePageHeader } from "./PageHeaderContext";

interface SetPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * Drop this anywhere inside a page (client component) to set the topbar title/subtitle/actions.
 * Renders nothing itself — just syncs state to the Header via context.
 */
export function SetPageHeader({ title, subtitle, actions }: SetPageHeaderProps) {
  const { setHeader } = usePageHeader();

  useEffect(() => {
    setHeader({ title, subtitle, actions });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle, actions]);

  return null;
}
