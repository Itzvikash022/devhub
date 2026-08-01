import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes.constants";

interface ProjectWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectWorkspacePage({ params }: ProjectWorkspacePageProps) {
  const { id } = await params;

  // Default project landing page is set to details tab
  redirect(ROUTES.PROJECT_DETAILS(id));
}
