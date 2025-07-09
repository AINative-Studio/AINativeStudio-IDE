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
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isWeb } from '../../../../base/common/platform.js';
import { isEqual } from '../../../../base/common/resources.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUserDataAutoSyncService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { VIEWLET_ID } from '../../extensions/common/extensions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { KeybindingsEditorInput } from '../../../services/preferences/browser/keybindingsEditorInput.js';
import { SettingsEditor2Input } from '../../../services/preferences/common/preferencesEditorInput.js';
let UserDataSyncTrigger = class UserDataSyncTrigger extends Disposable {
    constructor(editorService, userDataProfilesService, viewsService, userDataAutoSyncService, hostService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        const event = Event.filter(Event.any(Event.map(editorService.onDidActiveEditorChange, () => this.getUserDataEditorInputSource(editorService.activeEditor)), Event.map(Event.filter(viewsService.onDidChangeViewContainerVisibility, e => e.id === VIEWLET_ID && e.visible), e => e.id)), source => source !== undefined);
        if (isWeb) {
            this._register(Event.debounce(Event.any(Event.map(hostService.onDidChangeFocus, () => 'windowFocus'), Event.map(event, source => source)), (last, source) => last ? [...last, source] : [source], 1000)(sources => userDataAutoSyncService.triggerSync(sources, { skipIfSyncedRecently: true })));
        }
        else {
            this._register(event(source => userDataAutoSyncService.triggerSync([source], { skipIfSyncedRecently: true })));
        }
    }
    getUserDataEditorInputSource(editorInput) {
        if (!editorInput) {
            return undefined;
        }
        if (editorInput instanceof SettingsEditor2Input) {
            return 'settingsEditor';
        }
        if (editorInput instanceof KeybindingsEditorInput) {
            return 'keybindingsEditor';
        }
        const resource = editorInput.resource;
        if (isEqual(resource, this.userDataProfilesService.defaultProfile.settingsResource)) {
            return 'settingsEditor';
        }
        if (isEqual(resource, this.userDataProfilesService.defaultProfile.keybindingsResource)) {
            return 'keybindingsEditor';
        }
        return undefined;
    }
};
UserDataSyncTrigger = __decorate([
    __param(0, IEditorService),
    __param(1, IUserDataProfilesService),
    __param(2, IViewsService),
    __param(3, IUserDataAutoSyncService),
    __param(4, IHostService)
], UserDataSyncTrigger);
export { UserDataSyncTrigger };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jVHJpZ2dlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91c2VyRGF0YVN5bmMvYnJvd3Nlci91c2VyRGF0YVN5bmNUcmlnZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMxRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUdwRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFFL0YsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBRWxELFlBQ2lCLGFBQTZCLEVBQ0YsdUJBQWlELEVBQzdFLFlBQTJCLEVBQ2hCLHVCQUFpRCxFQUM3RCxXQUF5QjtRQUV2QyxLQUFLLEVB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