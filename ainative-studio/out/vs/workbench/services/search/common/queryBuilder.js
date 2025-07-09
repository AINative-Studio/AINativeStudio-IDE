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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnlCdWlsZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvY29tbW9uL3F1ZXJ5QnVpbGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sS0FBSyxXQUFXLE1BQU0sd0NBQXdDLENBQUM7QUFDdEUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzVGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdD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