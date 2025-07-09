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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91cGRhdGUvYnJvd3Nlci91cGRhdGUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sa0VBQWtFLENBQUM7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFtQyxVQUFVLElBQUksbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0SCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGdDQUFnQyxFQUFFLGlCQUFpQixFQUFFLHdCQUF3QixFQUFFLFlBQVksRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUV6TCxPQUFPLE9BQU8sTUFBTSxnREFBZ0QsQ0FBQztBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFhLE1BQU0sOENBQThDLENBQUM7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUs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