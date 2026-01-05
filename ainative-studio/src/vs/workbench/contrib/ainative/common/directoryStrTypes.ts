import { URI } from '../../../../base/common/uri.js';

/** @deprecated Legacy alias for backward compatibility. Use AINativeDirectoryItem instead. */
export type VoidDirectoryItem = {
	uri: URI;
	name: string;
	isSymbolicLink: boolean;
	children: VoidDirectoryItem[] | null;
	isDirectory: boolean;
	isGitIgnoredDirectory: false | { numChildren: number }; // if directory is gitignored, we ignore children
}
