/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as glob from '../../../../base/common/glob.js';
import { URI } from '../../../../base/common/uri.js';
import { LocalFileSearchWorkerHost } from '../common/localFileSearchWorkerTypes.js';
import * as paths from '../../../../base/common/path.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { getFileResults } from '../common/getFileResults.js';
import { IgnoreFile } from '../common/ignoreFile.js';
import { createRegExp } from '../../../../base/common/strings.js';
import { Promises } from '../../../../base/common/async.js';
import { ExtUri } from '../../../../base/common/resources.js';
import { revive } from '../../../../base/common/marshalling.js';
const PERF = false;
const globalStart = +new Date();
const itrcount = {};
const time = async (name, task) => {
    if (!PERF) {
        return task();
    }
    const start = Date.now();
    const itr = (itrcount[name] ?? 0) + 1;
    console.info(name, itr, 'starting', Math.round((start - globalStart) * 10) / 10000);
    itrcount[name] = itr;
    const r = await task();
    const end = Date.now();
    console.info(name, itr, 'took', end - start);
    return r;
};
export function create(workerServer) {
    return new LocalFileSearchWorker(workerServer);
}
export class LocalFileSearchWorker {
    constructor(workerServer) {
        this.cancellationTokens = new Map();
        this.host = LocalFileSearchWorkerHost.getChannel(workerServer);
    }
    $cancelQuery(queryId) {
        this.cancellationTokens.get(queryId)?.cancel();
    }
    registerCancellationToken(queryId) {
        const source = new CancellationTokenSource();
        this.cancellationTokens.set(queryId, source);
        return source;
    }
    async $listDirectory(handle, query, folderQuery, ignorePathCasing, queryId) {
        const revivedFolderQuery = reviveFolderQuery(folderQuery);
        const extUri = new ExtUri(() => ignorePathCasing);
        const token = this.registerCancellationToken(queryId);
        const entries = [];
        let limitHit = false;
        let count = 0;
        const max = query.maxResults || 512;
        const filePatternMatcher = query.filePattern
            ? (name) => query.filePattern.split('').every(c => name.includes(c))
            : (name) => true;
        await time('listDirectory', () => this.walkFolderQuery(handle, reviveQueryProps(query), revivedFolderQuery, extUri, file => {
            if (!filePatternMatcher(file.name)) {
                return;
            }
            count++;
            if (max && count > max) {
                limitHit = true;
                token.cancel();
            }
            return entries.push(file.path);
        }, token.token));
        return {
            results: entries,
            limitHit
        };
    }
    async $searchDirectory(handle, query, folderQuery, ignorePathCasing, queryId) {
        const revivedQuery = reviveFolderQuery(folderQuery);
        const extUri = new ExtUri(() => ignorePathCasing);
        return time('searchInFiles', async () => {
            const token = this.registerCancellationToken(queryId);
            const results = [];
            const pattern = createSearchRegExp(query.contentPattern);
            const onGoingProcesses = [];
            let fileCount = 0;
            let resultCount = 0;
            const limitHit = false;
            const processFile = async (file) => {
                if (token.token.isCancellationRequested) {
                    return;
                }
                fileCount++;
                const contents = await file.resolve();
                if (token.token.isCancellationRequested) {
                    return;
                }
                const bytes = new Uint8Array(contents);
                const fileResults = getFileResults(bytes, pattern, {
                    surroundingContext: query.surroundingContext ?? 0,
                    previewOptions: query.previewOptions,
                    remainingResultQuota: query.maxResults ? (query.maxResults - resultCount) : 10000,
                });
                if (fileResults.length) {
                    resultCount += fileResults.length;
                    if (query.maxResults && resultCount > query.maxResults) {
                        token.cancel();
                    }
                    const match = {
                        resource: URI.joinPath(revivedQuery.folder, file.path),
                        results: fileResults,
                    };
                    this.host.$sendTextSearchMatch(match, queryId);
                    results.push(match);
                }
            };
            await time('walkFolderToResolve', () => this.walkFolderQuery(handle, reviveQueryProps(query), revivedQuery, extUri, async (file) => onGoingProcesses.push(processFile(file)), token.token));
            await time('resolveOngoingProcesses', () => Promise.all(onGoingProcesses));
            if (PERF) {
                console.log('Searched in', fileCount, 'files');
            }
            return {
                results,
                limitHit,
            };
        });
    }
    async walkFolderQuery(handle, queryProps, folderQuery, extUri, onFile, token) {
        const folderExcludes = folderQuery.excludePattern?.map(excludePattern => glob.parse(excludePattern.pattern ?? {}, { trimForExclusions: true }));
        const evalFolderExcludes = (path, basename, hasSibling) => {
            return folderExcludes?.some(folderExclude => {
                return folderExclude(path, basename, hasSibling);
            });
        };
        // For folders, only check if the folder is explicitly excluded so walking continues.
        const isFolderExcluded = (path, basename, hasSibling) => {
            path = path.slice(1);
            if (evalFolderExcludes(path, basename, hasSibling)) {
                return true;
            }
            if (pathExcludedInQuery(queryProps, path)) {
                return true;
            }
            return false;
        };
        // For files ensure the full check takes place.
        const isFileIncluded = (path, basename, hasSibling) => {
            path = path.slice(1);
            if (evalFolderExcludes(path, basename, hasSibling)) {
                return false;
            }
            if (!pathIncludedInQuery(queryProps, path, extUri)) {
                return false;
            }
            return true;
        };
        const processFile = (file, prior) => {
            const resolved = {
                type: 'file',
                name: file.name,
                path: prior,
                resolve: () => file.getFile().then(r => r.arrayBuffer())
            };
            return resolved;
        };
        const isFileSystemDirectoryHandle = (handle) => {
            return handle.kind === 'directory';
        };
        const isFileSystemFileHandle = (handle) => {
            return handle.kind === 'file';
        };
        const processDirectory = async (directory, prior, ignoreFile) => {
            if (!folderQuery.disregardIgnoreFiles) {
                const ignoreFiles = await Promise.all([
                    directory.getFileHandle('.gitignore').catch(e => undefined),
                    directory.getFileHandle('.ignore').catch(e => undefined),
                ]);
                await Promise.all(ignoreFiles.map(async (file) => {
                    if (!file) {
                        return;
                    }
                    const ignoreContents = new TextDecoder('utf8').decode(new Uint8Array(await (await file.getFile()).arrayBuffer()));
                    ignoreFile = new IgnoreFile(ignoreContents, prior, ignoreFile);
                }));
            }
            const entries = Promises.withAsyncBody(async (c) => {
                const files = [];
                const dirs = [];
                const entries = [];
                const sibilings = new Set();
                for await (const entry of directory.entries()) {
                    entries.push(entry);
                    sibilings.add(entry[0]);
                }
                for (const [basename, handle] of entries) {
                    if (token.isCancellationRequested) {
                        break;
                    }
                    const path = prior + basename;
                    if (ignoreFile && !ignoreFile.isPathIncludedInTraversal(path, handle.kind === 'directory')) {
                        continue;
                    }
                    const hasSibling = (query) => sibilings.has(query);
                    if (isFileSystemDirectoryHandle(handle) && !isFolderExcluded(path, basename, hasSibling)) {
                        dirs.push(processDirectory(handle, path + '/', ignoreFile));
                    }
                    else if (isFileSystemFileHandle(handle) && isFileIncluded(path, basename, hasSibling)) {
                        files.push(processFile(handle, path));
                    }
                }
                c([...await Promise.all(dirs), ...files]);
            });
            return {
                type: 'dir',
                name: directory.name,
                entries
            };
        };
        const resolveDirectory = async (directory, onFile) => {
            if (token.isCancellationRequested) {
                return;
            }
            await Promise.all((await directory.entries)
                .sort((a, b) => -(a.type === 'dir' ? 0 : 1) + (b.type === 'dir' ? 0 : 1))
                .map(async (entry) => {
                if (entry.type === 'dir') {
                    return resolveDirectory(entry, onFile);
                }
                else {
                    return onFile(entry);
                }
            }));
        };
        const processed = await time('process', () => processDirectory(handle, '/'));
        await time('resolve', () => resolveDirectory(processed, onFile));
    }
}
function createSearchRegExp(options) {
    return createRegExp(options.pattern, !!options.isRegExp, {
        wholeWord: options.isWordMatch,
        global: true,
        matchCase: options.isCaseSensitive,
        multiline: true,
        unicode: true,
    });
}
function reviveFolderQuery(folderQuery) {
    // @todo: andrea - try to see why we can't just call 'revive' here
    return revive({
        ...revive(folderQuery),
        excludePattern: folderQuery.excludePattern?.map(ep => ({ folder: URI.revive(ep.folder), pattern: ep.pattern })),
        folder: URI.revive(folderQuery.folder),
    });
}
function reviveQueryProps(queryProps) {
    return {
        ...queryProps,
        extraFileResources: queryProps.extraFileResources?.map(r => URI.revive(r)),
        folderQueries: queryProps.folderQueries.map(fq => reviveFolderQuery(fq)),
    };
}
function pathExcludedInQuery(queryProps, fsPath) {
    if (queryProps.excludePattern && glob.match(queryProps.excludePattern, fsPath)) {
        return true;
    }
    return false;
}
function pathIncludedInQuery(queryProps, path, extUri) {
    if (queryProps.excludePattern && glob.match(queryProps.excludePattern, path)) {
        return false;
    }
    if (queryProps.includePattern || queryProps.usingSearchPaths) {
        if (queryProps.includePattern && glob.match(queryProps.includePattern, path)) {
            return true;
        }
        // If searchPaths are being used, the extra file must be in a subfolder and match the pattern, if present
        if (queryProps.usingSearchPaths) {
            return !!queryProps.folderQueries && queryProps.folderQueries.some(fq => {
                const searchPath = fq.folder;
                const uri = URI.file(path);
                if (extUri.isEqualOrParent(uri, searchPath)) {
                    const relPath = paths.relative(searchPath.path, uri.path);
                    return !fq.includePattern || !!glob.match(fq.includePattern, relPath);
                }
                else {
                    return false;
                }
            });
        }
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxGaWxlU2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC93b3JrZXIvbG9jYWxGaWxlU2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFpQixHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVwRSxPQUFPLEVBQTBCLHlCQUF5QixFQUFtSCxNQUFNLHlDQUF5QyxDQUFDO0FBRTdOLE9BQU8sS0FBSyxLQUFLLE1BQU0saUNBQWlDLENBQUM7QUFDekQsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWhFLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQztBQWVuQixNQUFNLFdBQVcsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7QUFDaEMsTUFBTSxRQUFRLEdBQTJCLEVBQUUsQ0FBQztBQUM1QyxNQUFNLElBQUksR0FBRyxLQUFLLEVBQUssSUFBWSxFQUFFLElBQTBCLEVBQUUsRUFBRTtJQUNsRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFBQyxP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