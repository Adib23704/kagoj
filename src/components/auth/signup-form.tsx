"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type SignupInput, signupSchema } from "@/lib/validations";

export function SignupForm() {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<SignupInput>({
		resolver: zodResolver(signupSchema),
	});

	const onSubmit = async (data: SignupInput) => {
		setError(null);

		try {
			const res = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			const result = await res.json();

			if (!res.ok) {
				setError(result.error || "Something went wrong");
				return;
			}

			router.push("/signin?registered=true");
		} catch {
			setError("Something went wrong. Please try again.");
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			{error && (
				<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
					{error}
				</div>
			)}

			<Input
				label="Name"
				id="name"
				type="text"
				placeholder="John Doe"
				error={errors.name?.message}
				{...register("name")}
			/>

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
				placeholder="Min. 8 characters"
				error={errors.password?.message}
				{...register("password")}
			/>

			<Input
				label="Confirm Password"
				id="confirmPassword"
				type="password"
				placeholder="Confirm your password"
				error={errors.confirmPassword?.message}
				{...register("confirmPassword")}
			/>

			<Button type="submit" className="w-full" isLoading={isSubmitting}>
				Create Account
			</Button>
		</form>
	);
}
