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
import { Emitter } from '../../../../../base/common/event.js';
import { localize } from '../../../../../nls.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { listInvalidItemForeground, listDeemphasizedForeground } from '../../../../../platform/theme/common/colorRegistry.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { explorerRootErrorEmitter } from './explorerViewer.js';
import { IExplorerService } from '../files.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
export function provideDecorations(fileStat) {
    if (fileStat.isRoot && fileStat.error) {
        return {
            tooltip: localize('canNotResolve', "Unable to resolve workspace folder ({0})", toErrorMessage(fileStat.error)),
            letter: '!',
            color: listInvalidItemForeground,
        };
    }
    if (fileStat.isSymbolicLink) {
        return {
            tooltip: localize('symbolicLlink', "Symbolic Link"),
            letter: '\u2937'
        };
    }
    if (fileStat.isUnknown) {
        return {
            tooltip: localize('unknown', "Unknown File Type"),
            letter: '?'
        };
    }
    if (fileStat.isExcluded) {
        return {
            color: listDeemphasizedForeground,
        };
    }
    return undefined;
}
let ExplorerDecorationsProvider = class ExplorerDecorationsProvider {
    constructor(explorerService, contextService) {
        this.explorerService = explorerService;
        this.label = localize('label', "Explorer");
        this._onDidChange = new Emitter();
        this.toDispose = new DisposableStore();
        this.toDispose.add(this._onDidChange);
        this.toDispose.add(contextService.onDidChangeWorkspaceFolders(e => {
            this._onDidChange.fire(e.changed.concat(e.added).map(wf => wf.uri));
        }));
        this.toDispose.add(explorerRootErrorEmitter.event((resource => {
            this._onDidChange.fire([resource]);
        })));
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    async provideDecorations(resource) {
        const fileStat = this.explorerService.findClosest(resource);
        if (!fileStat) {
            throw new Error('ExplorerItem not found');
        }
        return provideDecorations(fileStat);
    }
    dispose() {
        this.toDispose.dispose();
    }
};
ExplorerDecorationsProvider = __decorate([
    __param(0, IExplorerService),
    __param(1, IWorkspaceContextService)
], ExplorerDecorationsProvider);
export { ExplorerDecorationsProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJEZWNvcmF0aW9uc1Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvdmlld3MvZXhwbG9yZXJEZWNvcmF0aW9uc1Byb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFakcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLDBCQUEwQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDOUgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRS9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUMvQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFNUUsTUFBTSxVQUFVLGtCQUFrQixDQUFDLFFBQXNCO0lBQ3hELElBQUksUUFBUSxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdkMsT0FBTztZQUNOLE9BQU8sRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLDBDQUEwQyxFQUFFLGNBQWMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDOUcsTUFBTSxFQUFFLEdBQUc7WUFDWCxLQUFLLEVBQUUseUJBQXlCO1NBQ2hDLENBQUM7SUFDSCxDQUFDO0lBQ0QsSUFBSSxRQUFRLENBQUMsY0FBYyxF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