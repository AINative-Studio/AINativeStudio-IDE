/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { matchesSomeScheme, Schemas } from '../../../../base/common/network.js';
import { registerModelAndPositionCommand } from '../../../browser/editorExtensions.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ReferencesModel } from './referencesModel.js';
function shouldIncludeLocationLink(sourceModel, loc) {
    // Always allow the location if the request comes from a document with the same scheme.
    if (loc.uri.scheme === sourceModel.uri.scheme) {
        return true;
    }
    // Otherwise filter out locations from internal schemes
    if (matchesSomeScheme(loc.uri, Schemas.walkThroughSnippet, Schemas.vscodeChatCodeBlock, Schemas.vscodeChatCodeCompareBlock)) {
        return false;
    }
    return true;
}
async function getLocationLinks(model, position, registry, recursive, provide) {
    const provider = registry.ordered(model, recursive);
    // get results
    const promises = provider.map((provider) => {
        return Promise.resolve(provide(provider, model, position)).then(undefined, err => {
            onUnexpectedExternalError(err);
            return undefined;
        });
    });
    const values = await Promise.all(promises);
    return coalesce(values.flat()).filter(loc => shouldIncludeLocationLink(model, loc));
}
export function getDefinitionsAtPosition(registry, model, position, recursive, token) {
    return getLocationLinks(model, position, registry, recursive, (provider, model, position) => {
        return provider.provideDefinition(model, position, token);
    });
}
export function getDeclarationsAtPosition(registry, model, position, recursive, token) {
    return getLocationLinks(model, position, registry, recursive, (provider, model, position) => {
        return provider.provideDeclaration(model, position, token);
    });
}
export function getImplementationsAtPosition(registry, model, position, recursive, token) {
    return getLocationLinks(model, position, registry, recursive, (provider, model, position) => {
        return provider.provideImplementation(model, position, token);
    });
}
export function getTypeDefinitionsAtPosition(registry, model, position, recursive, token) {
    return getLocationLinks(model, position, registry, recursive, (provider, model, position) => {
        return provider.provideTypeDefinition(model, position, token);
    });
}
export function getReferencesAtPosition(registry, model, position, compact, recursive, token) {
    return getLocationLinks(model, position, registry, recursive, async (provider, model, position) => {
        const result = (await provider.provideReferences(model, position, { includeDeclaration: true }, token))?.filter(ref => shouldIncludeLocationLink(model, ref));
        if (!compact || !result || result.length !== 2) {
            return result;
        }
        const resultWithoutDeclaration = (await provider.provideReferences(model, position, { includeDeclaration: false }, token))?.filter(ref => shouldIncludeLocationLink(model, ref));
        if (resultWithoutDeclaration && resultWithoutDeclaration.length === 1) {
            return resultWithoutDeclaration;
        }
        return result;
    });
}
// -- API commands ----
async function _sortedAndDeduped(callback) {
    const rawLinks = await callback();
    const model = new ReferencesModel(rawLinks, '');
    const modelLinks = model.references.map(ref => ref.link);
    model.dispose();
    return modelLinks;
}
registerModelAndPositionCommand('_executeDefinitionProvider', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, position, false, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeDefinitionProvider_recursive', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, position, true, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeTypeDefinitionProvider', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getTypeDefinitionsAtPosition(languageFeaturesService.typeDefinitionProvider, model, position, false, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeTypeDefinitionProvider_recursive', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getTypeDefinitionsAtPosition(languageFeaturesService.typeDefinitionProvider, model, position, true, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeDeclarationProvider', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getDeclarationsAtPosition(languageFeaturesService.declarationProvider, model, position, false, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeDeclarationProvider_recursive', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getDeclarationsAtPosition(languageFeaturesService.declarationProvider, model, position, true, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeReferenceProvider', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getReferencesAtPosition(languageFeaturesService.referenceProvider, model, position, false, false, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeReferenceProvider_recursive', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getReferencesAtPosition(languageFeaturesService.referenceProvider, model, position, false, true, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeImplementationProvider', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getImplementationsAtPosition(languageFeaturesService.implementationProvider, model, position, false, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeImplementationProvider_recursive', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getImplementationsAtPosition(languageFeaturesService.implementationProvider, model, position, true, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29Ub1N5bWJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9nb3RvU3ltYm9sL2Jyb3dzZXIvZ29Ub1N5bWJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBS3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUV2RCxTQUFTLHlCQUF5QixDQUFDLFdBQXVCLEVBQUUsR0FBaUI7SUFDNUUsdUZBQXVGO0lBQ3ZGLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUMvQyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCx1REFBdUQ7SUFDdkQsSUFBSSxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLDBCQUEwQixDQUFDLEVBQUUsQ0FBQztRQUM3SCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxLQUFL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