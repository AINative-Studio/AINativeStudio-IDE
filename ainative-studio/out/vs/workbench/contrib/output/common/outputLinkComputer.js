/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import * as extpath from '../../../../base/common/extpath.js';
import * as resources from '../../../../base/common/resources.js';
import * as strings from '../../../../base/common/strings.js';
import { Range } from '../../../../editor/common/core/range.js';
import { isWindows } from '../../../../base/common/platform.js';
import { Schemas } from '../../../../base/common/network.js';
import { WorkerTextModelSyncServer } from '../../../../editor/common/services/textModelSync/textModelSync.impl.js';
export class OutputLinkComputer {
    constructor(workerServer) {
        this.workerTextModelSyncServer = new WorkerTextModelSyncServer();
        this.patterns = new Map();
        this.workerTextModelSyncServer.bindToServer(workerServer);
    }
    $setWorkspaceFolders(workspaceFolders) {
        this.computePatterns(workspaceFolders);
    }
    computePatterns(_workspaceFolders) {
        // Produce patterns for each workspace root we are configured with
        // This means that we will be able to detect links for paths that
        // contain any of the workspace roots as segments.
        const workspaceFolders = _workspaceFolders
            .sort((resourceStrA, resourceStrB) => resourceStrB.length - resourceStrA.length) // longest paths first (for https://github.com/microsoft/vscode/issues/88121)
            .map(resourceStr => URI.parse(resourceStr));
        for (const workspaceFolder of workspaceFolders) {
            const patterns = OutputLinkComputer.createPatterns(workspaceFolder);
            this.patterns.set(workspaceFolder, patterns);
        }
    }
    getModel(uri) {
        return this.workerTextModelSyncServer.getModel(uri);
    }
    $computeLinks(uri) {
        const model = this.getModel(uri);
        if (!model) {
            return [];
        }
        const links = [];
        const lines = strings.splitLines(model.getValue());
        // For each workspace root patterns
        for (const [folderUri, folderPatterns] of this.patterns) {
            const resourceCreator = {
                toResource: (folderRelativePath) => {
                    if (typeof folderRelativePath === 'string') {
                        return resources.joinPath(folderUri, folderRelativePath);
                    }
                    return null;
                }
            };
            for (let i = 0, len = lines.length; i < len; i++) {
                links.push(...OutputLinkComputer.detectLinks(lines[i], i + 1, folderPatterns, resourceCreator));
            }
        }
        return links;
    }
    static createPatterns(workspaceFolder) {
        const patterns = [];
        const workspaceFolderPath = workspaceFolder.scheme === Schemas.file ? workspaceFolder.fsPath : workspaceFolder.path;
        const workspaceFolderVariants = [workspaceFolderPath];
        if (isWindows && workspaceFolder.scheme === Schemas.file) {
            workspaceFolderVariants.push(extpath.toSlashes(workspaceFolderPath));
        }
        for (const workspaceFolderVariant of workspaceFolderVariants) {
            const validPathCharacterPattern = '[^\\s\\(\\):<>\'"]';
            const validPathCharacterOrSpacePattern = `(?:${validPathCharacterPattern}| ${validPathCharacterPattern})`;
            const pathPattern = `${validPathCharacterOrSpacePattern}+\\.${validPathCharacterPattern}+`;
            const strictPathPattern = `${validPathCharacterPattern}+`;
            // Example: /workspaces/express/server.js on line 8, column 13
            patterns.push(new RegExp(strings.escapeRegExpCharacters(workspaceFolderVariant) + `(${pathPattern}) on line ((\\d+)(, column (\\d+))?)`, 'gi'));
            // Example: /workspaces/express/server.js:line 8, column 13
            patterns.push(new RegExp(strings.escapeRegExpCharacters(workspaceFolderVariant) + `(${pathPattern}):line ((\\d+)(, column (\\d+))?)`, 'gi'));
            // Example: /workspaces/mankala/Features.ts(45): error
            // Example: /workspaces/mankala/Features.ts (45): error
            // Example: /workspaces/mankala/Features.ts(45,18): error
            // Example: /workspaces/mankala/Features.ts (45,18): error
            // Example: /workspaces/mankala/Features Special.ts (45,18): error
            patterns.push(new RegExp(strings.escapeRegExpCharacters(workspaceFolderVariant) + `(${pathPattern})(\\s?\\((\\d+)(,(\\d+))?)\\)`, 'gi'));
            // Example: at /workspaces/mankala/Game.ts
            // Example: at /workspaces/mankala/Game.ts:336
            // Example: at /workspaces/mankala/Game.ts:336:9
            patterns.push(new RegExp(strings.escapeRegExpCharacters(workspaceFolderVariant) + `(${strictPathPattern})(:(\\d+))?(:(\\d+))?`, 'gi'));
        }
        return patterns;
    }
    /**
     * Detect links. Made static to allow for tests.
     */
    static detectLinks(line, lineIndex, patterns, resourceCreator) {
        const links = [];
        patterns.forEach(pattern => {
            pattern.lastIndex = 0; // the holy grail of software development
            let match;
            let offset = 0;
            while ((match = pattern.exec(line)) !== null) {
                // Convert the relative path information to a resource that we can use in links
                const folderRelativePath = strings.rtrim(match[1], '.').replace(/\\/g, '/'); // remove trailing "." that likely indicate end of sentence
                let resourceString;
                try {
                    const resource = resourceCreator.toResource(folderRelativePath);
                    if (resource) {
                        resourceString = resource.toString();
                    }
                }
                catch (error) {
                    continue; // we might find an invalid URI and then we dont want to loose all other links
                }
                // Append line/col information to URI if matching
                if (match[3]) {
                    const lineNumber = match[3];
                    if (match[5]) {
                        const columnNumber = match[5];
                        resourceString = strings.format('{0}#{1},{2}', resourceString, lineNumber, columnNumber);
                    }
                    else {
                        resourceString = strings.format('{0}#{1}', resourceString, lineNumber);
                    }
                }
                const fullMatch = strings.rtrim(match[0], '.'); // remove trailing "." that likely indicate end of sentence
                const index = line.indexOf(fullMatch, offset);
                offset = index + fullMatch.length;
                const linkRange = {
                    startColumn: index + 1,
                    startLineNumber: lineIndex,
                    endColumn: index + 1 + fullMatch.length,
                    endLineNumber: lineIndex
                };
                if (links.some(link => Range.areIntersectingOrTouching(link.range, linkRange))) {
                    return; // Do not detect duplicate links
                }
                links.push({
                    range: linkRange,
                    url: resourceString
                });
            }
        });
        return links;
    }
}
export function create(workerServer) {
    return new OutputLinkComputer(workerServer);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0TGlua0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvb3V0cHV0L2NvbW1vbi9vdXRwdXRMaW5rQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdELE9BQU8sRUFBRSx5QkFBeUIsRUFBZ0IsTUFBTSx3RUFBd0UsQ0FBQztBQU1qSSxNQUFNLE9BQU8sa0JBQWtCO0lBTTlCLFlBQVksWUFBOEI7UUFIekIsOEJBQXlCLEdBQUcsSUFBSSx5QkFBeUIsRUFBRSxDQUFDO1FBQ3JFLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQztRQUc1RCxJQUFJLENBQUMseUJBQXlCLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxnQkFBMEI7UUFDOUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFTyxlQUFlLENBQUMsaUJBQTJCO1FBRWxELGtFQUFrRTtRQUNsRSxpRUFBaUU7UUFDakUsa0RBQWtEO1FBQ2xELE1BQU0sZ0JBQWdC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