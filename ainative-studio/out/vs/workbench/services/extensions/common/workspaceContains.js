/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as resources from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import * as errors from '../../../../base/common/errors.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { QueryBuilder } from '../../search/common/queryBuilder.js';
import { ISearchService } from '../../search/common/search.js';
import { toWorkspaceFolder } from '../../../../platform/workspace/common/workspace.js';
import { promiseWithResolvers } from '../../../../base/common/async.js';
const WORKSPACE_CONTAINS_TIMEOUT = 7000;
export function checkActivateWorkspaceContainsExtension(host, desc) {
    const activationEvents = desc.activationEvents;
    if (!activationEvents) {
        return Promise.resolve(undefined);
    }
    const fileNames = [];
    const globPatterns = [];
    for (const activationEvent of activationEvents) {
        if (/^workspaceContains:/.test(activationEvent)) {
            const fileNameOrGlob = activationEvent.substr('workspaceContains:'.length);
            if (fileNameOrGlob.indexOf('*') >= 0 || fileNameOrGlob.indexOf('?') >= 0 || host.forceUsingSearch) {
                globPatterns.push(fileNameOrGlob);
            }
            else {
                fileNames.push(fileNameOrGlob);
            }
        }
    }
    if (fileNames.length === 0 && globPatterns.length === 0) {
        return Promise.resolve(undefined);
    }
    const { promise, resolve } = promiseWithResolvers();
    const activate = (activationEvent) => resolve({ activationEvent });
    const fileNamePromise = Promise.all(fileNames.map((fileName) => _activateIfFileName(host, fileName, activate))).then(() => { });
    const globPatternPromise = _activateIfGlobPatterns(host, desc.identifier, globPatterns, activate);
    Promise.all([fileNamePromise, globPatternPromise]).then(() => {
        // when all are done, resolve with undefined (relevant only if it was not activated so far)
        resolve(undefined);
    });
    return promise;
}
async function _activateIfFileName(host, fileName, activate) {
    // find exact path
    for (const uri of host.folders) {
        if (await host.exists(resources.joinPath(URI.revive(uri), fileName))) {
            // the file was found
            activate(`workspaceContains:${fileName}`);
            return;
        }
    }
}
async function _activateIfGlobPatterns(host, extensionId, globPatterns, activate) {
    if (globPatterns.length === 0) {
        return Promise.resolve(undefined);
    }
    const tokenSource = new CancellationTokenSource();
    const searchP = host.checkExists(host.folders, globPatterns, tokenSource.token);
    const timer = setTimeout(async () => {
        tokenSource.cancel();
        host.logService.info(`Not activating extension '${extensionId.value}': Timed out while searching for 'workspaceContains' pattern ${globPatterns.join(',')}`);
    }, WORKSPACE_CONTAINS_TIMEOUT);
    let exists = false;
    try {
        exists = await searchP;
    }
    catch (err) {
        if (!errors.isCancellationError(err)) {
            errors.onUnexpectedError(err);
        }
    }
    tokenSource.dispose();
    clearTimeout(timer);
    if (exists) {
        // a file was found matching one of the glob patterns
        activate(`workspaceContains:${globPatterns.join(',')}`);
    }
}
export function checkGlobFileExists(accessor, folders, includes, token) {
    const instantiationService = accessor.get(IInstantiationService);
    const searchService = accessor.get(ISearchService);
    const queryBuilder = instantiationService.createInstance(QueryBuilder);
    const query = queryBuilder.file(folders.map(folder => toWorkspaceFolder(URI.revive(folder))), {
        _reason: 'checkExists',
        includePattern: includes,
        exists: true
    });
    return searchService.fileSearch(query, token).then(result => {
        return !!result.limitHit;
    }, err => {
        if (!errors.isCancellationError(err)) {
            return Promise.reject(err);
        }
        return false;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlQ29udGFpbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL3dvcmtzcGFjZUNvbnRhaW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsdUJBQXVCLEVBQXFCLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUU1RCxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUV2RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV4RSxNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQztBQWV4QyxNQUFNLFVBQVUsdUNBQXVDLENBQUMsSUFBOEIsRUFBRSxJQUEyQjtJQUNsSCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztJQUMvQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN2QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELE1BQU0sU0FBUyxHQUFhLEVBQUUsQ0FBQztJQUMvQixNQUFNLFlBQVksR0FBYSxFQUFFLENBQUM7SUFF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