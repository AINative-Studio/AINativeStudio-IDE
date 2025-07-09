/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { RipgrepTextSearchEngine } from './ripgrepTextSearchEngine.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { Schemas } from '../../../../base/common/network.js';
export class RipgrepSearchProvider {
    constructor(outputChannel, getNumThreads) {
        this.outputChannel = outputChannel;
        this.getNumThreads = getNumThreads;
        this.inProgress = new Set();
        process.once('exit', () => this.dispose());
    }
    async provideTextSearchResults(query, options, progress, token) {
        const numThreads = await this.getNumThreads();
        const engine = new RipgrepTextSearchEngine(this.outputChannel, numThreads);
        return Promise.all(options.folderOptions.map(folderOption => {
            const extendedOptions = {
                folderOptions: folderOption,
                numThreads,
                maxResults: options.maxResults,
                previewOptions: options.previewOptions,
                maxFileSize: options.maxFileSize,
                surroundingContext: options.surroundingContext
            };
            if (folderOption.folder.scheme === Schemas.vscodeUserData) {
                // Ripgrep search engine can only provide file-scheme results, but we want to use it to search some schemes that are backed by the filesystem, but with some other provider as the frontend,
                // case in point vscode-userdata. In these cases we translate the query to a file, and translate the results back to the frontend scheme.
                const translatedOptions = { ...extendedOptions, folder: folderOption.folder.with({ scheme: Schemas.file }) };
                const progressTranslator = new Progress(data => progress.report({ ...data, uri: data.uri.with({ scheme: folderOption.folder.scheme }) }));
                return this.withToken(token, token => engine.provideTextSearchResultsWithRgOptions(query, translatedOptions, progressTranslator, token));
            }
            else {
                return this.withToken(token, token => engine.provideTextSearchResultsWithRgOptions(query, extendedOptions, progress, token));
            }
        })).then((e => {
            const complete = {
                // todo: get this to actually check
                limitHit: e.some(complete => !!complete && complete.limitHit)
            };
            return complete;
        }));
    }
    async withToken(token, fn) {
        const merged = mergedTokenSource(token);
        this.inProgress.add(merged);
        const result = await fn(merged.token);
        this.inProgress.delete(merged);
        return result;
    }
    dispose() {
        this.inProgress.forEach(engine => engine.cancel());
    }
}
function mergedTokenSource(token) {
    const tokenSource = new CancellationTokenSource();
    token.onCancellationRequested(() => tokenSource.cancel());
    return tokenSource;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcFNlYXJjaFByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvbm9kZS9yaXBncmVwU2VhcmNoUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFxQixNQUFNLHlDQUF5QyxDQUFDO0FBRXJHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHN0QsTUFBTSxPQUFPLHFCQUFxQjtJQUdqQyxZQUFvQixhQUE0QixFQUFVLGFBQWdEO1FBQXRGLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQVUsa0JBQWEsR0FBYixhQUFhLENBQW1DO1FBRmxHLGVBQVUsR0FBaUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUc1RCxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsS0FBSyxDQUFDLHdCQUF3QixDQUFDLEtBQXVCLEVBQUUsT0FBa0MsRUFBRSxRQUFxQyxFQUFFLEtBQXdCO1FBQzFKLE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzlDLE1BQU0sTUFBTSxHQUFHLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUUzRSxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMs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