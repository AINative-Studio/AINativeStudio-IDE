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
var ResourceGlobMatcher_1;
import { URI } from '../../base/common/uri.js';
import { equals } from '../../base/common/objects.js';
import { isAbsolute } from '../../base/common/path.js';
import { Emitter } from '../../base/common/event.js';
import { relativePath } from '../../base/common/resources.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { parse } from '../../base/common/glob.js';
import { IWorkspaceContextService } from '../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { Schemas } from '../../base/common/network.js';
import { ResourceSet } from '../../base/common/map.js';
import { getDriveLetter } from '../../base/common/extpath.js';
let ResourceGlobMatcher = class ResourceGlobMatcher extends Disposable {
    static { ResourceGlobMatcher_1 = this; }
    static { this.NO_FOLDER = null; }
    constructor(getExpression, shouldUpdate, contextService, configurationService) {
        super();
        this.getExpression = getExpression;
        this.shouldUpdate = shouldUpdate;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this._onExpressionChange = this._register(new Emitter());
        this.onExpressionChange = this._onExpressionChange.event;
        this.mapFolderToParsedExpression = new Map();
        this.mapFolderToConfiguredExpression = new Map();
        this.updateExpressions(false);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (this.shouldUpdate(e)) {
                this.updateExpressions(true);
            }
        }));
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.updateExpressions(true)));
    }
    updateExpressions(fromEvent) {
        let changed = false;
        // Add expressions per workspaces that got added
        for (const folder of this.contextService.getWorkspace().folders) {
            const folderUriStr = folder.uri.toString();
            const newExpression = this.doGetExpression(folder.uri);
            const currentExpression = this.mapFolderToConfiguredExpression.get(folderUriStr);
            if (newExpression) {
                if (!currentExpression || !equals(currentExpression.expression, newExpression.expression)) {
                    changed = true;
                    this.mapFolderToParsedExpression.set(folderUriStr, parse(newExpression.expression));
                    this.mapFolderToConfiguredExpression.set(folderUriStr, newExpression);
                }
            }
            else {
                if (currentExpression) {
                    changed = true;
                    this.mapFolderToParsedExpression.delete(folderUriStr);
                    this.mapFolderToConfiguredExpression.delete(folderUriStr);
                }
            }
        }
        // Remove expressions per workspace no longer present
        const foldersMap = new ResourceSet(this.contextService.getWorkspace().folders.map(folder => folder.uri));
        for (const [folder] of this.mapFolderToConfiguredExpression) {
            if (folder === ResourceGlobMatcher_1.NO_FOLDER) {
                continue; // always keep this one
            }
            if (!foldersMap.has(URI.parse(folder))) {
                this.mapFolderToParsedExpression.delete(folder);
                this.mapFolderToConfiguredExpression.delete(folder);
                changed = true;
            }
        }
        // Always set for resources outside workspace as well
        const globalNewExpression = this.doGetExpression(undefined);
        const globalCurrentExpression = this.mapFolderToConfiguredExpression.get(ResourceGlobMatcher_1.NO_FOLDER);
        if (globalNewExpression) {
            if (!globalCurrentExpression || !equals(globalCurrentExpression.expression, globalNewExpression.expression)) {
                changed = true;
                this.mapFolderToParsedExpression.set(ResourceGlobMatcher_1.NO_FOLDER, parse(globalNewExpression.expression));
                this.mapFolderToConfiguredExpression.set(ResourceGlobMatcher_1.NO_FOLDER, globalNewExpression);
            }
        }
        else {
            if (globalCurrentExpression) {
                changed = true;
                this.mapFolderToParsedExpression.delete(ResourceGlobMatcher_1.NO_FOLDER);
                this.mapFolderToConfiguredExpression.delete(ResourceGlobMatcher_1.NO_FOLDER);
            }
        }
        if (fromEvent && changed) {
            this._onExpressionChange.fire();
        }
    }
    doGetExpression(resource) {
        const expression = this.getExpression(resource);
        if (!expression) {
            return undefined;
        }
        const keys = Object.keys(expression);
        if (keys.length === 0) {
            return undefined;
        }
        let hasAbsolutePath = false;
        // Check the expression for absolute paths/globs
        // and specifically for Windows, make sure the
        // drive letter is lowercased, because we later
        // check with `URI.fsPath` which is always putting
        // the drive letter lowercased.
        const massagedExpression = Object.create(null);
        for (const key of keys) {
            if (!hasAbsolutePath) {
                hasAbsolutePath = isAbsolute(key);
            }
            let massagedKey = key;
            const driveLetter = getDriveLetter(massagedKey, true /* probe for windows */);
            if (driveLetter) {
                const driveLetterLower = driveLetter.toLowerCase();
                if (driveLetter !== driveLetter.toLowerCase()) {
                    massagedKey = `${driveLetterLower}${massagedKey.substring(1)}`;
                }
            }
            massagedExpression[massagedKey] = expression[key];
        }
        return {
            expression: massagedExpression,
            hasAbsolutePath
        };
    }
    matches(resource, hasSibling) {
        if (this.mapFolderToParsedExpression.size === 0) {
            return false; // return early: no expression for this matcher
        }
        const folder = this.contextService.getWorkspaceFolder(resource);
        let expressionForFolder;
        let expressionConfigForFolder;
        if (folder && this.mapFolderToParsedExpression.has(folder.uri.toString())) {
            expressionForFolder = this.mapFolderToParsedExpression.get(folder.uri.toString());
            expressionConfigForFolder = this.mapFolderToConfiguredExpression.get(folder.uri.toString());
        }
        else {
            expressionForFolder = this.mapFolderToParsedExpression.get(ResourceGlobMatcher_1.NO_FOLDER);
            expressionConfigForFolder = this.mapFolderToConfiguredExpression.get(ResourceGlobMatcher_1.NO_FOLDER);
        }
        if (!expressionForFolder) {
            return false; // return early: no expression for this resource
        }
        // If the resource if from a workspace, convert its absolute path to a relative
        // path so that glob patterns have a higher probability to match. For example
        // a glob pattern of "src/**" will not match on an absolute path "/folder/src/file.txt"
        // but can match on "src/file.txt"
        let resourcePathToMatch;
        if (folder) {
            resourcePathToMatch = relativePath(folder.uri, resource);
        }
        else {
            resourcePathToMatch = this.uriToPath(resource);
        }
        if (typeof resourcePathToMatch === 'string' && !!expressionForFolder(resourcePathToMatch, undefined, hasSibling)) {
            return true;
        }
        // If the configured expression has an absolute path, we also check for absolute paths
        // to match, otherwise we potentially miss out on matches. We only do that if we previously
        // matched on the relative path.
        if (resourcePathToMatch !== this.uriToPath(resource) && expressionConfigForFolder?.hasAbsolutePath) {
            return !!expressionForFolder(this.uriToPath(resource), undefined, hasSibling);
        }
        return false;
    }
    uriToPath(uri) {
        if (uri.scheme === Schemas.file) {
            return uri.fsPath;
        }
        return uri.path;
    }
};
ResourceGlobMatcher = ResourceGlobMatcher_1 = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, IConfigurationService)
], ResourceGlobMatcher);
export { ResourceGlobMatcher };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vcmVzb3VyY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM1RCxPQUFPLEVBQWlDLEtBQUssRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBNkIsTUFBTSxzREFBc0QsQ0FBQztBQUN4SCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQU92RCxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7O2FBRTFCLGNBQVMsR0FBRyxJQUFJLEFBQVAsQ0FBUTtJQVF6QyxZQUNTLGFBQXdELEVBQ3hELFlBQTJELEVBQ3pDLGNBQXlELEVBQzVELG9CQUE0RDtRQUVuRixLQUFLLEVBQUUsQ0FBQztRQUxBLGtCQUFhLEdBQWIs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