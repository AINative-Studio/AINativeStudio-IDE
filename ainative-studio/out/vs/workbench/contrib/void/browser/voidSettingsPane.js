/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var VoidSettingsPane_1;
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import * as nls from '../../../../nls.js';
import { EditorExtensions } from '../../../common/editor.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { URI } from '../../../../base/common/uri.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { mountVoidSettings } from './react/out/void-settings-tsx/index.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
// refer to preferences.contribution.ts keybindings editor
class VoidSettingsInput extends EditorInput {
    static { this.ID = 'workbench.input.void.settings'; }
    static { this.RESOURCE = URI.from({
        scheme: 'void', // Custom scheme for our editor (try Schemas.https)
        path: 'settings'
    }); }
    constructor() {
        super();
        this.resource = VoidSettingsInput.RESOURCE;
    }
    get typeId() {
        return VoidSettingsInput.ID;
    }
    getName() {
        return nls.localize('voidSettingsInputsName', 'Void\'s Settings');
    }
    getIcon() {
        return Codicon.checklist; // symbol for the actual editor pane
    }
}
let VoidSettingsPane = class VoidSettingsPane extends EditorPane {
    static { VoidSettingsPane_1 = this; }
    static { this.ID = 'workbench.test.myCustomPane'; }
    // private _scrollbar: DomScrollableElement | undefined;
    constructor(group, telemetryService, themeService, storageService, instantiationService) {
        super(VoidSettingsPane_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
    }
    createEditor(parent) {
        parent.style.height = '100%';
        parent.style.width = '100%';
        const settingsElt = document.createElement('div');
        settingsElt.style.height = '100%';
        settingsElt.style.width = '100%';
        parent.appendChild(settingsElt);
        // this._scrollbar = this._register(new DomScrollableElement(scrollableContent, {}));
        // parent.appendChild(this._scrollbar.getDomNode());
        // this._scrollbar.scanDomNode();
        // Mount React into the scrollable content
        this.instantiationService.invokeFunction(accessor => {
            const disposeFn = mountVoidSettings(settingsElt, accessor)?.dispose;
            this._register(toDisposable(() => disposeFn?.()));
            // setTimeout(() => { // this is a complete hack and I don't really understand how scrollbar works here
            // 	this._scrollbar?.scanDomNode();
            // }, 1000)
        });
    }
    layout(dimension) {
        // if (!settingsElt) return
        // settingsElt.style.height = `${dimension.height}px`;
        // settingsElt.style.width = `${dimension.width}px`;
    }
    get minimumWidth() { return 700; }
};
VoidSettingsPane = VoidSettingsPane_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IInstantiationService)
], VoidSettingsPane);
// register Settings pane
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(VoidSettingsPane, VoidSettingsPane.ID, nls.localize('VoidSettingsPane', "Void\'s Settings Pane")), [new SyncDescriptor(VoidSettingsInput)]);
// register the gear on the top right
export const VOID_TOGGLE_SETTINGS_ACTION_ID = 'workbench.action.toggleVoidSettings';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_TOGGLE_SETTINGS_ACTION_ID,
            title: nls.localize2('voidSettings', "Void: Toggle Settings"),
            icon: Codicon.settingsGear,
            menu: [
                {
                    id: MenuId.LayoutControlMenuSubmenu,
                    group: 'z_end',
                },
                {
                    id: MenuId.LayoutControlMenu,
                    when: ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both'),
                    group: 'z_end'
                }
            ]
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const instantiationService = accessor.get(IInstantiationService);
        // if is open, close it
        const openEditors = editorService.findEditors(VoidSettingsInput.RESOURCE); // should only have 0 or 1 elements...
        if (openEditors.length !== 0) {
            const openEditor = openEditors[0].editor;
            const isCurrentlyOpen = editorService.activeEditor?.resource?.fsPath === openEditor.resource?.fsPath;
            if (isCurrentlyOpen)
                await editorService.closeEditors(openEditors);
            else
                await editorGroupService.activeGroup.openEditor(openEditor);
            return;
        }
        // else open it
        const input = instantiationService.createInstance(VoidSettingsInput);
        await editorGroupService.activeGroup.openEditor(input);
    }
});
export const VOID_OPEN_SETTINGS_ACTION_ID = 'workbench.action.openVoidSettings';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_OPEN_SETTINGS_ACTION_ID,
            title: nls.localize2('voidSettingsAction2', "Void: Open Settings"),
            f1: true,
            icon: Codicon.settingsGear,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        // close all instances if found
        const openEditors = editorService.findEditors(VoidSettingsInput.RESOURCE);
        if (openEditors.length > 0) {
            await editorService.closeEditors(openEditors);
        }
        // then, open one single editor
        const input = instantiationService.createInstance(VoidSettingsInput);
        await editorService.openEditor(input);
    }
});
// add to settings gear on bottom left
MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
    group: '0_command',
    command: {
        id: VOID_TOGGLE_SETTINGS_ACTION_ID,
        title: nls.localize('voidSettingsActionGear', "Void\'s Settings")
    },
    order: 1
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzUGFuZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci92b2lkU2V0dGluZ3NQYW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDcEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekUsT0FBTyxFQUFnQixvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFakYsT0FBTyxFQUFFLG9CQUFvQixFQUF1QixNQUFNLDRCQUE0QixDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsR0FBRyxFQUFF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