// /*--------------------------------------------------------------------------------------
//  *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL2hlbHBlcnMvbGFuZ3VhZ2VIZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJGQUEyRjtBQUMzRiwwREFBMEQ7QUFDMUQsNEZBQTRGO0FBQzVGLDZGQUE2RjtBQUk3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFHakQsK0NBQStDO0FBQy9DLE1BQU0sVUFBVSxjQUFjLENBQUMsZUFBaUMsRUFBRSxJQUEyRDtJQUM1SCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQzlGLE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ2pGLE9BQU8sUUFBUSxDQUFDLFVBQVUsSUFBSSxXQUFXLENBQUE7QUFDMUMsQ0FBQztBQUVELGtCQUFrQjtBQUNsQixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLGVBQWlDLEVBQUUsWUFBb0IsRUFBRSxFQUFFO0lBQzlGLElBQUksWUFBWSxJQUFJLHdCQUF3QjtRQUMzQyxPQUFPLHdCQUF3QixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRTlDLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQy9ELE9BQU8sVUFBVSxDQUFBO0FBQ2xCLENBQUMsQ0FBQTtBQUdELDBCQUEwQjtBQUMxQixNQUFNLHdCQUF3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