/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../../../../platform/update/common/update.config.contribution.js';
import { localize, localize2 } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { ProductContribution, UpdateContribution, CONTEXT_UPDATE_STATE, SwitchProductQualityContribution, RELEASE_NOTES_URL, showReleaseNotesInEditor, DOWNLOAD_URL } from './update.js';
import product from '../../../../platform/product/common/product.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { isWindows } from '../../../../base/common/platform.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { mnemonicButtonLabel } from '../../../../base/common/labels.js';
import { ShowCurrentReleaseNotesActionId, ShowCurrentReleaseNotesFromCurrentFileActionId } from '../common/update.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { URI } from '../../../../base/common/uri.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
const workbench = Registry.as(WorkbenchExtensions.Workbench);
workbench.registerWorkbenchContribution(ProductContribution, 3 /* LifecyclePhase.Restored */);
workbench.registerWorkbenchContribution(UpdateContribution, 3 /* LifecyclePhase.Restored */);
workbench.registerWorkbenchContribution(SwitchProductQualityContribution, 3 /* LifecyclePhase.Restored */);
// Release notes
export class ShowCurrentReleaseNotesAction extends Action2 {
    constructor() {
        super({
            id: ShowCurrentReleaseNotesActionId,
            title: {
                ...localize2('showReleaseNotes', "Show Release Notes"),
                mnemonicTitle: localize({ key: 'mshowReleaseNotes', comment: ['&& denotes a mnemonic'] }, "Show &&Release Notes"),
            },
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: RELEASE_NOTES_URL,
            menu: [{
                    id: MenuId.MenubarHelpMenu,
                    group: '1_welcome',
                    order: 5,
                    when: RELEASE_NOTES_URL,
                }]
        });
    }
    async run(accessor) {
        const instantiationService = accessor.get(IInstantiationService);
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        try {
            await showReleaseNotesInEditor(instantiationService, productService.version, false);
        }
        catch (err) {
            if (productService.releaseNotesUrl) {
                await openerService.open(URI.parse(productService.releaseNotesUrl));
            }
            else {
                throw new Error(localize('update.noReleaseNotesOnline', "This version of {0} does not have release notes online", productService.nameLong));
            }
        }
    }
}
export class ShowCurrentReleaseNotesFromCurrentFileAction extends Action2 {
    constructor() {
        super({
            id: ShowCurrentReleaseNotesFromCurrentFileActionId,
            title: {
                ...localize2('showReleaseNotesCurrentFile', "Open Current File as Release Notes"),
                mnemonicTitle: localize({ key: 'mshowReleaseNotes', comment: ['&& denotes a mnemonic'] }, "Show &&Release Notes"),
            },
            category: localize2('developerCategory', "Developer"),
            f1: true,
        });
    }
    async run(accessor) {
        const instantiationService = accessor.get(IInstantiationService);
        const productService = accessor.get(IProductService);
        try {
            await showReleaseNotesInEditor(instantiationService, productService.version, true);
        }
        catch (err) {
            throw new Error(localize('releaseNotesFromFileNone', "Cannot open the current file as Release Notes"));
        }
    }
}
registerAction2(ShowCurrentReleaseNotesAction);
registerAction2(ShowCurrentReleaseNotesFromCurrentFileAction);
// Update
export class CheckForUpdateAction extends Action2 {
    constructor() {
        super({
            id: 'update.checkForUpdate',
            title: localize2('checkForUpdates', 'Check for Updates...'),
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: CONTEXT_UPDATE_STATE.isEqualTo("idle" /* StateType.Idle */),
        });
    }
    async run(accessor) {
        const updateService = accessor.get(IUpdateService);
        return updateService.checkForUpdates(true);
    }
}
class DownloadUpdateAction extends Action2 {
    constructor() {
        super({
            id: 'update.downloadUpdate',
            title: localize2('downloadUpdate', 'Download Update'),
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: CONTEXT_UPDATE_STATE.isEqualTo("available for download" /* StateType.AvailableForDownload */)
        });
    }
    async run(accessor) {
        await accessor.get(IUpdateService).downloadUpdate();
    }
}
class InstallUpdateAction extends Action2 {
    constructor() {
        super({
            id: 'update.installUpdate',
            title: localize2('installUpdate', 'Install Update'),
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: CONTEXT_UPDATE_STATE.isEqualTo("downloaded" /* StateType.Downloaded */)
        });
    }
    async run(accessor) {
        await accessor.get(IUpdateService).applyUpdate();
    }
}
class RestartToUpdateAction extends Action2 {
    constructor() {
        super({
            id: 'update.restartToUpdate',
            title: localize2('restartToUpdate', 'Restart to Update'),
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: CONTEXT_UPDATE_STATE.isEqualTo("ready" /* StateType.Ready */)
        });
    }
    async run(accessor) {
        await accessor.get(IUpdateService).quitAndInstall();
    }
}
class DownloadAction extends Action2 {
    static { this.ID = 'workbench.action.download'; }
    constructor() {
        super({
            id: DownloadAction.ID,
            title: localize2('openDownloadPage', "Download {0}", product.nameLong),
            precondition: ContextKeyExpr.and(IsWebContext, DOWNLOAD_URL), // Only show when running in a web browser and a download url is available
            f1: true,
            menu: [{
                    id: MenuId.StatusBarWindowIndicatorMenu,
                    when: ContextKeyExpr.and(IsWebContext, DOWNLOAD_URL)
                }]
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        if (productService.downloadUrl) {
            openerService.open(URI.parse(productService.downloadUrl));
        }
    }
}
registerAction2(DownloadAction);
registerAction2(CheckForUpdateAction);
registerAction2(DownloadUpdateAction);
registerAction2(InstallUpdateAction);
registerAction2(RestartToUpdateAction);
if (isWindows) {
    class DeveloperApplyUpdateAction extends Action2 {
        constructor() {
            super({
                id: '_update.applyupdate',
                title: localize2('applyUpdate', 'Apply Update...'),
                category: Categories.Developer,
                f1: true,
                precondition: CONTEXT_UPDATE_STATE.isEqualTo("idle" /* StateType.Idle */)
            });
        }
        async run(accessor) {
            const updateService = accessor.get(IUpdateService);
            const fileDialogService = accessor.get(IFileDialogService);
            const updatePath = await fileDialogService.showOpenDialog({
                title: localize('pickUpdate', "Apply Update"),
                filters: [{ name: 'Setup', extensions: ['exe'] }],
                canSelectFiles: true,
                openLabel: mnemonicButtonLabel(localize({ key: 'updateButton', comment: ['&& denotes a mnemonic'] }, "&&Update"))
            });
            if (!updatePath || !updatePath[0]) {
                return;
            }
            await updateService._applySpecificUpdate(updatePath[0].fsPath);
        }
    }
    registerAction2(DeveloperApplyUpdateAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VwZGF0ZS9icm93c2VyL3VwZGF0ZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxrRUFBa0UsQ0FBQztBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQW1DLFVBQVUsSUFBSSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsZ0NBQWdDLEVBQUUsaUJBQWlCLEVBQUUsd0JBQXdCLEVBQUUsWUFBWSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXpMLE9BQU8sT0FBTyxNQUFNLGdEQUFnRCxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQWEsTUFBTSw4Q0FBOEMsQ0FBQztBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSwr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