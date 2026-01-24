import Link from "next/link";
import { Suspense } from "react";
import { SigninForm } from "@/components/auth/signin-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SigninFormFallback() {
	return (
		<div className="space-y-4 animate-pulse">
			<div className="h-10 bg-gray-700 rounded" />
			<div className="h-10 bg-gray-700 rounded" />
			<div className="h-10 bg-gray-700 rounded" />
		</div>
	);
}

export default function SigninPage() {
	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<h1 className="text-2xl font-bold text-center text-white">Welcome Back</h1>
				<p className="text-gray-400 text-center text-sm mt-1">Sign in to manage your flipbooks</p>
			</CardHeader>
			<CardContent>
				<Suspense fallback={<SigninFormFallback />}>
					<SigninForm />
				</Suspense>
				<p className="mt-4 text-center text-sm text-gray-400">
					Don&apos;t have an account?{" "}
					<Link href="/signup" className="text-white font-medium hover:underline">
						Sign up
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}
