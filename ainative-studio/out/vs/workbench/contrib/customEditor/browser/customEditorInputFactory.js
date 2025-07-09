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
import { Schemas } from '../../../../base/common/network.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { CustomEditorInput } from './customEditorInput.js';
import { ICustomEditorService } from '../common/customEditor.js';
import { NotebookEditorInput } from '../../notebook/common/notebookEditorInput.js';
import { IWebviewService } from '../../webview/browser/webview.js';
import { restoreWebviewContentOptions, restoreWebviewOptions, reviveWebviewExtensionDescription, WebviewEditorInputSerializer } from '../../webviewPanel/browser/webviewEditorInputSerializer.js';
import { IWebviewWorkbenchService } from '../../webviewPanel/browser/webviewWorkbenchService.js';
import { IWorkingCopyBackupService } from '../../../services/workingCopy/common/workingCopyBackup.js';
import { IWorkingCopyEditorService } from '../../../services/workingCopy/common/workingCopyEditorService.js';
let CustomEditorInputSerializer = class CustomEditorInputSerializer extends WebviewEditorInputSerializer {
    static { this.ID = CustomEditorInput.typeId; }
    constructor(webviewWorkbenchService, _instantiationService, _webviewService) {
        super(webviewWorkbenchService);
        this._instantiationService = _instantiationService;
        this._webviewService = _webviewService;
    }
    serialize(input) {
        const dirty = input.isDirty();
        const data = {
            ...this.toJson(input),
            editorResource: input.resource.toJSON(),
            dirty,
            backupId: dirty ? input.backupId : undefined,
        };
        try {
            return JSON.stringify(data);
        }
        catch {
            return undefined;
        }
    }
    fromJson(data) {
        return {
            ...super.fromJson(data),
            editorResource: URI.from(data.editorResource),
            dirty: data.dirty,
        };
    }
    deserialize(_instantiationService, serializedEditorInput) {
        const data = this.fromJson(JSON.parse(serializedEditorInput));
        const webview = reviveWebview(this._webviewService, data);
        const customInput = this._instantiationService.createInstance(CustomEditorInput, { resource: data.editorResource, viewType: data.viewType }, webview, { startsDirty: data.dirty, backupId: data.backupId });
        if (typeof data.group === 'number') {
            customInput.updateGroup(data.group);
        }
        return customInput;
    }
};
CustomEditorInputSerializer = __decorate([
    __param(0, IWebviewWorkbenchService),
    __param(1, IInstantiationService),
    __param(2, IWebviewService)
], CustomEditorInputSerializer);
export { CustomEditorInputSerializer };
function reviveWebview(webviewService, data) {
    const webview = webviewService.createWebviewOverlay({
        providedViewType: data.viewType,
        origin: data.origin,
        title: undefined,
        options: {
            purpose: "customEditor" /* WebviewContentPurpose.CustomEditor */,
            enableFindWidget: data.webviewOptions.enableFindWidget,
            retainContextWhenHidden: data.webviewOptions.retainContextWhenHidden,
        },
        contentOptions: data.contentOptions,
        extension: data.extension,
    });
    webview.state = data.state;
    return webview;
}
let ComplexCustomWorkingCopyEditorHandler = class ComplexCustomWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.complexCustomWorkingCopyEditorHandler'; }
    constructor(_instantiationService, _workingCopyEditorService, _workingCopyBackupService, _webviewService, _customEditorService // DO NOT REMOVE (needed on startup to register overrides properly)
    ) {
        super();
        this._instantiationService = _instantiationService;
        this._workingCopyBackupService = _workingCopyBackupService;
        this._webviewService = _webviewService;
        this._register(_workingCopyEditorService.registerHandler(this));
    }
    handles(workingCopy) {
        return workingCopy.resource.scheme === Schemas.vscodeCustomEditor;
    }
    isOpen(workingCopy, editor) {
        if (!this.handles(workingCopy)) {
            return false;
        }
        if (workingCopy.resource.authority === 'jupyter-notebook-ipynb' && editor instanceof NotebookEditorInput) {
            try {
                const data = JSON.parse(workingCopy.resource.query);
                const workingCopyResource = URI.from(data);
                return isEqual(workingCopyResource, editor.resource);
            }
            catch {
                return false;
            }
        }
        if (!(editor instanceof CustomEditorInput)) {
            return false;
        }
        if (workingCopy.resource.authority !== editor.viewType.replace(/[^a-z0-9\-_]/gi, '-').toLowerCase()) {
            return false;
        }
        // The working copy stores the uri of the original resource as its query param
        try {
            const data = JSON.parse(workingCopy.resource.query);
            const workingCopyResource = URI.from(data);
            return isEqual(workingCopyResource, editor.resource);
        }
        catch {
            return false;
        }
    }
    async createEditor(workingCopy) {
        const backup = await this._workingCopyBackupService.resolve(workingCopy);
        if (!backup?.meta) {
            throw new Error(`No backup found for custom editor: ${workingCopy.resource}`);
        }
        const backupData = backup.meta;
        const extension = reviveWebviewExtensionDescription(backupData.extension?.id, backupData.extension?.location);
        const webview = reviveWebview(this._webviewService, {
            viewType: backupData.viewType,
            origin: backupData.webview.origin,
            webviewOptions: restoreWebviewOptions(backupData.webview.options),
            contentOptions: restoreWebviewContentOptions(backupData.webview.options),
            state: backupData.webview.state,
            extension,
        });
        const editor = this._instantiationService.createInstance(CustomEditorInput, { resource: URI.revive(backupData.editorResource), viewType: backupData.viewType }, webview, { backupId: backupData.backupId });
        editor.updateGroup(0);
        return editor;
    }
};
ComplexCustomWorkingCopyEditorHandler = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkingCopyEditorService),
    __param(2, IWorkingCopyBackupService),
    __param(3, IWebviewService),
    __param(4, ICustomEditorService)
], ComplexCustomWorkingCopyEditorHandler);
export { ComplexCustomWorkingCopyEditorHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9ySW5wdXRGYWN0b3J5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2N1c3RvbUVkaXRvci9icm93c2VyL2N1c3RvbUVkaXRvcklucHV0RmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBR25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQTZGLE1BQU0sa0NBQWtDLENBQUM7QUFDOUosT0FBTyxFQUF1Qiw0QkFBNEIsRUFBRSxxQkFBcUIsRUFBRSxpQ0FBaUMsRUFBK0MsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNwUSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVqRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN0RyxPQUFPLEVBQTZCLHlCQUF5QixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUErQmpJLElBQU0sMkJBQTJCLEdBQWpD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