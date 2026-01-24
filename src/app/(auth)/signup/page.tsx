import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h1 className="text-2xl font-bold text-center text-white">
          Create an Account
        </h1>
        <p className="text-gray-400 text-center text-sm mt-1">
          Start sharing your PDFs as interactive flipbooks
        </p>
      </CardHeader>
      <CardContent>
        <SignupForm />
        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="text-white font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
