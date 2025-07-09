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
import { Separator } from '../../../../base/common/actions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export class GutterActionsRegistryImpl {
    constructor() {
        this._registeredGutterActionsGenerators = new Set();
    }
    /**
     *
     * This exists solely to allow the debug and test contributions to add actions to the gutter context menu
     * which cannot be trivially expressed using when clauses and therefore cannot be statically registered.
     * If you want an action to show up in the gutter context menu, you should generally use MenuId.EditorLineNumberMenu instead.
     */
    registerGutterActionsGenerator(gutterActionsGenerator) {
        this._registeredGutterActionsGenerators.add(gutterActionsGenerator);
        return {
            dispose: () => {
                this._registeredGutterActionsGenerators.delete(gutterActionsGenerator);
            }
        };
    }
    getGutterActionsGenerators() {
        return Array.from(this._registeredGutterActionsGenerators.values());
    }
}
Registry.add('gutterActionsRegistry', new GutterActionsRegistryImpl());
export const GutterActionsRegistry = Registry.as('gutterActionsRegistry');
let EditorLineNumberContextMenu = class EditorLineNumberContextMenu extends Disposable {
    static { this.ID = 'workbench.contrib.editorLineNumberContextMenu'; }
    constructor(editor, contextMenuService, menuService, contextKeyService, instantiationService) {
        super();
        this.editor = editor;
        this.contextMenuService = contextMenuService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this._register(this.editor.onMouseDown((e) => this.doShow(e, false)));
    }
    show(e) {
        this.doShow(e, true);
    }
    doShow(e, force) {
        const model = this.editor.getModel();
        // on macOS ctrl+click is interpreted as right click
        if (!e.event.rightButton && !(isMacintosh && e.event.leftButton && e.event.ctrlKey) && !force
            || e.target.type !== 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */ && e.target.type !== 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */
            || !e.target.position || !model) {
            return;
        }
        const lineNumber = e.target.position.lineNumber;
        const contextKeyService = this.contextKeyService.createOverlay([['editorLineNumber', lineNumber]]);
        const menu = this.menuService.createMenu(MenuId.EditorLineNumberContext, contextKeyService);
        const allActions = [];
        this.instantiationService.invokeFunction(accessor => {
            for (const generator of GutterActionsRegistry.getGutterActionsGenerators()) {
                const collectedActions = new Map();
                generator({ lineNumber, editor: this.editor, accessor }, {
                    push: (action, group = 'navigation') => {
                        const actions = (collectedActions.get(group) ?? []);
                        actions.push(action);
                        collectedActions.set(group, actions);
                    }
                });
                for (const [group, actions] of collectedActions.entries()) {
                    allActions.push([group, actions]);
                }
            }
            allActions.sort((a, b) => a[0].localeCompare(b[0]));
            const menuActions = menu.getActions({ arg: { lineNumber, uri: model.uri }, shouldForwardArgs: true });
            allActions.push(...menuActions);
            // if the current editor selections do not contain the target line number,
            // set the selection to the clicked line number
            if (e.target.type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */) {
                const currentSelections = this.editor.getSelections();
                const lineRange = {
                    startLineNumber: lineNumber,
                    endLineNumber: lineNumber,
                    startColumn: 1,
                    endColumn: model.getLineLength(lineNumber) + 1
                };
                const containsSelection = currentSelections?.some(selection => !selection.isEmpty() && selection.intersectRanges(lineRange) !== null);
                if (!containsSelection) {
                    this.editor.setSelection(lineRange, "api" /* TextEditorSelectionSource.PROGRAMMATIC */);
                }
            }
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.event,
                getActions: () => Separator.join(...allActions.map((a) => a[1])),
                onHide: () => menu.dispose(),
            });
        });
    }
};
EditorLineNumberContextMenu = __decorate([
    __param(1, IContextMenuService),
    __param(2, IMenuService),
    __param(3, IContextKeyService),
    __param(4, IInstantiationService)
], EditorLineNumberContextMenu);
export { EditorLineNumberContextMenu };
registerEditorContribution(EditorLineNumberContextMenu.ID, EditorLineNumberContextMenu, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yTGluZU51bWJlck1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL2VkaXRvckxpbmVOdW1iZXJNZW51LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBVyxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSwwQkFBMEIsRUFBbUMsTUFBTSxnREFBZ0QsQ0FBQztBQUU3SCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBcUMsTUFBTSxnREFBZ0QsQ0FBQztBQUN6SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUU5RixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBTTVFLE1BQU0sT0FBTyx5QkFBeUI7SUFBdEM7UUFDUyx1Q0FBa0MsR0FBaUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQW9CdEYsQ0FBQztJQWxCQTs7Ozs7T0FLRztJQUNJLDhCQUE4QixDQUFDLHNCQUErQztRQUNwRixJQUFJLENBQUMsa0NBQWtDLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDcEUsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLE1BQU0s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