"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { registerSchema, RegisterInput } from "@/schemas/auth.schema";
import { useRegister } from "@/hooks/useAuth";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes.constants";
import { Loader2 } from "lucide-react";

export function RegisterForm() {
  const { mutate: registerUser, isPending } = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: RegisterInput) => {
    registerUser(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          type="text"
          placeholder="John Doe"
          autoComplete="name"
          disabled={isPending}
          {...register("name")}
        />
        {errors.name?.message && <FieldError>{errors.name.message}</FieldError>}
      </Field>

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
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          disabled={isPending}
          {...register("password")}
        />
        {errors.password?.message && <FieldError>{errors.password.message}</FieldError>}
      </Field>

      <Button type="submit" className="mt-2 w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create account"
        )}
      </Button>

      <div className="mt-4 text-center">
        <p className="text-muted-foreground text-xs">
          Already have an account?{" "}
          <Link href={ROUTES.LOGIN} className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
