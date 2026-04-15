import path from "node:path";

export function mimeSidecarPath(objectPath: string): string {
	return `${objectPath}.mime`;
}

export function joinKey(root: string, key: string): string {
	const resolvedRoot = path.resolve(root);
	const resolved = path.resolve(resolvedRoot, key);
	if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
		throw new Error(`Invalid storage key (path traversal): ${key}`);
	}
	return resolved;
}
