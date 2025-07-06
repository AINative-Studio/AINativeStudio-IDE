/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as arrays from '../../../../base/common/arrays.js';
import * as collections from '../../../../base/common/collections.js';
import * as glob from '../../../../base/common/glob.js';
import { untildify } from '../../../../base/common/labels.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import * as path from '../../../../base/common/path.js';
import { isEqual, basename, relativePath, isAbsolutePath } from '../../../../base/common/resources.js';
import * as strings from '../../../../base/common/strings.js';
import { assertIsDefined, isDefined } from '../../../../base/common/types.js';
import { URI, URI as uri } from '../../../../base/common/uri.js';
import { isMultilineRegexSource } from '../../../../editor/common/model/textModelSearch.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService, toWorkspaceFolder } from '../../../../platform/workspace/common/workspace.js';
import { IEditorGroupsService } from '../../editor/common/editorGroupsService.js';
import { IPathService } from '../../path/common/pathService.js';
import { getExcludes, pathIncludedInQuery } from './search.js';
export function isISearchPatternBuilder(object) {
    return (typeof object === 'object' && 'uri' in object && 'pattern' in object);
}
export function globPatternToISearchPatternBuilder(globPattern) {
    if (typeof globPattern === 'string') {
        return {
            pattern: globPattern
        };
    }
    return {
        pattern: globPattern.pattern,
        uri: globPattern.baseUri
    };
}
let QueryBuilder = class QueryBuilder {
    constructor(configurationService, workspaceContextService, editorGroupsService, logService, pathService, uriIdentityService) {
        this.configurationService = configurationService;
        this.workspaceContextService = workspaceContextService;
        this.editorGroupsService = editorGroupsService;
        this.logService = logService;
        this.pathService = pathService;
        this.uriIdentityService = uriIdentityService;
    }
    aiText(contentPattern, folderResources, options = {}) {
        const commonQuery = this.commonQuery(folderResources?.map(toWorkspaceFolder), options);
        return {
            ...commonQuery,
            type: 3 /* QueryType.aiText */,
            contentPattern,
        };
    }
    text(contentPattern, folderResources, options = {}) {
        contentPattern = this.getContentPattern(contentPattern, options);
        const searchConfig = this.configurationService.getValue();
        const fallbackToPCRE = folderResources && folderResources.some(folder => {
            const folderConfig = this.configurationService.getValue({ resource: folder });
            return !folderConfig.search.useRipgrep;
        });
        const commonQuery = this.commonQuery(folderResources?.map(toWorkspaceFolder), options);
        return {
            ...commonQuery,
            type: 2 /* QueryType.Text */,
            contentPattern,
            previewOptions: options.previewOptions,
            maxFileSize: options.maxFileSize,
            usePCRE2: searchConfig.search.usePCRE2 || fallbackToPCRE || false,
            surroundingContext: options.surroundingContext,
            userDisabledExcludesAndIgnoreFiles: options.disregardExcludeSettings && options.disregardIgnoreFiles,
        };
    }
    /**
     * Adjusts input pattern for config
     */
    getContentPattern(inputPattern, options) {
        const searchConfig = this.configurationService.getValue();
        if (inputPattern.isRegExp) {
            inputPattern.pattern = inputPattern.pattern.replace(/\r?\n/g, '\\n');
        }
        const newPattern = {
            ...inputPattern,
            wordSeparators: searchConfig.editor.wordSeparators
        };
        if (this.isCaseSensitive(inputPattern, options)) {
            newPattern.isCaseSensitive = true;
        }
        if (this.isMultiline(inputPattern)) {
            newPattern.isMultiline = true;
        }
        if (options.notebookSearchConfig?.includeMarkupInput) {
            if (!newPattern.notebookInfo) {
                newPattern.notebookInfo = {};
            }
            newPattern.notebookInfo.isInNotebookMarkdownInput = options.notebookSearchConfig.includeMarkupInput;
        }
        if (options.notebookSearchConfig?.includeMarkupPreview) {
            if (!newPattern.notebookInfo) {
                newPattern.notebookInfo = {};
            }
            newPattern.notebookInfo.isInNotebookMarkdownPreview = options.notebookSearchConfig.includeMarkupPreview;
        }
        if (options.notebookSearchConfig?.includeCodeInput) {
            if (!newPattern.notebookInfo) {
                newPattern.notebookInfo = {};
            }
            newPattern.notebookInfo.isInNotebookCellInput = options.notebookSearchConfig.includeCodeInput;
        }
        if (options.notebookSearchConfig?.includeOutput) {
            if (!newPattern.notebookInfo) {
                newPattern.notebookInfo = {};
            }
            newPattern.notebookInfo.isInNotebookCellOutput = options.notebookSearchConfig.includeOutput;
        }
        return newPattern;
    }
    file(folders, options = {}) {
        const commonQuery = this.commonQuery(folders, options);
        return {
            ...commonQuery,
            type: 1 /* QueryType.File */,
            filePattern: options.filePattern
                ? options.filePattern.trim()
                : options.filePattern,
            exists: options.exists,
            sortByScore: options.sortByScore,
            cacheKey: options.cacheKey,
            shouldGlobMatchFilePattern: options.shouldGlobSearch
        };
    }
    handleIncludeExclude(pattern, expandPatterns) {
        if (!pattern) {
            return {};
        }
        if (Array.isArray(pattern)) {
            pattern = pattern.filter(p => p.length > 0).map(normalizeSlashes);
            if (!pattern.length) {
                return {};
            }
        }
        else {
            pattern = normalizeSlashes(pattern);
        }
        return expandPatterns
            ? this.parseSearchPaths(pattern)
            : { pattern: patternListToIExpression(...(Array.isArray(pattern) ? pattern : [pattern])) };
    }
    commonQuery(folderResources = [], options = {}) {
        let excludePatterns = Array.isArray(options.excludePattern) ? options.excludePattern.map(p => p.pattern).flat() : options.excludePattern;
        excludePatterns = excludePatterns?.length === 1 ? excludePatterns[0] : excludePatterns;
        const includeSearchPathsInfo = this.handleIncludeExclude(options.includePattern, options.expandPatterns);
        const excludeSearchPathsInfo = this.handleIncludeExclude(excludePatterns, options.expandPatterns);
        // Build folderQueries from searchPaths, if given, otherwise folderResources
        const includeFolderName = folderResources.length > 1;
        const folderQueries = (includeSearchPathsInfo.searchPaths && includeSearchPathsInfo.searchPaths.length ?
            includeSearchPathsInfo.searchPaths.map(searchPath => this.getFolderQueryForSearchPath(searchPath, options, excludeSearchPathsInfo)) :
            folderResources.map(folder => this.getFolderQueryForRoot(folder, options, excludeSearchPathsInfo, includeFolderName)))
            .filter(query => !!query);
        const queryProps = {
            _reason: options._reason,
            folderQueries,
            usingSearchPaths: !!(includeSearchPathsInfo.searchPaths && includeSearchPathsInfo.searchPaths.length),
            extraFileResources: options.extraFileResources,
            excludePattern: excludeSearchPathsInfo.pattern,
            includePattern: includeSearchPathsInfo.pattern,
            onlyOpenEditors: options.onlyOpenEditors,
            maxResults: options.maxResults,
            onlyFileScheme: options.onlyFileScheme
        };
        if (options.onlyOpenEditors) {
            const openEditors = arrays.coalesce(this.editorGroupsService.groups.flatMap(group => group.editors.map(editor => editor.resource)));
            this.logService.trace('QueryBuilder#commonQuery - openEditor URIs', JSON.stringify(openEditors));
            const openEditorsInQuery = openEditors.filter(editor => pathIncludedInQuery(queryProps, editor.fsPath));
            const openEditorsQueryProps = this.commonQueryFromFileList(openEditorsInQuery);
            this.logService.trace('QueryBuilder#commonQuery - openEditor Query', JSON.stringify(openEditorsQueryProps));
            return { ...queryProps, ...openEditorsQueryProps };
        }
        // Filter extraFileResources against global include/exclude patterns - they are already expected to not belong to a workspace
        const extraFileResources = options.extraFileResources && options.extraFileResources.filter(extraFile => pathIncludedInQuery(queryProps, extraFile.fsPath));
        queryProps.extraFileResources = extraFileResources && extraFileResources.length ? extraFileResources : undefined;
        return queryProps;
    }
    commonQueryFromFileList(files) {
        const folderQueries = [];
        const foldersToSearch = new ResourceMap();
        const includePattern = {};
        let hasIncludedFile = false;
        files.forEach(file => {
            if (file.scheme === Schemas.walkThrough) {
                return;
            }
            const providerExists = isAbsolutePath(file);
            // Special case userdata as we don't have a search provider for it, but it can be searched.
            if (providerExists) {
                const searchRoot = this.workspaceContextService.getWorkspaceFolder(file)?.uri ?? this.uriIdentityService.extUri.dirname(file);
                let folderQuery = foldersToSearch.get(searchRoot);
                if (!folderQuery) {
                    hasIncludedFile = true;
                    folderQuery = { folder: searchRoot, includePattern: {} };
                    folderQueries.push(folderQuery);
                    foldersToSearch.set(searchRoot, folderQuery);
                }
                const relPath = path.relative(searchRoot.fsPath, file.fsPath);
                assertIsDefined(folderQuery.includePattern)[relPath.replace(/\\/g, '/')] = true;
            }
            else {
                if (file.fsPath) {
                    hasIncludedFile = true;
                    includePattern[file.fsPath] = true;
                }
            }
        });
        return {
            folderQueries,
            includePattern,
            usingSearchPaths: true,
            excludePattern: hasIncludedFile ? undefined : { '**/*': true }
        };
    }
    /**
     * Resolve isCaseSensitive flag based on the query and the isSmartCase flag, for search providers that don't support smart case natively.
     */
    isCaseSensitive(contentPattern, options) {
        if (options.isSmartCase) {
            if (contentPattern.isRegExp) {
                // Consider it case sensitive if it contains an unescaped capital letter
                if (strings.containsUppercaseCharacter(contentPattern.pattern, true)) {
                    return true;
                }
            }
            else if (strings.containsUppercaseCharacter(contentPattern.pattern)) {
                return true;
            }
        }
        return !!contentPattern.isCaseSensitive;
    }
    isMultiline(contentPattern) {
        if (contentPattern.isMultiline) {
            return true;
        }
        if (contentPattern.isRegExp && isMultilineRegexSource(contentPattern.pattern)) {
            return true;
        }
        if (contentPattern.pattern.indexOf('\n') >= 0) {
            return true;
        }
        return !!contentPattern.isMultiline;
    }
    /**
     * Take the includePattern as seen in the search viewlet, and split into components that look like searchPaths, and
     * glob patterns. Glob patterns are expanded from 'foo/bar' to '{foo/bar/**, **\/foo/bar}.
     *
     * Public for test.
     */
    parseSearchPaths(pattern) {
        const isSearchPath = (segment) => {
            // A segment is a search path if it is an absolute path or starts with ./, ../, .\, or ..\
            return path.isAbsolute(segment) || /^\.\.?([\/\\]|$)/.test(segment);
        };
        const patterns = Array.isArray(pattern) ? pattern : splitGlobPattern(pattern);
        const segments = patterns
            .map(segment => {
            const userHome = this.pathService.resolvedUserHome;
            if (userHome) {
                return untildify(segment, userHome.scheme === Schemas.file ? userHome.fsPath : userHome.path);
            }
            return segment;
        });
        const groups = collections.groupBy(segments, segment => isSearchPath(segment) ? 'searchPaths' : 'exprSegments');
        const expandedExprSegments = (groups.exprSegments || [])
            .map(s => strings.rtrim(s, '/'))
            .map(s => strings.rtrim(s, '\\'))
            .map(p => {
            if (p[0] === '.') {
                p = '*' + p; // convert ".js" to "*.js"
            }
            return expandGlobalGlob(p);
        });
        const result = {};
        const searchPaths = this.expandSearchPathPatterns(groups.searchPaths || []);
        if (searchPaths && searchPaths.length) {
            result.searchPaths = searchPaths;
        }
        const exprSegments = expandedExprSegments.flat();
        const includePattern = patternListToIExpression(...exprSegments);
        if (includePattern) {
            result.pattern = includePattern;
        }
        return result;
    }
    getExcludesForFolder(folderConfig, options) {
        return options.disregardExcludeSettings ?
            undefined :
            getExcludes(folderConfig, !options.disregardSearchExcludeSettings);
    }
    /**
     * Split search paths (./ or ../ or absolute paths in the includePatterns) into absolute paths and globs applied to those paths
     */
    expandSearchPathPatterns(searchPaths) {
        if (!searchPaths || !searchPaths.length) {
            // No workspace => ignore search paths
            return [];
        }
        const expandedSearchPaths = searchPaths.flatMap(searchPath => {
            // 1 open folder => just resolve the search paths to absolute paths
            let { pathPortion, globPortion } = splitGlobFromPath(searchPath);
            if (globPortion) {
                globPortion = normalizeGlobPattern(globPortion);
            }
            // One pathPortion to multiple expanded search paths (e.g. duplicate matching workspace folders)
            const oneExpanded = this.expandOneSearchPath(pathPortion);
            // Expanded search paths to multiple resolved patterns (with ** and without)
            return oneExpanded.flatMap(oneExpandedResult => this.resolveOneSearchPathPattern(oneExpandedResult, globPortion));
        });
        const searchPathPatternMap = new Map();
        expandedSearchPaths.forEach(oneSearchPathPattern => {
            const key = oneSearchPathPattern.searchPath.toString();
            const existing = searchPathPatternMap.get(key);
            if (existing) {
                if (oneSearchPathPattern.pattern) {
                    existing.pattern = existing.pattern || {};
                    existing.pattern[oneSearchPathPattern.pattern] = true;
                }
            }
            else {
                searchPathPatternMap.set(key, {
                    searchPath: oneSearchPathPattern.searchPath,
                    pattern: oneSearchPathPattern.pattern ? patternListToIExpression(oneSearchPathPattern.pattern) : undefined
                });
            }
        });
        return Array.from(searchPathPatternMap.values());
    }
    /**
     * Takes a searchPath like `./a/foo` or `../a/foo` and expands it to absolute paths for all the workspaces it matches.
     */
    expandOneSearchPath(searchPath) {
        if (path.isAbsolute(searchPath)) {
            const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
            if (workspaceFolders[0] && workspaceFolders[0].uri.scheme !== Schemas.file) {
                return [{
                        searchPath: workspaceFolders[0].uri.with({ path: searchPath })
                    }];
            }
            // Currently only local resources can be searched for with absolute search paths.
            // TODO convert this to a workspace folder + pattern, so excludes will be resolved properly for an absolute path inside a workspace folder
            return [{
                    searchPath: uri.file(path.normalize(searchPath))
                }];
        }
        if (this.workspaceContextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            const workspaceUri = this.workspaceContextService.getWorkspace().folders[0].uri;
            searchPath = normalizeSlashes(searchPath);
            if (searchPath.startsWith('../') || searchPath === '..') {
                const resolvedPath = path.posix.resolve(workspaceUri.path, searchPath);
                return [{
                        searchPath: workspaceUri.with({ path: resolvedPath })
                    }];
            }
            const cleanedPattern = normalizeGlobPattern(searchPath);
            return [{
                    searchPath: workspaceUri,
                    pattern: cleanedPattern
                }];
        }
        else if (searchPath === './' || searchPath === '.\\') {
            return []; // ./ or ./**/foo makes sense for single-folder but not multi-folder workspaces
        }
        else {
            const searchPathWithoutDotSlash = searchPath.replace(/^\.[\/\\]/, '');
            const folders = this.workspaceContextService.getWorkspace().folders;
            const folderMatches = folders.map(folder => {
                const match = searchPathWithoutDotSlash.match(new RegExp(`^${strings.escapeRegExpCharacters(folder.name)}(?:/(.*)|$)`));
                return match ? {
                    match,
                    folder
                } : null;
            }).filter(isDefined);
            if (folderMatches.length) {
                return folderMatches.map(match => {
                    const patternMatch = match.match[1];
                    return {
                        searchPath: match.folder.uri,
                        pattern: patternMatch && normalizeGlobPattern(patternMatch)
                    };
                });
            }
            else {
                const probableWorkspaceFolderNameMatch = searchPath.match(/\.[\/\\](.+)[\/\\]?/);
                const probableWorkspaceFolderName = probableWorkspaceFolderNameMatch ? probableWorkspaceFolderNameMatch[1] : searchPath;
                // No root folder with name
                const searchPathNotFoundError = nls.localize('search.noWorkspaceWithName', "Workspace folder does not exist: {0}", probableWorkspaceFolderName);
                throw new Error(searchPathNotFoundError);
            }
        }
    }
    resolveOneSearchPathPattern(oneExpandedResult, globPortion) {
        const pattern = oneExpandedResult.pattern && globPortion ?
            `${oneExpandedResult.pattern}/${globPortion}` :
            oneExpandedResult.pattern || globPortion;
        const results = [
            {
                searchPath: oneExpandedResult.searchPath,
                pattern
            }
        ];
        if (pattern && !pattern.endsWith('**')) {
            results.push({
                searchPath: oneExpandedResult.searchPath,
                pattern: pattern + '/**'
            });
        }
        return results;
    }
    getFolderQueryForSearchPath(searchPath, options, searchPathExcludes) {
        const rootConfig = this.getFolderQueryForRoot(toWorkspaceFolder(searchPath.searchPath), options, searchPathExcludes, false);
        if (!rootConfig) {
            return null;
        }
        return {
            ...rootConfig,
            ...{
                includePattern: searchPath.pattern
            }
        };
    }
    getFolderQueryForRoot(folder, options, searchPathExcludes, includeFolderName) {
        let thisFolderExcludeSearchPathPattern;
        const folderUri = URI.isUri(folder) ? folder : folder.uri;
        // only use exclude root if it is different from the folder root
        let excludeFolderRoots = options.excludePattern?.map(excludePattern => {
            const excludeRoot = options.excludePattern && isISearchPatternBuilder(excludePattern) ? excludePattern.uri : undefined;
            const shouldUseExcludeRoot = (!excludeRoot || !(URI.isUri(folder) && this.uriIdentityService.extUri.isEqual(folder, excludeRoot)));
            return shouldUseExcludeRoot ? excludeRoot : undefined;
        });
        if (!excludeFolderRoots?.length) {
            excludeFolderRoots = [undefined];
        }
        if (searchPathExcludes.searchPaths) {
            const thisFolderExcludeSearchPath = searchPathExcludes.searchPaths.filter(sp => isEqual(sp.searchPath, folderUri))[0];
            if (thisFolderExcludeSearchPath && !thisFolderExcludeSearchPath.pattern) {
                // entire folder is excluded
                return null;
            }
            else if (thisFolderExcludeSearchPath) {
                thisFolderExcludeSearchPathPattern = thisFolderExcludeSearchPath.pattern;
            }
        }
        const folderConfig = this.configurationService.getValue({ resource: folderUri });
        const settingExcludes = this.getExcludesForFolder(folderConfig, options);
        const excludePattern = {
            ...(settingExcludes || {}),
            ...(thisFolderExcludeSearchPathPattern || {})
        };
        const folderName = URI.isUri(folder) ? basename(folder) : folder.name;
        const excludePatternRet = excludeFolderRoots.map(excludeFolderRoot => {
            return Object.keys(excludePattern).length > 0 ? {
                folder: excludeFolderRoot,
                pattern: excludePattern
            } : undefined;
        }).filter((e) => e);
        return {
            folder: folderUri,
            folderName: includeFolderName ? folderName : undefined,
            excludePattern: excludePatternRet,
            fileEncoding: folderConfig.files && folderConfig.files.encoding,
            disregardIgnoreFiles: typeof options.disregardIgnoreFiles === 'boolean' ? options.disregardIgnoreFiles : !folderConfig.search.useIgnoreFiles,
            disregardGlobalIgnoreFiles: typeof options.disregardGlobalIgnoreFiles === 'boolean' ? options.disregardGlobalIgnoreFiles : !folderConfig.search.useGlobalIgnoreFiles,
            disregardParentIgnoreFiles: typeof options.disregardParentIgnoreFiles === 'boolean' ? options.disregardParentIgnoreFiles : !folderConfig.search.useParentIgnoreFiles,
            ignoreSymlinks: typeof options.ignoreSymlinks === 'boolean' ? options.ignoreSymlinks : !folderConfig.search.followSymlinks,
        };
    }
};
QueryBuilder = __decorate([
    __param(0, IConfigurationService),
    __param(1, IWorkspaceContextService),
    __param(2, IEditorGroupsService),
    __param(3, ILogService),
    __param(4, IPathService),
    __param(5, IUriIdentityService)
], QueryBuilder);
export { QueryBuilder };
function splitGlobFromPath(searchPath) {
    const globCharMatch = searchPath.match(/[\*\{\}\(\)\[\]\?]/);
    if (globCharMatch) {
        const globCharIdx = globCharMatch.index;
        const lastSlashMatch = searchPath.substr(0, globCharIdx).match(/[/|\\][^/\\]*$/);
        if (lastSlashMatch) {
            let pathPortion = searchPath.substr(0, lastSlashMatch.index);
            if (!pathPortion.match(/[/\\]/)) {
                // If the last slash was the only slash, then we now have '' or 'C:' or '.'. Append a slash.
                pathPortion += '/';
            }
            return {
                pathPortion,
                globPortion: searchPath.substr((lastSlashMatch.index || 0) + 1)
            };
        }
    }
    // No glob char, or malformed
    return {
        pathPortion: searchPath
    };
}
function patternListToIExpression(...patterns) {
    return patterns.length ?
        patterns.reduce((glob, cur) => { glob[cur] = true; return glob; }, Object.create(null)) :
        undefined;
}
function splitGlobPattern(pattern) {
    return glob.splitGlobAware(pattern, ',')
        .map(s => s.trim())
        .filter(s => !!s.length);
}
/**
 * Note - we used {} here previously but ripgrep can't handle nested {} patterns. See https://github.com/microsoft/vscode/issues/32761
 */
