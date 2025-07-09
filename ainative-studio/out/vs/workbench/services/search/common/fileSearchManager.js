/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from '../../../../base/common/path.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import * as glob from '../../../../base/common/glob.js';
import * as resources from '../../../../base/common/resources.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { QueryGlobTester, resolvePatternsForProvider, hasSiblingFn, excludeToGlobPattern, DEFAULT_MAX_SEARCH_RESULTS } from './search.js';
import { OldFileSearchProviderConverter } from './searchExtConversionTypes.js';
import { FolderQuerySearchTree } from './folderQuerySearchTree.js';
class FileSearchEngine {
    constructor(config, provider, sessionLifecycle) {
        this.config = config;
        this.provider = provider;
        this.sessionLifecycle = sessionLifecycle;
        this.isLimitHit = false;
        this.resultCount = 0;
        this.isCanceled = false;
        this.filePattern = config.filePattern;
        this.includePattern = config.includePattern && glob.parse(config.includePattern);
        this.maxResults = config.maxResults || undefined;
        this.exists = config.exists;
        this.activeCancellationTokens = new Set();
        this.globalExcludePattern = config.excludePattern && glob.parse(config.excludePattern);
    }
    cancel() {
        this.isCanceled = true;
        this.activeCancellationTokens.forEach(t => t.cancel());
        this.activeCancellationTokens = new Set();
    }
    search(_onResult) {
        const folderQueries = this.config.folderQueries || [];
        return new Promise((resolve, reject) => {
            const onResult = (match) => {
                this.resultCount++;
                _onResult(match);
            };
            // Support that the file pattern is a full path to a file that exists
            if (this.isCanceled) {
                return resolve({ limitHit: this.isLimitHit });
            }
            // For each extra file
            if (this.config.extraFileResources) {
                this.config.extraFileResources
                    .forEach(extraFile => {
                    const extraFileStr = extraFile.toString(); // ?
                    const basename = path.basename(extraFileStr);
                    if (this.globalExcludePattern && this.globalExcludePattern(extraFileStr, basename)) {
                        return; // excluded
                    }
                    // File: Check for match on file pattern and include pattern
                    this.matchFile(onResult, { base: extraFile, basename });
                });
            }
            // For each root folder'
            // NEW: can just call with an array of folder info
            this.doSearch(folderQueries, onResult).then(stats => {
                resolve({
                    limitHit: this.isLimitHit,
                    stats: stats || undefined // Only looking at single-folder workspace stats...
                });
            }, (err) => {
                reject(new Error(toErrorMessage(err)));
            });
        });
    }
    async doSearch(fqs, onResult) {
        const cancellation = new CancellationTokenSource();
        const folderOptions = fqs.map(fq => this.getSearchOptionsForFolder(fq));
        const session = this.provider instanceof OldFileSearchProviderConverter ? this.sessionLifecycle?.tokenSource.token : this.sessionLifecycle?.obj;
        const options = {
            folderOptions,
            maxResults: this.config.maxResults ?? DEFAULT_MAX_SEARCH_RESULTS,
            session
        };
        const getFolderQueryInfo = (fq) => {
            const queryTester = new QueryGlobTester(this.config, fq);
            const noSiblingsClauses = !queryTester.hasSiblingExcludeClauses();
            return { queryTester, noSiblingsClauses, folder: fq.folder, tree: this.initDirectoryTree() };
        };
        const folderMappings = new FolderQuerySearchTree(fqs, getFolderQueryInfo);
        let providerSW;
        try {
            this.activeCancellationTokens.add(cancellation);
            providerSW = StopWatch.create();
            const results = await this.provider.provideFileSearchResults(this.config.filePattern || '', options, cancellation.token);
            const providerTime = providerSW.elapsed();
            const postProcessSW = StopWatch.create();
            if (this.isCanceled && !this.isLimitHit) {
                return null;
            }
            if (results) {
                results.forEach(result => {
                    const fqFolderInfo = folderMappings.findQueryFragmentAwareSubstr(result);
                    const relativePath = path.posix.relative(fqFolderInfo.folder.path, result.path);
                    if (fqFolderInfo.noSiblingsClauses) {
                        const basename = path.basename(result.path);
                        this.matchFile(onResult, { base: fqFolderInfo.folder, relativePath, basename });
                        return;
                    }
                    // TODO: Optimize siblings clauses with ripgrep here.
                    this.addDirectoryEntries(fqFolderInfo.tree, fqFolderInfo.folder, relativePath, onResult);
                });
            }
            if (this.isCanceled && !this.isLimitHit) {
                return null;
            }
            folderMappings.forEachFolderQueryInfo(e => {
                this.matchDirectoryTree(e.tree, e.queryTester, onResult);
            });
            return {
                providerTime,
                postProcessTime: postProcessSW.elapsed()
            };
        }
        finally {
            cancellation.dispose();
            this.activeCancellationTokens.delete(cancellation);
        }
    }
    getSearchOptionsForFolder(fq) {
        const includes = resolvePatternsForProvider(this.config.includePattern, fq.includePattern);
        let excludePattern = fq.excludePattern?.map(e => ({
            folder: e.folder,
            patterns: resolvePatternsForProvider(this.config.excludePattern, e.pattern)
        }));
        if (!excludePattern?.length) {
            excludePattern = [{
                    folder: undefined,
                    patterns: resolvePatternsForProvider(this.config.excludePattern, undefined)
                }];
        }
        const excludes = excludeToGlobPattern(excludePattern);
        return {
            folder: fq.folder,
            excludes,
            includes,
            useIgnoreFiles: {
                local: !fq.disregardIgnoreFiles,
                parent: !fq.disregardParentIgnoreFiles,
                global: !fq.disregardGlobalIgnoreFiles
            },
            followSymlinks: !fq.ignoreSymlinks,
        };
    }
    initDirectoryTree() {
        const tree = {
            rootEntries: [],
            pathToEntries: Object.create(null)
        };
        tree.pathToEntries['.'] = tree.rootEntries;
        return tree;
    }
    addDirectoryEntries({ pathToEntries }, base, relativeFile, onResult) {
        // Support relative paths to files from a root resource (ignores excludes)
        if (relativeFile === this.filePattern) {
            const basename = path.basename(this.filePattern);
            this.matchFile(onResult, { base: base, relativePath: this.filePattern, basename });
        }
        function add(relativePath) {
            const basename = path.basename(relativePath);
            const dirname = path.dirname(relativePath);
            let entries = pathToEntries[dirname];
            if (!entries) {
                entries = pathToEntries[dirname] = [];
                add(dirname);
            }
            entries.push({
                base,
                relativePath,
                basename
            });
        }
        add(relativeFile);
    }
    matchDirectoryTree({ rootEntries, pathToEntries }, queryTester, onResult) {
        const self = this;
        const filePattern = this.filePattern;
        function matchDirectory(entries) {
            const hasSibling = hasSiblingFn(() => entries.map(entry => entry.basename));
            for (let i = 0, n = entries.length; i < n; i++) {
                const entry = entries[i];
                const { relativePath, basename } = entry;
                // Check exclude pattern
                // If the user searches for the exact file name, we adjust the glob matching
                // to ignore filtering by siblings because the user seems to know what they
                // are searching for and we want to include the result in that case anyway
                if (queryTester.matchesExcludesSync(relativePath, basename, filePattern !== basename ? hasSibling : undefined)) {
                    continue;
                }
                const sub = pathToEntries[relativePath];
                if (sub) {
                    matchDirectory(sub);
                }
                else {
                    if (relativePath === filePattern) {
                        continue; // ignore file if its path matches with the file pattern because that is already matched above
                    }
                    self.matchFile(onResult, entry);
                }
                if (self.isLimitHit) {
                    break;
                }
            }
        }
        matchDirectory(rootEntries);
    }
    matchFile(onResult, candidate) {
        if (!this.includePattern || (candidate.relativePath && this.includePattern(candidate.relativePath, candidate.basename))) {
            if (this.exists || (this.maxResults && this.resultCount >= this.maxResults)) {
                this.isLimitHit = true;
                this.cancel();
            }
            if (!this.isLimitHit) {
                onResult(candidate);
            }
        }
    }
}
/**
 * For backwards compatibility, store both a cancellation token and a session object. The session object is the new implementation, where
 */
