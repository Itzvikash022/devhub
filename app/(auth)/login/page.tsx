import type { Metadata } from "next";
import { Code2 } from "lucide-react";
import { APP_NAME } from "@/constants/app.constants";
import { LoginForm } from "@/components/forms/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your DevHub developer workspace",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      {/* Logo Header */}
      <div className="mb-8 flex flex-col items-center">
        <div className="bg-primary mb-3 flex h-10 w-10 items-center justify-center rounded-lg">
          <Code2 className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading text-foreground text-3xl font-medium italic">{APP_NAME}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Developer workspace</p>
      </div>

      {/* Login Card */}
      <div className="border-border bg-card rounded-xl border p-8 shadow-sm">
        <LoginForm />
      </div>
    </div>
  );
}
