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
import { Schemas, matchesScheme } from '../../../../base/common/network.js';
import Severity from '../../../../base/common/severity.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { ITrustedDomainService } from './trustedDomainService.js';
import { isURLDomainTrusted } from '../common/trustedDomains.js';
import { configureOpenerTrustedDomainsHandler, readStaticTrustedDomains } from './trustedDomains.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
let OpenerValidatorContributions = class OpenerValidatorContributions {
    constructor(_openerService, _storageService, _dialogService, _productService, _quickInputService, _editorService, _clipboardService, _telemetryService, _instantiationService, _configurationService, _workspaceTrustService, _trustedDomainService) {
        this._openerService = _openerService;
        this._storageService = _storageService;
        this._dialogService = _dialogService;
        this._productService = _productService;
        this._quickInputService = _quickInputService;
        this._editorService = _editorService;
        this._clipboardService = _clipboardService;
        this._telemetryService = _telemetryService;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._workspaceTrustService = _workspaceTrustService;
        this._trustedDomainService = _trustedDomainService;
        this._openerService.registerValidator({ shouldOpen: (uri, options) => this.validateLink(uri, options) });
    }
    async validateLink(resource, openOptions) {
        if (!matchesScheme(resource, Schemas.http) && !matchesScheme(resource, Schemas.https)) {
            return true;
        }
        if (openOptions?.fromWorkspace && this._workspaceTrustService.isWorkspaceTrusted() && !this._configurationService.getValue('workbench.trustedDomains.promptInTrustedWorkspace')) {
            return true;
        }
        const originalResource = resource;
        let resourceUri;
        if (typeof resource === 'string') {
            resourceUri = URI.parse(resource);
        }
        else {
            resourceUri = resource;
        }
        if (this._trustedDomainService.isValid(resourceUri)) {
            return true;
        }
        else {
            const { scheme, authority, path, query, fragment } = resourceUri;
            let formattedLink = `${scheme}://${authority}${path}`;
            const linkTail = `${query ? '?' + query : ''}${fragment ? '#' + fragment : ''}`;
            const remainingLength = Math.max(0, 60 - formattedLink.length);
            const linkTailLengthToKeep = Math.min(Math.max(5, remainingLength), linkTail.length);
            if (linkTailLengthToKeep === linkTail.length) {
                formattedLink += linkTail;
            }
            else {
                // keep the first char ? or #
                // add ... and keep the tail end as much as possible
                formattedLink += linkTail.charAt(0) + '...' + linkTail.substring(linkTail.length - linkTailLengthToKeep + 1);
            }
            const { result } = await this._dialogService.prompt({
                type: Severity.Info,
                message: localize('openExternalLinkAt', 'Do you want {0} to open the external website?', this._productService.nameShort),
                detail: typeof originalResource === 'string' ? originalResource : formattedLink,
                buttons: [
                    {
                        label: localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, '&&Open'),
                        run: () => true
                    },
                    {
                        label: localize({ key: 'copy', comment: ['&& denotes a mnemonic'] }, '&&Copy'),
                        run: () => {
                            this._clipboardService.writeText(typeof originalResource === 'string' ? originalResource : resourceUri.toString(true));
                            return false;
                        }
                    },
                    {
                        label: localize({ key: 'configureTrustedDomains', comment: ['&& denotes a mnemonic'] }, 'Configure &&Trusted Domains'),
                        run: async () => {
                            const { trustedDomains, } = this._instantiationService.invokeFunction(readStaticTrustedDomains);
                            const domainToOpen = `${scheme}://${authority}`;
                            const pickedDomains = await configureOpenerTrustedDomainsHandler(trustedDomains, domainToOpen, resourceUri, this._quickInputService, this._storageService, this._editorService, this._telemetryService);
                            // Trust all domains
                            if (pickedDomains.indexOf('*') !== -1) {
                                return true;
                            }
                            // Trust current domain
                            if (isURLDomainTrusted(resourceUri, pickedDomains)) {
                                return true;
                            }
                            return false;
                        }
                    }
                ],
                cancelButton: {
                    run: () => false
                }
            });
            return result;
        }
    }
};
OpenerValidatorContributions = __decorate([
    __param(0, IOpenerService),
    __param(1, IStorageService),
    __param(2, IDialogService),
    __param(3, IProductService),
    __param(4, IQuickInputService),
    __param(5, IEditorService),
    __param(6, IClipboardService),
    __param(7, ITelemetryService),
    __param(8, IInstantiationService),
    __param(9, IConfigurationService),
    __param(10, IWorkspaceTrustManagementService),
    __param(11, ITrustedDomainService)
], OpenerValidatorContributions);
export { OpenerValidatorContributions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnNWYWxpZGF0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXJsL2Jyb3dzZXIvdHJ1c3RlZERvbWFpbnNWYWxpZGF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFlLE1BQU0sOENBQThDLENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUUzRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQkFB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