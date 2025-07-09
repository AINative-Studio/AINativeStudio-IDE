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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IExtensionRecommendationNotificationService } from '../../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { ExtensionRecommendationNotificationServiceChannel } from '../../../../platform/extensionRecommendations/common/extensionRecommendationsIpc.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { RuntimeExtensionsInput } from '../common/runtimeExtensionsInput.js';
import { DebugExtensionHostAction, DebugExtensionsContribution } from './debugExtensionHostAction.js';
import { ExtensionHostProfileService } from './extensionProfileService.js';
import { CleanUpExtensionsFolderAction, OpenExtensionsFolderAction } from './extensionsActions.js';
import { ExtensionsAutoProfiler } from './extensionsAutoProfiler.js';
import { InstallRemoteExtensionsContribution, RemoteExtensionsInitializerContribution } from './remoteExtensionsInit.js';
import { IExtensionHostProfileService, OpenExtensionHostProfileACtion, RuntimeExtensionsEditor, SaveExtensionHostProfileAction, StartExtensionHostProfileAction, StopExtensionHostProfileAction } from './runtimeExtensionsEditor.js';
// Singletons
registerSingleton(IExtensionHostProfileService, ExtensionHostProfileService, 1 /* InstantiationType.Delayed */);
// Running Extensions Editor
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(RuntimeExtensionsEditor, RuntimeExtensionsEditor.ID, localize('runtimeExtension', "Running Extensions")), [new SyncDescriptor(RuntimeExtensionsInput)]);
class RuntimeExtensionsInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        return '';
    }
    deserialize(instantiationService) {
        return RuntimeExtensionsInput.instance;
    }
}
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(RuntimeExtensionsInput.ID, RuntimeExtensionsInputSerializer);
// Global actions
let ExtensionsContributions = class ExtensionsContributions extends Disposable {
    constructor(extensionRecommendationNotificationService, sharedProcessService) {
        super();
        sharedProcessService.registerChannel('extensionRecommendationNotification', new ExtensionRecommendationNotificationServiceChannel(extensionRecommendationNotificationService));
        this._register(registerAction2(OpenExtensionsFolderAction));
        this._register(registerAction2(CleanUpExtensionsFolderAction));
    }
};
ExtensionsContributions = __decorate([
    __param(0, IExtensionRecommendationNotificationService),
    __param(1, ISharedProcessService)
], ExtensionsContributions);
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(ExtensionsContributions, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(ExtensionsAutoProfiler, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(RemoteExtensionsInitializerContribution, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(InstallRemoteExtensionsContribution, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(DebugExtensionsContribution, 3 /* LifecyclePhase.Restored */);
// Register Commands
registerAction2(DebugExtensionHostAction);
registerAction2(StartExtensionHostProfileAction);
registerAction2(StopExtensionHostProfileAction);
registerAction2(SaveExtensionHostProfileAction);
registerAction2(OpenExtensionHostProfileACtion);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbnMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQy9JLE9BQU8sRUFBRSxpREFBaUQsRUFBRSxNQUFNLHFGQUFxRixDQUFDO0FBQ3hKLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RixPQUFPLEVBQTJELFVBQVUsSUFBSSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlJLE9BQU8sRUFBRSxnQkFBZ0IsRUFBNkMsTUFBTSwyQkFBMkIsQ0FBQztBQUd4RyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwr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