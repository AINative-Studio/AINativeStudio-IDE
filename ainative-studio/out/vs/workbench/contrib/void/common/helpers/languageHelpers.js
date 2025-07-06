// /*--------------------------------------------------------------------------------------
//  *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
//  *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
//  *--------------------------------------------------------------------------------------*/
import { separateOutFirstLine } from './util.js';
// this works better than model.getLanguageId()
export function detectLanguage(languageService, opts) {
    const firstLine = opts.fileContents ? separateOutFirstLine(opts.fileContents)?.[0] : undefined;
    const fullLang = languageService.createByFilepathOrFirstLine(opts.uri, firstLine);
    return fullLang.languageId || 'plaintext';
}
// --- conversions
export const convertToVscodeLang = (languageService, markdownLang) => {
    if (markdownLang in markdownLangToVscodeLang)
        return markdownLangToVscodeLang[markdownLang];
    const { languageId } = languageService.createById(markdownLang);
    return languageId;
};
// // eg "bash" -> "shell"
const markdownLangToVscodeLang = {
    // Web Technologies
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'less': 'less',
    'javascript': 'typescript',
    'js': 'typescript', // use more general renderer
    'jsx': 'typescriptreact',
    'typescript': 'typescript',
    'ts': 'typescript',
    'tsx': 'typescriptreact',
    'json': 'json',
    'jsonc': 'json',
    // Programming Languages
    'python': 'python',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c++': 'cpp',
    'c': 'c',
    'csharp': 'csharp',
    'cs': 'csharp',
    'c#': 'csharp',
    'go': 'go',
    'golang': 'go',
    'rust': 'rust',
    'rs': 'rust',
    'ruby': 'ruby',
    'rb': 'ruby',
    'php': 'php',
    'shell': 'shellscript', // this is important
    'bash': 'shellscript',
    'sh': 'shellscript',
    'zsh': 'shellscript',
    // Markup and Config
    'markdown': 'markdown',
    'md': 'markdown',
    'xml': 'xml',
    'svg': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'ini': 'ini',
    'toml': 'ini',
    // Database and Query Languages
    'sql': 'sql',
    'mysql': 'sql',
    'postgresql': 'sql',
    'graphql': 'graphql',
    'gql': 'graphql',
    // Others
    'dockerfile': 'dockerfile',
    'docker': 'dockerfile',
    'makefile': 'makefile',
    'plaintext': 'plaintext',
    'text': 'plaintext'
};
// // eg ".ts" -> "typescript"
// const fileExtensionToVscodeLanguage: { [key: string]: string } = {
// 	// Web
// 	'html': 'html',
// 	'htm': 'html',
// 	'css': 'css',
// 	'scss': 'scss',
// 	'less': 'less',
// 	'js': 'javascript',
// 	'jsx': 'javascript',
// 	'ts': 'typescript',
// 	'tsx': 'typescript',
// 	'json': 'json',
// 	'jsonc': 'json',
// 	// Programming Languages
// 	'py': 'python',
// 	'java': 'java',
// 	'cpp': 'cpp',
// 	'cc': 'cpp',
// 	'c': 'c',
// 	'h': 'cpp',
// 	'hpp': 'cpp',
// 	'cs': 'csharp',
// 	'go': 'go',
// 	'rs': 'rust',
// 	'rb': 'ruby',
// 	'php': 'php',
// 	'sh': 'shell',
// 	'bash': 'shell',
// 	'zsh': 'shell',
// 	// Markup/Config
// 	'md': 'markdown',
// 	'markdown': 'markdown',
// 	'xml': 'xml',
// 	'svg': 'xml',
// 	'yaml': 'yaml',
// 	'yml': 'yaml',
// 	'ini': 'ini',
// 	'toml': 'ini',
// 	// Other
// 	'sql': 'sql',
// 	'graphql': 'graphql',
// 	'gql': 'graphql',
// 	'dockerfile': 'dockerfile',
// 	'docker': 'dockerfile',
// 	'mk': 'makefile',
// 	// Config Files and Dot Files
// 	'npmrc': 'ini',
// 	'env': 'ini',
// 	'gitignore': 'ignore',
// 	'dockerignore': 'ignore',
// 	'eslintrc': 'json',
// 	'babelrc': 'json',
// 	'prettierrc': 'json',
// 	'stylelintrc': 'json',
// 	'editorconfig': 'ini',
// 	'htaccess': 'apacheconf',
// 	'conf': 'ini',
// 	'config': 'ini',
// 	// Package Files
// 	'package': 'json',
// 	'package-lock': 'json',
// 	'gemfile': 'ruby',
// 	'podfile': 'ruby',
// 	'rakefile': 'ruby',
// 	// Build Systems
// 	'cmake': 'cmake',
// 	'makefile': 'makefile',
// 	'gradle': 'groovy',
// 	// Shell Scripts
// 	'bashrc': 'shell',
// 	'zshrc': 'shell',
// 	'fish': 'shell',
// 	// Version Control
// 	'gitconfig': 'ini',
// 	'hgrc': 'ini',
// 	'svnconfig': 'ini',
// 	// Web Server
// 	'nginx': 'nginx',
// 	// Misc Config
// 	'properties': 'properties',
// 	'cfg': 'ini',
// 	'reg': 'ini'
// };
// export function filenameToVscodeLanguage(filename: string): string | undefined {
// 	const ext = filename.toLowerCase().split('.').pop();
// 	if (!ext) return undefined;
// 	return fileExtensionToVscodeLanguage[ext];
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vaGVscGVycy9sYW5ndWFnZUhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMkZBQTJGO0FBQzNGLCtEQUErRDtBQUMvRCw0RkFBNEY7QUFDNUYsNkZBQTZGO0FBSTdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUdqRCwrQ0FBK0M7QUFDL0MsTUFBTSxVQUFVLGNBQWMsQ0FBQyxlQUFpQyxFQUFFLElBQTJEO0lBQzVILE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDOUYsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDakYsT0FBTyxRQUFRLENBQUMsVUFBVSxJQUFJLFdBQVcsQ0FBQTtBQUMxQyxDQUFDO0FBRUQsa0JBQWtCO0FBQ2xCLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLENBQUMsZUFBaUMsRUFBRSxZQUFvQixFQUFFLEVBQUU7SUFDOUYsSUFBSSxZQUFZLElBQUksd0JBQXdCO1FBQzNDLE9BQU8sd0JBQXdCLENBQUMsWUFBWSxDQUFDLENBQUE7SUFFOUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDL0QsT0FBTyxVQUFVLENBQUE7QUFDbEIsQ0FBQyxDQUFBO0FBR0QsMEJBQTBCO0FBQzFCLE1BQU0sd0JBQXdC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