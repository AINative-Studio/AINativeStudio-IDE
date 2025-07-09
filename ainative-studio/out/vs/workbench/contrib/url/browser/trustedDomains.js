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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXJsL2Jyb3dzZXIvdHJ1c3RlZERvbWFpbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRXhGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFFOUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRWxILE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0FBRXpFLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLG1DQUFtQyxDQUFDO0FBQy9FLE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUFHLDBDQUEwQyxDQUFDO0FBRTlGLE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHO0lBQ2pELEVBQUUsRUFBRSxzQ0FBc0M7SUFDMUMsV0FBVyxFQUFFO1FBQ1osV0FBVyxFQUFFLFNBQVMsQ0FBQyxtQ0FBbUMsRUFBRSx3QkFBd0IsQ0FBQztRQUNyRixJQUFJLEVBQUUsRUFBRTtLQUNSO0lBQ0QsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLEVBQUU7UUFDN0MsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuRCxhQUFhLENB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