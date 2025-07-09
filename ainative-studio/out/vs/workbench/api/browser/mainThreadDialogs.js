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
var MainThreadDialogs_1;
import { URI } from '../../../base/common/uri.js';
import { MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
let MainThreadDialogs = MainThreadDialogs_1 = class MainThreadDialogs {
    constructor(context, _fileDialogService) {
        this._fileDialogService = _fileDialogService;
        //
    }
    dispose() {
        //
    }
    async $showOpenDialog(options) {
        const convertedOptions = MainThreadDialogs_1._convertOpenOptions(options);
        if (!convertedOptions.defaultUri) {
            convertedOptions.defaultUri = await this._fileDialogService.defaultFilePath();
        }
        return Promise.resolve(this._fileDialogService.showOpenDialog(convertedOptions));
    }
    async $showSaveDialog(options) {
        const convertedOptions = MainThreadDialogs_1._convertSaveOptions(options);
        if (!convertedOptions.defaultUri) {
            convertedOptions.defaultUri = await this._fileDialogService.defaultFilePath();
        }
        return Promise.resolve(this._fileDialogService.showSaveDialog(convertedOptions));
    }
    static _convertOpenOptions(options) {
        const result = {
            openLabel: options?.openLabel || undefined,
            canSelectFiles: options?.canSelectFiles || (!options?.canSelectFiles && !options?.canSelectFolders),
            canSelectFolders: options?.canSelectFolders,
            canSelectMany: options?.canSelectMany,
            defaultUri: options?.defaultUri ? URI.revive(options.defaultUri) : undefined,
            title: options?.title || undefined,
            availableFileSystems: []
        };
        if (options?.filters) {
            result.filters = [];
            for (const [key, value] of Object.entries(options.filters)) {
                result.filters.push({ name: key, extensions: value });
            }
        }
        return result;
    }
    static _convertSaveOptions(options) {
        const result = {
            defaultUri: options?.defaultUri ? URI.revive(options.defaultUri) : undefined,
            saveLabel: options?.saveLabel || undefined,
            title: options?.title || undefined
        };
        if (options?.filters) {
            result.filters = [];
            for (const [key, value] of Object.entries(options.filters)) {
                result.filters.push({ name: key, extensions: value });
            }
        }
        return result;
    }
};
MainThreadDialogs = MainThreadDialogs_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadDialogs),
    __param(1, IFileDialogService)
], MainThreadDialogs);
export { MainThreadDialogs };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERpYWxvZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWREaWFsb2dzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUEyQixXQUFXLEVBQTRELE1BQU0sK0JBQStCLENBQUM7QUFDL0ksT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxrQkFBa0IsRUFBMEMsTUFBTSw2Q0FBNkMsQ0FBQztBQUdsSCxJQUFNLGlCQUFpQix5QkFBdkIsTUFBTSxpQkFBaUI7SUFFN0IsWUFDQyxPQUF3QixFQUNhLGtCQUFzQztRQUF0Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBRTNFLEVBQUU7SUFDSCxDQUFDO0lBRUQsT0FBTztRQUNOLEVBQUU7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxPQUFxQztRQUMxRCxNQUFNLGdCQUFnQixHQUFHLG1CQUFpQixDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNsQyxnQkFBZ0IsQ0FBQyxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDL0UsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxPQUFx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