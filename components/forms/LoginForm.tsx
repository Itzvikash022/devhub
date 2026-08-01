"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { loginSchema, LoginInput } from "@/schemas/auth.schema";
import { useLogin } from "@/hooks/useAuth";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes.constants";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const { mutate: login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginInput) => {
    login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          disabled={isPending}
          {...register("email")}
        />
        {errors.email?.message && <FieldError>{errors.email.message}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.password}>
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="password">Password</FieldLabel>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={isPending}
          {...register("password")}
        />
        {errors.password?.message && <FieldError>{errors.password.message}</FieldError>}
      </Field>

      <Button type="submit" className="mt-2 w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <div className="mt-4 text-center">
        <p className="text-muted-foreground text-xs">
          Don't have an account?{" "}
          <Link href={ROUTES.REGISTER} className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </form>
  );
}
