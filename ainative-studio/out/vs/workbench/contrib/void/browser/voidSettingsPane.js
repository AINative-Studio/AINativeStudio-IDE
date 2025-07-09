/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzUGFuZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvdm9pZFNldHRpbmdzUGFuZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3pFLE9BQU8sRUFBZ0Isb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWpGLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU1RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLEdBQUcsRUFB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