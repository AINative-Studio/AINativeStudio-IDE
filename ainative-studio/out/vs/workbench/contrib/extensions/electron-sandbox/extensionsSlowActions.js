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
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Action } from '../../../../base/common/actions.js';
import { URI } from '../../../../base/common/uri.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../nls.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IRequestService, asText } from '../../../../platform/request/common/request.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { Utils } from '../../../../platform/profiling/common/profiling.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
class RepoInfo {
    static fromExtension(desc) {
        let result;
        // scheme:auth/OWNER/REPO/issues/
        if (desc.bugs && typeof desc.bugs.url === 'string') {
            const base = URI.parse(desc.bugs.url);
            const match = /\/([^/]+)\/([^/]+)\/issues\/?$/.exec(desc.bugs.url);
            if (match) {
                result = {
                    base: base.with({ path: null, fragment: null, query: null }).toString(true),
                    owner: match[1],
                    repo: match[2]
                };
            }
        }
        // scheme:auth/OWNER/REPO.git
        if (!result && desc.repository && typeof desc.repository.url === 'string') {
            const base = URI.parse(desc.repository.url);
            const match = /\/([^/]+)\/([^/]+)(\.git)?$/.exec(desc.repository.url);
            if (match) {
                result = {
                    base: base.with({ path: null, fragment: null, query: null }).toString(true),
                    owner: match[1],
                    repo: match[2]
                };
            }
        }
        // for now only GH is supported
        if (result && result.base.indexOf('github') === -1) {
            result = undefined;
        }
        return result;
    }
}
let SlowExtensionAction = class SlowExtensionAction extends Action {
    constructor(extension, profile, _instantiationService) {
        super('report.slow', localize('cmd.reportOrShow', "Performance Issue"), 'extension-action report-issue');
        this.extension = extension;
        this.profile = profile;
        this._instantiationService = _instantiationService;
        this.enabled = Boolean(RepoInfo.fromExtension(extension));
    }
    async run() {
        const action = await this._instantiationService.invokeFunction(createSlowExtensionAction, this.extension, this.profile);
        if (action) {
            await action.run();
        }
    }
};
SlowExtensionAction = __decorate([
    __param(2, IInstantiationService)
], SlowExtensionAction);
export { SlowExtensionAction };
export async function createSlowExtensionAction(accessor, extension, profile) {
    const info = RepoInfo.fromExtension(extension);
    if (!info) {
        return undefined;
    }
    const requestService = accessor.get(IRequestService);
    const instaService = accessor.get(IInstantiationService);
    const url = `https://api.github.com/search/issues?q=is:issue+state:open+in:title+repo:${info.owner}/${info.repo}+%22Extension+causes+high+cpu+load%22`;
    let res;
    try {
        res = await requestService.request({ url }, CancellationToken.None);
    }
    catch {
        return undefined;
    }
    const rawText = await asText(res);
    if (!rawText) {
        return undefined;
    }
    const data = JSON.parse(rawText);
    if (!data || typeof data.total_count !== 'number') {
        return undefined;
    }
    else if (data.total_count === 0) {
        return instaService.createInstance(ReportExtensionSlowAction, extension, info, profile);
    }
    else {
        return instaService.createInstance(ShowExtensionSlowAction, extension, info, profile);
    }
}
let ReportExtensionSlowAction = class ReportExtensionSlowAction extends Action {
    constructor(extension, repoInfo, profile, _dialogService, _openerService, _productService, _nativeHostService, _environmentService, _fileService) {
        super('report.slow', localize('cmd.report', "Report Issue"));
        this.extension = extension;
        this.repoInfo = repoInfo;
        this.profile = profile;
        this._dialogService = _dialogService;
        this._openerService = _openerService;
        this._productService = _productService;
        this._nativeHostService = _nativeHostService;
        this._environmentService = _environmentService;
        this._fileService = _fileService;
    }
    async run() {
        // rewrite pii (paths) and store on disk
        const data = Utils.rewriteAbsolutePaths(this.profile.data, 'pii_removed');
        const path = joinPath(this._environmentService.tmpDir, `${this.extension.identifier.value}-unresponsive.cpuprofile.txt`);
        await this._fileService.writeFile(path, VSBuffer.fromString(JSON.stringify(data, undefined, 4)));
        // build issue
        const os = await this._nativeHostService.getOSProperties();
        const title = encodeURIComponent('Extension causes high cpu load');
        const osVersion = `${os.type} ${os.arch} ${os.release}`;
        const message = `:warning: Make sure to **attach** this file from your *home*-directory:\n:warning:\`${path}\`\n\nFind more details here: https://github.com/microsoft/vscode/wiki/Explain-extension-causes-high-cpu-load`;
        const body = encodeURIComponent(`- Issue Type: \`Performance\`
- Extension Name: \`${this.extension.name}\`
- Extension Version: \`${this.extension.version}\`
- OS Version: \`${osVersion}\`
- VS Code version: \`${this._productService.version}\`\n\n${message}`);
        const url = `${this.repoInfo.base}/${this.repoInfo.owner}/${this.repoInfo.repo}/issues/new/?body=${body}&title=${title}`;
        this._openerService.open(URI.parse(url));
        this._dialogService.info(localize('attach.title', "Did you attach the CPU-Profile?"), localize('attach.msg', "This is a reminder to make sure that you have not forgotten to attach '{0}' to the issue you have just created.", path.fsPath));
    }
};
ReportExtensionSlowAction = __decorate([
    __param(3, IDialogService),
    __param(4, IOpenerService),
    __param(5, IProductService),
    __param(6, INativeHostService),
    __param(7, INativeWorkbenchEnvironmentService),
    __param(8, IFileService)
], ReportExtensionSlowAction);
let ShowExtensionSlowAction = class ShowExtensionSlowAction extends Action {
    constructor(extension, repoInfo, profile, _dialogService, _openerService, _environmentService, _fileService) {
        super('show.slow', localize('cmd.show', "Show Issues"));
        this.extension = extension;
        this.repoInfo = repoInfo;
        this.profile = profile;
        this._dialogService = _dialogService;
        this._openerService = _openerService;
        this._environmentService = _environmentService;
        this._fileService = _fileService;
    }
    async run() {
        // rewrite pii (paths) and store on disk
        const data = Utils.rewriteAbsolutePaths(this.profile.data, 'pii_removed');
        const path = joinPath(this._environmentService.tmpDir, `${this.extension.identifier.value}-unresponsive.cpuprofile.txt`);
        await this._fileService.writeFile(path, VSBuffer.fromString(JSON.stringify(data, undefined, 4)));
        // show issues
        const url = `${this.repoInfo.base}/${this.repoInfo.owner}/${this.repoInfo.repo}/issues?utf8=✓&q=is%3Aissue+state%3Aopen+%22Extension+causes+high+cpu+load%22`;
        this._openerService.open(URI.parse(url));
        this._dialogService.info(localize('attach.title', "Did you attach the CPU-Profile?"), localize('attach.msg2', "This is a reminder to make sure that you have not forgotten to attach '{0}' to an existing performance issue.", path.fsPath));
    }
};
ShowExtensionSlowAction = __decorate([
    __param(3, IDialogService),
    __param(4, IOpenerService),
    __param(5, INativeWorkbenchEnvironmentService),
    __param(6, IFileService)
], ShowExtensionSlowAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1Nsb3dBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbnNTbG93QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFDMUgsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsUUFB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