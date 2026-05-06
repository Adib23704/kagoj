import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ className, label, error, id, ...props }, ref) => {
		return (
			<div className="w-full">
				{label && (
					<label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
						{label}
					</label>
				)}
				<input
					ref={ref}
					id={id}
					className={cn(
						"w-full px-3 py-2 border rounded-lg shadow-sm bg-input text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-colors",
						error ? "border-red-500" : "border-input-border",
						className
					)}
					{...props}
				/>
				{error && <p className="mt-1 text-sm text-red-400">{error}</p>}
			</div>
		);
	}
);

Input.displayName = "Input";
