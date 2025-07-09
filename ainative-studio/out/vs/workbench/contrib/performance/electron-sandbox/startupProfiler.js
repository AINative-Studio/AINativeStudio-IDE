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
import { localize } from '../../../../nls.js';
import { dirname, basename } from '../../../../base/common/resources.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { PerfviewContrib } from '../browser/perfviewEditor.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { URI } from '../../../../base/common/uri.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
let StartupProfiler = class StartupProfiler {
    constructor(_dialogService, _environmentService, _textModelResolverService, _clipboardService, lifecycleService, extensionService, _openerService, _nativeHostService, _productService, _fileService, _labelService) {
        this._dialogService = _dialogService;
        this._environmentService = _environmentService;
        this._textModelResolverService = _textModelResolverService;
        this._clipboardService = _clipboardService;
        this._openerService = _openerService;
        this._nativeHostService = _nativeHostService;
        this._productService = _productService;
        this._fileService = _fileService;
        this._labelService = _labelService;
        // wait for everything to be ready
        Promise.all([
            lifecycleService.when(4 /* LifecyclePhase.Eventually */),
            extensionService.whenInstalledExtensionsRegistered()
        ]).then(() => {
            this._stopProfiling();
        });
    }
    _stopProfiling() {
        if (!this._environmentService.args['prof-startup-prefix']) {
            return;
        }
        const profileFilenamePrefix = URI.file(this._environmentService.args['prof-startup-prefix']);
        const dir = dirname(profileFilenamePrefix);
        const prefix = basename(profileFilenamePrefix);
        const removeArgs = ['--prof-startup'];
        const markerFile = this._fileService.readFile(profileFilenamePrefix).then(value => removeArgs.push(...value.toString().split('|')))
            .then(() => this._fileService.del(profileFilenamePrefix, { recursive: true })) // (1) delete the file to tell the main process to stop profiling
            .then(() => new Promise(resolve => {
            const check = () => {
                this._fileService.exists(profileFilenamePrefix).then(exists => {
                    if (exists) {
                        resolve();
                    }
                    else {
                        setTimeout(check, 500);
                    }
                });
            };
            check();
        }))
            .then(() => this._fileService.del(profileFilenamePrefix, { recursive: true })); // (3) finally delete the file again
        markerFile.then(() => {
            return this._fileService.resolve(dir).then(stat => {
                return (stat.children ? stat.children.filter(value => value.resource.path.includes(prefix)) : []).map(stat => stat.resource);
            });
        }).then(files => {
            const profileFiles = files.reduce((prev, cur) => `${prev}${this._labelService.getUriLabel(cur)}\n`, '\n');
            return this._dialogService.confirm({
                type: 'info',
                message: localize('prof.message', "Successfully created profiles."),
                detail: localize('prof.detail', "Please create an issue and manually attach the following files:\n{0}", profileFiles),
                primaryButton: localize({ key: 'prof.restartAndFileIssue', comment: ['&& denotes a mnemonic'] }, "&&Create Issue and Restart"),
                cancelButton: localize('prof.restart', "Restart")
            }).then(res => {
                if (res.confirmed) {
                    Promise.all([
                        this._nativeHostService.showItemInFolder(files[0].fsPath),
                        this._createPerfIssue(files.map(file => basename(file)))
                    ]).then(() => {
                        // keep window stable until restart is selected
                        return this._dialogService.confirm({
                            type: 'info',
                            message: localize('prof.thanks', "Thanks for helping us."),
                            detail: localize('prof.detail.restart', "A final restart is required to continue to use '{0}'. Again, thank you for your contribution.", this._productService.nameLong),
                            primaryButton: localize({ key: 'prof.restart.button', comment: ['&& denotes a mnemonic'] }, "&&Restart")
                        }).then(res => {
                            // now we are ready to restart
                            if (res.confirmed) {
                                this._nativeHostService.relaunch({ removeArgs });
                            }
                        });
                    });
                }
                else {
                    // simply restart
                    this._nativeHostService.relaunch({ removeArgs });
                }
            });
        });
    }
    async _createPerfIssue(files) {
        const reportIssueUrl = this._productService.reportIssueUrl;
        if (!reportIssueUrl) {
            return;
        }
        const contrib = PerfviewContrib.get();
        const ref = await this._textModelResolverService.createModelReference(contrib.getInputUri());
        try {
            await this._clipboardService.writeText(ref.object.textEditorModel.getValue());
        }
        finally {
            ref.dispose();
        }
        const body = `
1. :warning: We have copied additional data to your clipboard. Make sure to **paste** here. :warning:
1. :warning: Make sure to **attach** these files from your *home*-directory: :warning:\n${files.map(file => `-\`${file}\``).join('\n')}
`;
        const baseUrl = reportIssueUrl;
        const queryStringPrefix = baseUrl.indexOf('?') === -1 ? '?' : '&';
        this._openerService.open(URI.parse(`${baseUrl}${queryStringPrefix}body=${encodeURIComponent(body)}`));
    }
};
StartupProfiler = __decorate([
    __param(0, IDialogService),
    __param(1, INativeWorkbenchEnvironmentService),
    __param(2, ITextModelService),
    __param(3, IClipboardService),
    __param(4, ILifecycleService),
    __param(5, IExtensionService),
    __param(6, IOpenerService),
    __param(7, INativeHostService),
    __param(8, IProductService),
    __param(9, IFileService),
    __param(10, ILabelService)
], StartupProfiler);
export { StartupProfiler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnR1cFByb2ZpbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3BlcmZvcm1hbmNlL2VsZWN0cm9uLXNhbmRib3gvc3RhcnR1cFByb2ZpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUMxSCxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0saURBQWlELENBQUM7QUFDcEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsYUFBYSxFQUFF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