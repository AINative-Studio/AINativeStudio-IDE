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
var AINativeSettingsPane_1;
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
import { mountAINativeSettings } from './react/out/ainative-settings-tsx/index.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
// refer to preferences.contribution.ts keybindings editor
class AINativeSettingsInput extends EditorInput {
    static { this.ID = 'workbench.input.ainative.settings'; }
    static { this.RESOURCE = URI.from({
        scheme: 'ainative', // Custom scheme for our editor (try Schemas.https)
        path: 'settings'
    }); }
    constructor() {
        super();
        this.resource = AINativeSettingsInput.RESOURCE;
    }
    get typeId() {
        return AINativeSettingsInput.ID;
    }
    getName() {
        return nls.localize('ainativeSettingsInputsName', 'AINative Studio Settings');
    }
    getIcon() {
        return Codicon.checklist; // symbol for the actual editor pane
    }
}
let AINativeSettingsPane = class AINativeSettingsPane extends EditorPane {
    static { AINativeSettingsPane_1 = this; }
    static { this.ID = 'workbench.test.myCustomPane'; }
    // private _scrollbar: DomScrollableElement | undefined;
    constructor(group, telemetryService, themeService, storageService, instantiationService) {
        super(AINativeSettingsPane_1.ID, group, telemetryService, themeService, storageService);
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
            const disposeFn = mountAINativeSettings(settingsElt, accessor)?.dispose;
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
AINativeSettingsPane = AINativeSettingsPane_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IInstantiationService)
], AINativeSettingsPane);
// register Settings pane
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(AINativeSettingsPane, AINativeSettingsPane.ID, nls.localize('AINativeSettingsPane', "AINative Studio Settings Pane")), [new SyncDescriptor(AINativeSettingsInput)]);
// register the gear on the top right
export const AINATIVE_TOGGLE_SETTINGS_ACTION_ID = 'workbench.action.toggleAINativeSettings';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: AINATIVE_TOGGLE_SETTINGS_ACTION_ID,
            title: nls.localize2('ainativeSettings', "AINative Studio: Toggle Settings"),
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
        const openEditors = editorService.findEditors(AINativeSettingsInput.RESOURCE); // should only have 0 or 1 elements...
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
        const input = instantiationService.createInstance(AINativeSettingsInput);
        await editorGroupService.activeGroup.openEditor(input);
    }
});
export const AINATIVE_OPEN_SETTINGS_ACTION_ID = 'workbench.action.openAINativeSettings';
/** @deprecated Legacy alias for backward compatibility. Use AINATIVE_OPEN_SETTINGS_ACTION_ID instead. */
export const VOID_OPEN_SETTINGS_ACTION_ID = AINATIVE_OPEN_SETTINGS_ACTION_ID;
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: AINATIVE_OPEN_SETTINGS_ACTION_ID,
            title: nls.localize2('ainativeSettingsAction2', "AINative Studio: Open Settings"),
            f1: true,
            icon: Codicon.settingsGear,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        // close all instances if found
        const openEditors = editorService.findEditors(AINativeSettingsInput.RESOURCE);
        if (openEditors.length > 0) {
            await editorService.closeEditors(openEditors);
        }
        // then, open one single editor
        const input = instantiationService.createInstance(AINativeSettingsInput);
        await editorService.openEditor(input);
    }
});
// add to settings gear on bottom left
MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
    group: '0_command',
    command: {
        id: AINATIVE_TOGGLE_SETTINGS_ACTION_ID,
        title: nls.localize('ainativeSettingsActionGear', "AINative Studio Settings")
    },
    order: 1
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVTZXR0aW5nc1BhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2Jyb3dzZXIvYWluYXRpdmVTZXR0aW5nc1BhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6RSxPQUFPLEVBQWdCLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVqRixPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUM7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8s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