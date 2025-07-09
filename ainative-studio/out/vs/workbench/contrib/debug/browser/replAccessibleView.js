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
import { IAccessibleViewService } from '../../../../platform/accessibility/browser/accessibleView.js';
import { getReplView } from './repl.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Position } from '../../../../editor/common/core/position.js';
export class ReplAccessibleView {
    constructor() {
        this.priority = 70;
        this.name = 'debugConsole';
        this.when = ContextKeyExpr.equals('focusedView', 'workbench.panel.repl.view');
        this.type = "view" /* AccessibleViewType.View */;
    }
    getProvider(accessor) {
        const viewsService = accessor.get(IViewsService);
        const accessibleViewService = accessor.get(IAccessibleViewService);
        const replView = getReplView(viewsService);
        if (!replView) {
            return undefined;
        }
        const focusedElement = replView.getFocusedElement();
        return new ReplOutputAccessibleViewProvider(replView, focusedElement, accessibleViewService);
    }
}
let ReplOutputAccessibleViewProvider = class ReplOutputAccessibleViewProvider extends Disposable {
    constructor(_replView, _focusedElement, _accessibleViewService) {
        super();
        this._replView = _replView;
        this._focusedElement = _focusedElement;
        this._accessibleViewService = _accessibleViewService;
        this.id = "repl" /* AccessibleViewProviderId.Repl */;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidResolveChildren = this._register(new Emitter());
        this.onDidResolveChildren = this._onDidResolveChildren.event;
        this.verbositySettingKey = "accessibility.verbosity.debug" /* AccessibilityVerbositySettingId.Debug */;
        this.options = {
            type: "view" /* AccessibleViewType.View */
        };
        this._elementPositionMap = new Map();
        this._treeHadFocus = false;
        this._treeHadFocus = !!_focusedElement;
    }
    provideContent() {
        const debugSession = this._replView.getDebugSession();
        if (!debugSession) {
            return 'No debug session available.';
        }
        const elements = debugSession.getReplElements();
        if (!elements.length) {
            return 'No output in the debug console.';
        }
        if (!this._content) {
            this._updateContent(elements);
        }
        // Content is loaded asynchronously, so we need to check if it's available or fallback to the elements that are already available.
        return this._content ?? elements.map(e => e.toString(true)).join('\n');
    }
    onClose() {
        this._content = undefined;
        this._elementPositionMap.clear();
        if (this._treeHadFocus) {
            return this._replView.focusTree();
        }
        this._replView.getReplInput().focus();
    }
    onOpen() {
        // Children are resolved async, so we need to update the content when they are resolved.
        this._register(this.onDidResolveChildren(() => {
            this._onDidChangeContent.fire();
            queueMicrotask(() => {
                if (this._focusedElement) {
                    const position = this._elementPositionMap.get(this._focusedElement.getId());
                    if (position) {
                        this._accessibleViewService.setPosition(position, true);
                    }
                }
            });
        }));
    }
    async _updateContent(elements) {
        const dataSource = this._replView.getReplDataSource();
        if (!dataSource) {
            return;
        }
        let line = 1;
        const content = [];
        for (const e of elements) {
            content.push(e.toString().replace(/\n/g, ''));
            this._elementPositionMap.set(e.getId(), new Position(line, 1));
            line++;
            if (dataSource.hasChildren(e)) {
                const childContent = [];
                const children = await dataSource.getChildren(e);
                for (const child of children) {
                    const id = child.getId();
                    if (!this._elementPositionMap.has(id)) {
                        // don't overwrite parent position
                        this._elementPositionMap.set(id, new Position(line, 1));
                    }
                    childContent.push('  ' + child.toString());
                    line++;
                }
                content.push(childContent.join('\n'));
            }
        }
        this._content = content.join('\n');
        this._onDidResolveChildren.fire();
    }
};
ReplOutputAccessibleViewProvider = __decorate([
    __param(2, IAccessibleViewService)
], ReplOutputAccessibleViewProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEFjY2Vzc2libGVWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvcmVwbEFjY2Vzc2libGVWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBZ0Ysc0JBQXNCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUtwTCxPQUFPLEVBQUUsV0FBVyxFQUFRLE1BQU0sV0FBVyxDQUFDO0FBQzlDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFdEUsTUFBTSxPQUFPLGtCQUFrQjtJQUEvQjtRQUNDLGFBQVEsR0FBRyxFQUFFLENBQUM7UUFDZCxTQUFJLEdBQUcsY0FBYyxDQUFDO1FBQ3RCLFNBQUksR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1FBQ3pFLFNBQUksd0NBQStDO0lBWXBELENBQUM7SUFYQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqRCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNuRSxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7UUFD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