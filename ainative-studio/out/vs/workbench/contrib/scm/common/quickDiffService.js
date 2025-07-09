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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isEqualOrParent } from '../../../../base/common/resources.js';
import { score } from '../../../../editor/common/languageSelector.js';
import { Emitter } from '../../../../base/common/event.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
function createProviderComparer(uri) {
    return (a, b) => {
        if (a.rootUri && !b.rootUri) {
            return -1;
        }
        else if (!a.rootUri && b.rootUri) {
            return 1;
        }
        else if (!a.rootUri && !b.rootUri) {
            return 0;
        }
        const aIsParent = isEqualOrParent(uri, a.rootUri);
        const bIsParent = isEqualOrParent(uri, b.rootUri);
        if (aIsParent && bIsParent) {
            return a.rootUri.fsPath.length - b.rootUri.fsPath.length;
        }
        else if (aIsParent) {
            return -1;
        }
        else if (bIsParent) {
            return 1;
        }
        else {
            return 0;
        }
    };
}
let QuickDiffService = class QuickDiffService extends Disposable {
    constructor(uriIdentityService) {
        super();
        this.uriIdentityService = uriIdentityService;
        this.quickDiffProviders = new Set();
        this._onDidChangeQuickDiffProviders = this._register(new Emitter());
        this.onDidChangeQuickDiffProviders = this._onDidChangeQuickDiffProviders.event;
    }
    addQuickDiffProvider(quickDiff) {
        this.quickDiffProviders.add(quickDiff);
        this._onDidChangeQuickDiffProviders.fire();
        return {
            dispose: () => {
                this.quickDiffProviders.delete(quickDiff);
                this._onDidChangeQuickDiffProviders.fire();
            }
        };
    }
    isQuickDiff(diff) {
        return !!diff.originalResource && (typeof diff.label === 'string') && (typeof diff.isSCM === 'boolean');
    }
    async getQuickDiffs(uri, language = '', isSynchronized = false) {
        const providers = Array.from(this.quickDiffProviders)
            .filter(provider => !provider.rootUri || this.uriIdentityService.extUri.isEqualOrParent(uri, provider.rootUri))
            .sort(createProviderComparer(uri));
        const diffs = await Promise.all(providers.map(async (provider) => {
            const scoreValue = provider.selector ? score(provider.selector, uri, language, isSynchronized, undefined, undefined) : 10;
            const diff = {
                originalResource: scoreValue > 0 ? await provider.getOriginalResource(uri) ?? undefined : undefined,
                label: provider.label,
                isSCM: provider.isSCM,
                visible: provider.visible
            };
            return diff;
        }));
        return diffs.filter(this.isQuickDiff);
    }
};
QuickDiffService = __decorate([
    __param(0, IUriIdentityService)
], QuickDiffService);
export { QuickDiffService };
export async function getOriginalResource(quickDiffService, uri, language, isSynchronized) {
    const quickDiffs = await quickDiffService.getQuickDiffs(uri, language, isSynchronized);
    return quickDiffs.length > 0 ? quickDiffs[0].originalResource : null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vY29tbW9uL3F1aWNrRGlmZlNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBRS9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTdGLFNBQVMsc0JBQXNCLENBQUMsR0FBUTtJQUN2QyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ2YsSUFBSSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzdCLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDO2FBQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3BDLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQzthQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3JDLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLE9BQVEsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxH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