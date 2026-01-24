"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type SigninInput, signinSchema } from "@/lib/validations";

export function SigninForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const registered = searchParams.get("registered");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninInput>({
    resolver: zodResolver(signinSchema),
  });

  const onSubmit = async (data: SigninInput) => {
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {registered && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
          Account created! Please sign in.
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <Input
        label="Email"
        id="email"
        type="email"
        placeholder="john@example.com"
        error={errors.email?.message}
        {...register("email")}
      />

      <Input
        label="Password"
        id="password"
        type="password"
        placeholder="Enter your password"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        Sign In
      </Button>
    </form>
  );
}
