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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../../nls.js';
import { Categories } from '../../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { Extensions as WorkbenchExtensions } from '../../../../../common/contributions.js';
import { Memento } from '../../../../../common/memento.js';
import { NotebookSetting } from '../../../common/notebookCommon.js';
import { HAS_OPENED_NOTEBOOK } from '../../../common/notebookContextKeys.js';
import { NotebookEditorInput } from '../../../common/notebookEditorInput.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
const hasOpenedNotebookKey = 'hasOpenedNotebook';
const hasShownGettingStartedKey = 'hasShownNotebookGettingStarted';
/**
 * Sets a context key when a notebook has ever been opened by the user
 */
let NotebookGettingStarted = class NotebookGettingStarted extends Disposable {
    constructor(_editorService, _storageService, _contextKeyService, _commandService, _configurationService) {
        super();
        const hasOpenedNotebook = HAS_OPENED_NOTEBOOK.bindTo(_contextKeyService);
        const memento = new Memento('notebookGettingStarted2', _storageService);
        const storedValue = memento.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        if (storedValue[hasOpenedNotebookKey]) {
            hasOpenedNotebook.set(true);
        }
        const needToShowGettingStarted = _configurationService.getValue(NotebookSetting.openGettingStarted) && !storedValue[hasShownGettingStartedKey];
        if (!storedValue[hasOpenedNotebookKey] || needToShowGettingStarted) {
            const onDidOpenNotebook = () => {
                hasOpenedNotebook.set(true);
                storedValue[hasOpenedNotebookKey] = true;
                if (needToShowGettingStarted) {
                    _commandService.executeCommand('workbench.action.openWalkthrough', { category: 'notebooks', step: 'notebookProfile' }, true);
                    storedValue[hasShownGettingStartedKey] = true;
                }
                memento.saveMemento();
            };
            if (_editorService.activeEditor?.typeId === NotebookEditorInput.ID) {
                // active editor is notebook
                onDidOpenNotebook();
                return;
            }
            const listener = this._register(_editorService.onDidActiveEditorChange(() => {
                if (_editorService.activeEditor?.typeId === NotebookEditorInput.ID) {
                    listener.dispose();
                    onDidOpenNotebook();
                }
            }));
        }
    }
};
NotebookGettingStarted = __decorate([
    __param(0, IEditorService),
    __param(1, IStorageService),
    __param(2, IContextKeyService),
    __param(3, ICommandService),
    __param(4, IConfigurationService)
], NotebookGettingStarted);
export { NotebookGettingStarted };
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(NotebookGettingStarted, 3 /* LifecyclePhase.Restored */);
registerAction2(class NotebookClearNotebookLayoutAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.notebook.layout.gettingStarted',
            title: localize2('workbench.notebook.layout.gettingStarted.label', "Reset notebook getting started"),
            f1: true,
            precondition: ContextKeyExpr.equals(`config.${NotebookSetting.openGettingStarted}`, true),
            category: Categories.Developer,
        });
    }
    run(accessor) {
        const storageService = accessor.get(IStorageService);
        const memento = new Memento('notebookGettingStarted', storageService);
        const storedValue = memento.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        storedValue[hasOpenedNotebookKey] = undefined;
        memento.saveMemento();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tHZXR0aW5nU3RhcnRlZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvZ2V0dGluZ1N0YXJ0ZWQvbm90ZWJvb2tHZXR0aW5nU3RhcnRlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFaEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sc0RBQXNELENBQUM7QUFDcEgsT0FBTyxFQUEyRCxVQUFVLElBQUksbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwSixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxtQkFBbUIsRUFB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