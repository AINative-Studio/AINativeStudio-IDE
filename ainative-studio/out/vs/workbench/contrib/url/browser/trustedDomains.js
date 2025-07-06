/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../nls.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
const TRUSTED_DOMAINS_URI = URI.parse('trustedDomains:/Trusted Domains');
export const TRUSTED_DOMAINS_STORAGE_KEY = 'http.linkProtectionTrustedDomains';
export const TRUSTED_DOMAINS_CONTENT_STORAGE_KEY = 'http.linkProtectionTrustedDomainsContent';
export const manageTrustedDomainSettingsCommand = {
    id: 'workbench.action.manageTrustedDomain',
    description: {
        description: localize2('trustedDomain.manageTrustedDomain', 'Manage Trusted Domains'),
        args: []
    },
    handler: async (accessor) => {
        const editorService = accessor.get(IEditorService);
        editorService.openEditor({ resource: TRUSTED_DOMAINS_URI, languageId: 'jsonc', options: { pinned: true } });
        return;
    }
};
export async function configureOpenerTrustedDomainsHandler(trustedDomains, domainToConfigure, resource, quickInputService, storageService, editorService, telemetryService) {
    const parsedDomainToConfigure = URI.parse(domainToConfigure);
    const toplevelDomainSegements = parsedDomainToConfigure.authority.split('.');
    const domainEnd = toplevelDomainSegements.slice(toplevelDomainSegements.length - 2).join('.');
    const topLevelDomain = '*.' + domainEnd;
    const options = [];
    options.push({
        type: 'item',
        label: localize('trustedDomain.trustDomain', 'Trust {0}', domainToConfigure),
        id: 'trust',
        toTrust: domainToConfigure,
        picked: true
    });
    const isIP = toplevelDomainSegements.length === 4 &&
        toplevelDomainSegements.every(segment => Number.isInteger(+segment) || Number.isInteger(+segment.split(':')[0]));
    if (isIP) {
        if (parsedDomainToConfigure.authority.includes(':')) {
            const base = parsedDomainToConfigure.authority.split(':')[0];
            options.push({
                type: 'item',
                label: localize('trustedDomain.trustAllPorts', 'Trust {0} on all ports', base),
                toTrust: base + ':*',
                id: 'trust'
            });
        }
    }
    else {
        options.push({
            type: 'item',
            label: localize('trustedDomain.trustSubDomain', 'Trust {0} and all its subdomains', domainEnd),
            toTrust: topLevelDomain,
            id: 'trust'
        });
    }
    options.push({
        type: 'item',
        label: localize('trustedDomain.trustAllDomains', 'Trust all domains (disables link protection)'),
        toTrust: '*',
        id: 'trust'
    });
    options.push({
        type: 'item',
        label: localize('trustedDomain.manageTrustedDomains', 'Manage Trusted Domains'),
        id: 'manage'
    });
    const pickedResult = await quickInputService.pick(options, { activeItem: options[0] });
    if (pickedResult && pickedResult.id) {
        switch (pickedResult.id) {
            case 'manage':
                await editorService.openEditor({
                    resource: TRUSTED_DOMAINS_URI.with({ fragment: resource.toString() }),
                    languageId: 'jsonc',
                    options: { pinned: true }
                });
                return trustedDomains;
            case 'trust': {
                const itemToTrust = pickedResult.toTrust;
                if (trustedDomains.indexOf(itemToTrust) === -1) {
                    storageService.remove(TRUSTED_DOMAINS_CONTENT_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
                    storageService.store(TRUSTED_DOMAINS_STORAGE_KEY, JSON.stringify([...trustedDomains, itemToTrust]), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    return [...trustedDomains, itemToTrust];
                }
            }
        }
    }
    return [];
}
export async function readTrustedDomains(accessor) {
    const { defaultTrustedDomains, trustedDomains } = readStaticTrustedDomains(accessor);
    return {
        defaultTrustedDomains,
        trustedDomains,
    };
}
export function readStaticTrustedDomains(accessor) {
    const storageService = accessor.get(IStorageService);
    const productService = accessor.get(IProductService);
    const environmentService = accessor.get(IBrowserWorkbenchEnvironmentService);
    const defaultTrustedDomains = [
        ...productService.linkProtectionTrustedDomains ?? [],
        ...environmentService.options?.additionalTrustedDomains ?? []
    ];
    let trustedDomains = [];
    try {
        const trustedDomainsSrc = storageService.get(TRUSTED_DOMAINS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (trustedDomainsSrc) {
            trustedDomains = JSON.parse(trustedDomainsSrc);
        }
    }
    catch (err) { }
    return {
        defaultTrustedDomains,
        trustedDomains,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91cmwvYnJvd3Nlci90cnVzdGVkRG9tYWlucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUV6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFeEYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUU5RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFbEgsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7QUFFekUsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsbUNBQW1DLENBQUM7QUFDL0UsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQUcsMENBQTBDLENBQUM7QUFFOUYsTUFBTSxDQUFDLE1BQU0sa0NBQWtDLEdBQUc7SUFDakQsRUFBRSxFQUFFLHNDQUFzQztJQUMxQyxXQUFXLEVBQUU7UUFDWixXQUFXLEVBQUUsU0FBUyxDQUFDLG1DQUFtQyxFQUFFLHdCQUF3QixDQUFDO1FBQ3JGLElBQUksRUFBRSxFQUFFO0tBQ1I7SUFDRCxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBRTtRQUM3QyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELGFBQWEsQ0FB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