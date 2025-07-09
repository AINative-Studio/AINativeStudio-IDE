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
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { localize2 } from '../../../../nls.js';
export const VIEWLET_ID = 'workbench.view.extensions';
export const EXTENSIONS_CATEGORY = localize2('extensions', "Extensions");
export var ExtensionState;
(function (ExtensionState) {
    ExtensionState[ExtensionState["Installing"] = 0] = "Installing";
    ExtensionState[ExtensionState["Installed"] = 1] = "Installed";
    ExtensionState[ExtensionState["Uninstalling"] = 2] = "Uninstalling";
    ExtensionState[ExtensionState["Uninstalled"] = 3] = "Uninstalled";
})(ExtensionState || (ExtensionState = {}));
export var ExtensionRuntimeActionType;
(function (ExtensionRuntimeActionType) {
    ExtensionRuntimeActionType["ReloadWindow"] = "reloadWindow";
    ExtensionRuntimeActionType["RestartExtensions"] = "restartExtensions";
    ExtensionRuntimeActionType["DownloadUpdate"] = "downloadUpdate";
    ExtensionRuntimeActionType["ApplyUpdate"] = "applyUpdate";
    ExtensionRuntimeActionType["QuitAndInstall"] = "quitAndInstall";
})(ExtensionRuntimeActionType || (ExtensionRuntimeActionType = {}));
export const IExtensionsWorkbenchService = createDecorator('extensionsWorkbenchService');
export var ExtensionEditorTab;
(function (ExtensionEditorTab) {
    ExtensionEditorTab["Readme"] = "readme";
    ExtensionEditorTab["Features"] = "features";
    ExtensionEditorTab["Changelog"] = "changelog";
    ExtensionEditorTab["Dependencies"] = "dependencies";
    ExtensionEditorTab["ExtensionPack"] = "extensionPack";
})(ExtensionEditorTab || (ExtensionEditorTab = {}));
export const ConfigurationKey = 'extensions';
export const AutoUpdateConfigurationKey = 'extensions.autoUpdate';
export const AutoCheckUpdatesConfigurationKey = 'extensions.autoCheckUpdates';
export const CloseExtensionDetailsOnViewChangeKey = 'extensions.closeExtensionDetailsOnViewChange';
export const AutoRestartConfigurationKey = 'extensions.autoRestart';
let ExtensionContainers = class ExtensionContainers extends Disposable {
    constructor(containers, extensionsWorkbenchService) {
        super();
        this.containers = containers;
        this._register(extensionsWorkbenchService.onChange(this.update, this));
    }
    set extension(extension) {
        this.containers.forEach(c => c.extension = extension);
    }
    update(extension) {
        for (const container of this.containers) {
            if (extension && container.extension) {
                if (areSameExtensions(container.extension.identifier, extension.identifier)) {
                    if (container.extension.server && extension.server && container.extension.server !== extension.server) {
                        if (container.updateWhenCounterExtensionChanges) {
                            container.update();
                        }
                    }
                    else {
                        container.extension = extension;
                    }
                }
            }
            else {
                container.update();
            }
        }
    }
};
ExtensionContainers = __decorate([
    __param(1, IExtensionsWorkbenchService)
], ExtensionContainers);
export { ExtensionContainers };
export const WORKSPACE_RECOMMENDATIONS_VIEW_ID = 'workbench.views.extensions.workspaceRecommendations';
export const OUTDATED_EXTENSIONS_VIEW_ID = 'workbench.views.extensions.searchOutdated';
export const TOGGLE_IGNORE_EXTENSION_ACTION_ID = 'workbench.extensions.action.toggleIgnoreExtension';
export const SELECT_INSTALL_VSIX_EXTENSION_COMMAND_ID = 'workbench.extensions.action.installVSIX';
export const INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID = 'workbench.extensions.command.installFromVSIX';
export const LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID = 'workbench.extensions.action.listWorkspaceUnsupportedExtensions';
// Context Keys
export const HasOutdatedExtensionsContext = new RawContextKey('hasOutdatedExtensions', false);
export const CONTEXT_HAS_GALLERY = new RawContextKey('hasGallery', false);
export const ExtensionResultsListFocused = new RawContextKey('extensionResultListFocused ', true);
// Context Menu Groups
export const THEME_ACTIONS_GROUP = '_theme_';
export const INSTALL_ACTIONS_GROUP = '0_install';
export const UPDATE_ACTIONS_GROUP = '0_update';
export const extensionsSearchActionsMenu = new MenuId('extensionsSearchActionsMenu');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQU03RixPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEVBQTRFLENBQUM7QUFJL0csT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBR3JGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUl4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFL0MsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLDJCQUEyQixDQUFDO0FBQ3RELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFZekUsTUFBTSxDQUFOLElBQWtCLGNBS2pCO0FBTEQsV0FBa0IsY0FBYztJQUMvQiwrREFBVSxDQUFBO0lBQ1YsNkRBQVMsQ0FBQTtJQUNULG1FQUFZLENBQUE7SUFDWixpRUFBVyxDQUFBO0FBQ1osQ0FBQyxFQUxpQixjQUFjLEtBQWQsY0FBYyxRQUsvQjtBQUVELE1BQU0sQ0FBTixJQUFrQiwwQkFNakI7QUFORCxXQUFrQiwwQkFBMEI7SUFDM0MsMkRBQTZCLENBQUE7SUFDN0IscUVBQXVDLENBQUE7SUFDdkMsK0RBQWlDLENBQUE7SUFDakMseURBQTJCLENBQUE7SUFDM0IsK0RBQWlDLENBQUE7QUFDbEMsQ0FBQyxFQU5pQiww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