"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("ErrorBoundary caught:", error, info);
	}

	reset = () => this.setState({ error: null });

	render() {
		if (this.state.error) {
			if (this.props.fallback) return this.props.fallback;
			return (
				<div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
					<h2 className="text-xl font-semibold text-text-primary">Something went wrong</h2>
					<p className="text-sm text-text-muted max-w-md">
						An unexpected error occurred. You can try again, or refresh the page.
					</p>
					<button
						type="button"
						onClick={this.reset}
						className="px-4 py-2 rounded-md bg-accent hover:bg-accent-hover text-white text-sm"
					>
						Try again
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}
