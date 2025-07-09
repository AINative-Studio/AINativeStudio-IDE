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
import { MainContext } from './extHost.protocol.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
function isMessageItem(item) {
    return item && item.title;
}
let ExtHostMessageService = class ExtHostMessageService {
    constructor(mainContext, _logService) {
        this._logService = _logService;
        this._proxy = mainContext.getProxy(MainContext.MainThreadMessageService);
    }
    showMessage(extension, severity, message, optionsOrFirstItem, rest) {
        const options = {
            source: { identifier: extension.identifier, label: extension.displayName || extension.name }
        };
        let items;
        if (typeof optionsOrFirstItem === 'string' || isMessageItem(optionsOrFirstItem)) {
            items = [optionsOrFirstItem, ...rest];
        }
        else {
            options.modal = optionsOrFirstItem?.modal;
            options.useCustom = optionsOrFirstItem?.useCustom;
            options.detail = optionsOrFirstItem?.detail;
            items = rest;
        }
        if (options.useCustom) {
            checkProposedApiEnabled(extension, 'resolvers');
        }
        const commands = [];
        let hasCloseAffordance = false;
        for (let handle = 0; handle < items.length; handle++) {
            const command = items[handle];
            if (typeof command === 'string') {
                commands.push({ title: command, handle, isCloseAffordance: false });
            }
            else if (typeof command === 'object') {
                const { title, isCloseAffordance } = command;
                commands.push({ title, isCloseAffordance: !!isCloseAffordance, handle });
                if (isCloseAffordance) {
                    if (hasCloseAffordance) {
                        this._logService.warn(`[${extension.identifier}] Only one message item can have 'isCloseAffordance':`, command);
                    }
                    else {
                        hasCloseAffordance = true;
                    }
                }
            }
            else {
                this._logService.warn(`[${extension.identifier}] Invalid message item:`, command);
            }
        }
        return this._proxy.$showMessage(severity, message, options, commands).then(handle => {
            if (typeof handle === 'number') {
                return items[handle];
            }
            return undefined;
        });
    }
};
ExtHostMessageService = __decorate([
    __param(1, ILogService)
], ExtHostMessageService);
export { ExtHostMessageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1lc3NhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RNZXNzYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsV0FBVyxFQUF5RSxNQUFNLHVCQUF1QixDQUFDO0FBRTNILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUV6RixTQUFTLGFBQWEsQ0FBQyxJQUFTO0lBQy9CLE9BQU8sSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDM0IsQ0FBQztBQUVNLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXFCO0lBSWpDLFlBQ0MsV0FBeUIsRUFDSyxXQUF3QjtRQUF4QixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUV0RCxJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDMUUsQ0FBQztJQU1ELFdBQVcsQ0FBQyxTQUFnQyxFQUFFLFFBQWtCLEVBQUUsT0FBZSxFQUFFLGtCQUFtRixFQUFFLElBQXdDO1FBRS9NLE1BQU0sT0FBTyxHQUE2QjtZQUN6QyxNQUFNLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLFdBQVcsSUFBSSxTQUFTLENBQUMsSUFBSSxFQUFFO1NBQzVGLENBQUM7UUFDRixJQUFJLEtBQXNDLENBQUM7UUFFM0MsSUFBSSxPQUFPLGtCQUFrQixLQUFLLFFBQVEsSUFBSSxhQUFhLENBQUMsa0JBQWtCLENBQUMs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