class SessionLifecycle {
    constructor() {
        this._obj = new Object();
        this.tokenSource = new CancellationTokenSource();
    }
    get obj() {
        if (this._obj) {
            return this._obj;
        }
        throw new Error('Session object has been dereferenced.');
    }
    cancel() {
        this.tokenSource.cancel();
        this._obj = undefined; // dereference
    }
}
export class FileSearchManager {
    constructor() {
        this.sessions = new Map();
    }
    static { this.BATCH_SIZE = 512; }
    fileSearch(config, provider, onBatch, token) {
        const sessionTokenSource = this.getSessionTokenSource(config.cacheKey);
        const engine = new FileSearchEngine(config, provider, sessionTokenSource);
        let resultCount = 0;
        const onInternalResult = (batch) => {
            resultCount += batch.length;
            onBatch(batch.map(m => this.rawMatchToSearchItem(m)));
        };
        return this.doSearch(engine, FileSearchManager.BATCH_SIZE, onInternalResult, token).then(result => {
            return {
                limitHit: result.limitHit,
                stats: result.stats ? {
                    fromCache: false,
                    type: 'fileSearchProvider',
                    resultCount,
                    detailStats: result.stats
                } : undefined,
                messages: []
            };
        });
    }
    clearCache(cacheKey) {
        // cancel the token
        this.sessions.get(cacheKey)?.cancel();
        // with no reference to this, it will be removed from WeakMaps
        this.sessions.delete(cacheKey);
    }
    getSessionTokenSource(cacheKey) {
        if (!cacheKey) {
            return undefined;
        }
        if (!this.sessions.has(cacheKey)) {
            this.sessions.set(cacheKey, new SessionLifecycle());
        }
        return this.sessions.get(cacheKey);
    }
    rawMatchToSearchItem(match) {
        if (match.relativePath) {
            return {
                resource: resources.joinPath(match.base, match.relativePath)
            };
        }
        else {
            // extraFileResources
            return {
                resource: match.base
            };
        }
    }
    doSearch(engine, batchSize, onResultBatch, token) {
        const listener = token.onCancellationRequested(() => {
            engine.cancel();
        });
        const _onResult = (match) => {
            if (match) {
                batch.push(match);
                if (batchSize > 0 && batch.length >= batchSize) {
                    onResultBatch(batch);
                    batch = [];
                }
            }
        };
        let batch = [];
        return engine.search(_onResult).then(result => {
            if (batch.length) {
                onResultBatch(batch);
            }
            listener.dispose();
            return result;
        }, error => {
            if (batch.length) {
                onResultBatch(batch);
            }
            listener.dispose();
            return Promise.reject(error);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlYXJjaE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vZmlsZVNlYXJjaE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakUsT0FBTyxFQUF3RixlQUFlLEVBQUUsMEJBQTBCLEVBQUUsWUFBWSxFQUFFLG9CQUFvQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRWhPLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBNEJuRSxNQUFNLGdCQUFnQjtJQWFyQixZQUFvQixNQUFrQixFQUFVLFFBQTZCLEVBQVUsZ0JBQW1DO1FBQXRHLFdBQU0sR0FBTixNQUFNLENBQVk7UUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFxQjtRQUFVLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFSbEgsZUFBVSxHQUFHLEtBQUssQ0FBQztRQUNuQixnQkFBVyxHQUFHLENBQUMsQ0FBQztRQUNoQixlQUFVLEdBQUcsS0FBSyxDQUFDO1FBTzFCLElBQUksQ0FBQyxXQUFXLEdB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