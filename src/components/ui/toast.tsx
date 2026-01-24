"use client";

import { X } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/utils";

interface Toast {
	id: string;
	message: string;
	type: "success" | "error" | "info";
}

interface ToastContextType {
	showToast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within ToastProvider");
	}
	return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
		const id = Math.random().toString(36).slice(2);
		setToasts((prev) => [...prev, { id, message, type }]);

		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 4000);
	}, []);

	const removeToast = (id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	};

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
				{toasts.map((toast) => (
					<div
						key={toast.id}
						className={cn(
							"flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white min-w-[300px] animate-in slide-in-from-right",
							{
								"bg-green-600": toast.type === "success",
								"bg-red-600": toast.type === "error",
								"bg-gray-800": toast.type === "info",
							}
						)}
					>
						<span className="flex-1">{toast.message}</span>
						<button
							type="button"
							onClick={() => removeToast(toast.id)}
							className="hover:opacity-75"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
}
