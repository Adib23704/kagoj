import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
	return (
		<div
			className={cn("bg-card rounded-lg border border-card-border shadow-sm", className)}
			{...props}
		/>
	);
}

export function CardHeader({ className, ...props }: CardProps) {
	return <div className={cn("px-6 py-4 border-b border-card-border", className)} {...props} />;
}

export function CardContent({ className, ...props }: CardProps) {
	return <div className={cn("px-6 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardProps) {
	return <div className={cn("px-6 py-4 border-t border-card-border", className)} {...props} />;
}
