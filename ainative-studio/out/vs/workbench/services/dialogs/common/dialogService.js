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
import Severity from '../../../../base/common/severity.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { DialogsModel } from '../../../common/dialogs.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let DialogService = class DialogService extends Disposable {
    constructor(environmentService, logService) {
        super();
        this.environmentService = environmentService;
        this.logService = logService;
        this.model = this._register(new DialogsModel());
        this.onWillShowDialog = this.model.onWillShowDialog;
        this.onDidShowDialog = this.model.onDidShowDialog;
    }
    skipDialogs() {
        if (this.environmentService.isExtensionDevelopment && this.environmentService.extensionTestsLocationURI) {
            return true; // integration tests
        }
        return !!this.environmentService.enableSmokeTestDriver; // smoke tests
    }
    async confirm(confirmation) {
        if (this.skipDialogs()) {
            this.logService.trace('DialogService: refused to show confirmation dialog in tests.');
            return { confirmed: true };
        }
        const handle = this.model.show({ confirmArgs: { confirmation } });
        return await handle.result;
    }
    async prompt(prompt) {
        if (this.skipDialogs()) {
            throw new Error(`DialogService: refused to show dialog in tests. Contents: ${prompt.message}`);
        }
        const handle = this.model.show({ promptArgs: { prompt } });
        const dialogResult = await handle.result;
        return {
            result: await dialogResult.result,
            checkboxChecked: dialogResult.checkboxChecked
        };
    }
    async input(input) {
        if (this.skipDialogs()) {
            throw new Error('DialogService: refused to show input dialog in tests.');
        }
        const handle = this.model.show({ inputArgs: { input } });
        return await handle.result;
    }
    async info(message, detail) {
        await this.prompt({ type: Severity.Info, message, detail });
    }
    async warn(message, detail) {
        await this.prompt({ type: Severity.Warning, message, detail });
    }
    async error(message, detail) {
        await this.prompt({ type: Severity.Error, message, detail });
    }
    async about() {
        if (this.skipDialogs()) {
            throw new Error('DialogService: refused to show about dialog in tests.');
        }
        const handle = this.model.show({});
        await handle.result;
    }
};
DialogService = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, ILogService)
], DialogService);
export { DialogService };
registerSingleton(IDialogService, DialogService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZGlhbG9ncy9jb21tb24vZGlhbG9nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUF3RixjQUFjLEVBQTRILE1BQU0sZ0RBQWdELENBQUM7QUFDaFMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzFELE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFOUQsSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBYyxTQUFRLFVBQVU7SUFVNUMsWUFDK0Isa0JBQWlFLEVBQ2xGLFVBQXdDO1FBRXJELEtBQUssRUFBRSxDQUFDO1FBSHVDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBOEI7UUFDakUsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQVI3QyxVQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFDLENBQUM7UUFFM0MscUJBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQztRQUUvQyxvQkFBZSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDO0lBT3RELENBQUM7SUFFTyxXQUFXO1FBQ2xCLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLHNCQUFz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