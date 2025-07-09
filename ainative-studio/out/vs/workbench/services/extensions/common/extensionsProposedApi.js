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
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { localize } from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { allApiProposals } from '../../../../platform/extensions/common/extensionsApiProposals.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { Extensions } from '../../extensionManagement/common/extensionFeatures.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
let ExtensionsProposedApi = class ExtensionsProposedApi {
    constructor(_logService, _environmentService, productService) {
        this._logService = _logService;
        this._environmentService = _environmentService;
        this._envEnabledExtensions = new Set((_environmentService.extensionEnabledProposedApi ?? []).map(id => ExtensionIdentifier.toKey(id)));
        this._envEnablesProposedApiForAll =
            !_environmentService.isBuilt || // always allow proposed API when running out of sources
                (_environmentService.isExtensionDevelopment && productService.quality !== 'stable') || // do not allow proposed API against stable builds when developing an extension
                (this._envEnabledExtensions.size === 0 && Array.isArray(_environmentService.extensionEnabledProposedApi)); // always allow proposed API if --enable-proposed-api is provided without extension ID
        this._productEnabledExtensions = new Map();
        // NEW world - product.json spells out what proposals each extension can use
        if (productService.extensionEnabledApiProposals) {
            for (const [k, value] of Object.entries(productService.extensionEnabledApiProposals)) {
                const key = ExtensionIdentifier.toKey(k);
                const proposalNames = value.filter(name => {
                    if (!allApiProposals[name]) {
                        _logService.warn(`Via 'product.json#extensionEnabledApiProposals' extension '${key}' wants API proposal '${name}' but that proposal DOES NOT EXIST. Likely, the proposal has been finalized (check 'vscode.d.ts') or was abandoned.`);
                        return false;
                    }
                    return true;
                });
                this._productEnabledExtensions.set(key, proposalNames);
            }
        }
    }
    updateEnabledApiProposals(extensions) {
        for (const extension of extensions) {
            this.doUpdateEnabledApiProposals(extension);
        }
    }
    doUpdateEnabledApiProposals(extension) {
        const key = ExtensionIdentifier.toKey(extension.identifier);
        // warn about invalid proposal and remove them from the list
        if (isNonEmptyArray(extension.enabledApiProposals)) {
            extension.enabledApiProposals = extension.enabledApiProposals.filter(name => {
                const result = Boolean(allApiProposals[name]);
                if (!result) {
                    this._logService.error(`Extension '${key}' wants API proposal '${name}' but that proposal DOES NOT EXIST. Likely, the proposal has been finalized (check 'vscode.d.ts') or was abandoned.`);
                }
                return result;
            });
        }
        if (this._productEnabledExtensions.has(key)) {
            // NOTE that proposals that are listed in product.json override whatever is declared in the extension
            // itself. This is needed for us to know what proposals are used "in the wild". Merging product.json-proposals
            // and extension-proposals would break that.
            const productEnabledProposals = this._productEnabledExtensions.get(key);
            // check for difference between product.json-declaration and package.json-declaration
            const productSet = new Set(productEnabledProposals);
            const extensionSet = new Set(extension.enabledApiProposals);
            const diff = new Set([...extensionSet].filter(a => !productSet.has(a)));
            if (diff.size > 0) {
                this._logService.error(`Extension '${key}' appears in product.json but enables LESS API proposals than the extension wants.\npackage.json (LOSES): ${[...extensionSet].join(', ')}\nproduct.json (WINS): ${[...productSet].join(', ')}`);
                if (this._environmentService.isExtensionDevelopment) {
                    this._logService.error(`Proceeding with EXTRA proposals (${[...diff].join(', ')}) because extension is in development mode. Still, this EXTENSION WILL BE BROKEN unless product.json is updated.`);
                    productEnabledProposals.push(...diff);
                }
            }
            extension.enabledApiProposals = productEnabledProposals;
            return;
        }
        if (this._envEnablesProposedApiForAll || this._envEnabledExtensions.has(key)) {
            // proposed API usage is not restricted and allowed just like the extension
            // has declared it
            return;
        }
        if (!extension.isBuiltin && isNonEmptyArray(extension.enabledApiProposals)) {
            // restrictive: extension cannot use proposed API in this context and its declaration is nulled
            this._logService.error(`Extension '${extension.identifier.value} CANNOT USE these API proposals '${extension.enabledApiProposals?.join(', ') || '*'}'. You MUST start in extension development mode or use the --enable-proposed-api command line flag`);
            extension.enabledApiProposals = [];
        }
    }
};
ExtensionsProposedApi = __decorate([
    __param(0, ILogService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IProductService)
], ExtensionsProposedApi);
export { ExtensionsProposedApi };
class ApiProposalsMarkdowneRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'markdown';
    }
    shouldRender(manifest) {
        return !!manifest.originalEnabledApiProposals?.length || !!manifest.enabledApiProposals?.length;
    }
    render(manifest) {
        const enabledApiProposals = manifest.originalEnabledApiProposals ?? manifest.enabledApiProposals ?? [];
        const data = new MarkdownString();
        if (enabledApiProposals.length) {
            for (const proposal of enabledApiProposals) {
                data.appendMarkdown(`- \`${proposal}\`\n`);
            }
        }
        return {
            data,
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'enabledApiProposals',
    label: localize('enabledProposedAPIs', "API Proposals"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ApiProposalsMarkdowneRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1Byb3Bvc2VkQXBpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25zUHJvcG9zZWRBcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUE2QyxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxlQUFlLEVBQW1CLE1BQU0sa0VBQWtFLENBQUM7QUFDcEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxVQUFVLEVBQWdGLE1BQU0sdURBQXVELENBQUM7QUFDakssT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUdsRixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQU1qQyxZQUMrQixXQUF3QixFQUNQLG1CQUFpRCxFQUMvRSxjQUErQjtRQUZsQixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNQLHdCQUFtQixHQUFuQixt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