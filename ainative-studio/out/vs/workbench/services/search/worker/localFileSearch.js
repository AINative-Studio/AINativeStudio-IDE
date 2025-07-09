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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxGaWxlU2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvd29ya2VyL2xvY2FsRmlsZVNlYXJjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBaUIsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFcEUsT0FBTyxFQUEwQix5QkFBeUIsRUFBbUgsTUFBTSx5Q0FBeUMsQ0FBQztBQUU3TixPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVoRSxNQUFNLElBQUksR0FBRyxLQUFLLENBQUM7QUFlbkIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO0FBQ2hDLE1BQU0sUUFBUSxHQUEyQixFQUFFLENBQUM7QUFDNUMsTUFBTSxJQUFJLEdBQUcsS0FBSyxFQUFLLElBQVksRUFBRSxJQUEwQixFQUFFLEVBQUU7SUFDbEUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQUMs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