function expandGlobalGlob(pattern) {
    const patterns = [
        `**/${pattern}/**`,
        `**/${pattern}`
    ];
    return patterns.map(p => p.replace(/\*\*\/\*\*/g, '**'));
}
function normalizeSlashes(pattern) {
    return pattern.replace(/\\/g, '/');
}
/**
 * Normalize slashes, remove `./` and trailing slashes
 */
function normalizeGlobPattern(pattern) {
    return normalizeSlashes(pattern)
        .replace(/^\.\//, '')
        .replace(/\/+$/g, '');
}
/**
 * Escapes a path for use as a glob pattern that would match the input precisely.
 * Characters '?', '*', '[', and ']' are escaped into character range glob syntax
 * (for example, '?' becomes '[?]').
 * NOTE: This implementation makes no special cases for UNC paths. For example,
 * given the input "//?/C:/A?.txt", this would produce output '//[?]/C:/A[?].txt',
 * which may not be desirable in some cases. Use with caution if UNC paths could be expected.
 */
function escapeGlobPattern(path) {
    return path.replace(/([?*[\]])/g, '[$1]');
}
/**
 * Construct an include pattern from a list of folders uris to search in.
 */
export function resolveResourcesForSearchIncludes(resources, contextService) {
    resources = arrays.distinct(resources, resource => resource.toString());
    const folderPaths = [];
    const workspace = contextService.getWorkspace();
    if (resources) {
        resources.forEach(resource => {
            let folderPath;
            if (contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                // Show relative path from the root for single-root mode
                folderPath = relativePath(workspace.folders[0].uri, resource); // always uses forward slashes
                if (folderPath && folderPath !== '.') {
                    folderPath = './' + folderPath;
                }
            }
            else {
                const owningFolder = contextService.getWorkspaceFolder(resource);
                if (owningFolder) {
                    const owningRootName = owningFolder.name;
                    // If this root is the only one with its basename, use a relative ./ path. If there is another, use an absolute path
                    const isUniqueFolder = workspace.folders.filter(folder => folder.name === owningRootName).length === 1;
                    if (isUniqueFolder) {
                        const relPath = relativePath(owningFolder.uri, resource); // always uses forward slashes
                        if (relPath === '') {
                            folderPath = `./${owningFolder.name}`;
                        }
                        else {
                            folderPath = `./${owningFolder.name}/${relPath}`;
                        }
                    }
                    else {
                        folderPath = resource.fsPath; // TODO rob: handle non-file URIs
                    }
                }
            }
            if (folderPath) {
                folderPaths.push(escapeGlobPattern(folderPath));
            }
        });
    }
    return folderPaths;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnlCdWlsZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vcXVlcnlCdWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxLQUFLLFdBQVcsTUFBTSx3Q0FBd0MsQ0FBQztBQUN0RSxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDaEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDNUYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NB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