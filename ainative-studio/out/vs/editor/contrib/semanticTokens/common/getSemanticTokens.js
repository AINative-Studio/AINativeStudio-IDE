/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { URI } from '../../../../base/common/uri.js';
import { IModelService } from '../../../common/services/model.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { assertType } from '../../../../base/common/types.js';
import { encodeSemanticTokensDto } from '../../../common/services/semanticTokensDto.js';
import { Range } from '../../../common/core/range.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
export function isSemanticTokens(v) {
    return v && !!(v.data);
}
export function isSemanticTokensEdits(v) {
    return v && Array.isArray(v.edits);
}
export class DocumentSemanticTokensResult {
    constructor(provider, tokens, error) {
        this.provider = provider;
        this.tokens = tokens;
        this.error = error;
    }
}
export function hasDocumentSemanticTokensProvider(registry, model) {
    return registry.has(model);
}
function getDocumentSemanticTokensProviders(registry, model) {
    const groups = registry.orderedGroups(model);
    return (groups.length > 0 ? groups[0] : []);
}
export async function getDocumentSemanticTokens(registry, model, lastProvider, lastResultId, token) {
    const providers = getDocumentSemanticTokensProviders(registry, model);
    // Get tokens from all providers at the same time.
    const results = await Promise.all(providers.map(async (provider) => {
        let result;
        let error = null;
        try {
            result = await provider.provideDocumentSemanticTokens(model, (provider === lastProvider ? lastResultId : null), token);
        }
        catch (err) {
            error = err;
            result = null;
        }
        if (!result || (!isSemanticTokens(result) && !isSemanticTokensEdits(result))) {
            result = null;
        }
        return new DocumentSemanticTokensResult(provider, result, error);
    }));
    // Try to return the first result with actual tokens or
    // the first result which threw an error (!!)
    for (const result of results) {
        if (result.error) {
            throw result.error;
        }
        if (result.tokens) {
            return result;
        }
    }
    // Return the first result, even if it doesn't have tokens
    if (results.length > 0) {
        return results[0];
    }
    return null;
}
function _getDocumentSemanticTokensProviderHighestGroup(registry, model) {
    const result = registry.orderedGroups(model);
    return (result.length > 0 ? result[0] : null);
}
class DocumentRangeSemanticTokensResult {
    constructor(provider, tokens) {
        this.provider = provider;
        this.tokens = tokens;
    }
}
export function hasDocumentRangeSemanticTokensProvider(providers, model) {
    return providers.has(model);
}
function getDocumentRangeSemanticTokensProviders(providers, model) {
    const groups = providers.orderedGroups(model);
    return (groups.length > 0 ? groups[0] : []);
}
export async function getDocumentRangeSemanticTokens(registry, model, range, token) {
    const providers = getDocumentRangeSemanticTokensProviders(registry, model);
    // Get tokens from all providers at the same time.
    const results = await Promise.all(providers.map(async (provider) => {
        let result;
        try {
            result = await provider.provideDocumentRangeSemanticTokens(model, range, token);
        }
        catch (err) {
            onUnexpectedExternalError(err);
            result = null;
        }
        if (!result || !isSemanticTokens(result)) {
            result = null;
        }
        return new DocumentRangeSemanticTokensResult(provider, result);
    }));
    // Try to return the first result with actual tokens
    for (const result of results) {
        if (result.tokens) {
            return result;
        }
    }
    // Return the first result, even if it doesn't have tokens
    if (results.length > 0) {
        return results[0];
    }
    return null;
}
CommandsRegistry.registerCommand('_provideDocumentSemanticTokensLegend', async (accessor, ...args) => {
    const [uri] = args;
    assertType(uri instanceof URI);
    const model = accessor.get(IModelService).getModel(uri);
    if (!model) {
        return undefined;
    }
    const { documentSemanticTokensProvider } = accessor.get(ILanguageFeaturesService);
    const providers = _getDocumentSemanticTokensProviderHighestGroup(documentSemanticTokensProvider, model);
    if (!providers) {
        // there is no provider => fall back to a document range semantic tokens provider
        return accessor.get(ICommandService).executeCommand('_provideDocumentRangeSemanticTokensLegend', uri);
    }
    return providers[0].getLegend();
});
CommandsRegistry.registerCommand('_provideDocumentSemanticTokens', async (accessor, ...args) => {
    const [uri] = args;
    assertType(uri instanceof URI);
    const model = accessor.get(IModelService).getModel(uri);
    if (!model) {
        return undefined;
    }
    const { documentSemanticTokensProvider } = accessor.get(ILanguageFeaturesService);
    if (!hasDocumentSemanticTokensProvider(documentSemanticTokensProvider, model)) {
        // there is no provider => fall back to a document range semantic tokens provider
        return accessor.get(ICommandService).executeCommand('_provideDocumentRangeSemanticTokens', uri, model.getFullModelRange());
    }
    const r = await getDocumentSemanticTokens(documentSemanticTokensProvider, model, null, null, CancellationToken.None);
    if (!r) {
        return undefined;
    }
    const { provider, tokens } = r;
    if (!tokens || !isSemanticTokens(tokens)) {
        return undefined;
    }
    const buff = encodeSemanticTokensDto({
        id: 0,
        type: 'full',
        data: tokens.data
    });
    if (tokens.resultId) {
        provider.releaseDocumentSemanticTokens(tokens.resultId);
    }
    return buff;
});
CommandsRegistry.registerCommand('_provideDocumentRangeSemanticTokensLegend', async (accessor, ...args) => {
    const [uri, range] = args;
    assertType(uri instanceof URI);
    const model = accessor.get(IModelService).getModel(uri);
    if (!model) {
        return undefined;
    }
    const { documentRangeSemanticTokensProvider } = accessor.get(ILanguageFeaturesService);
    const providers = getDocumentRangeSemanticTokensProviders(documentRangeSemanticTokensProvider, model);
    if (providers.length === 0) {
        // no providers
        return undefined;
    }
    if (providers.length === 1) {
        // straight forward case, just a single provider
        return providers[0].getLegend();
    }
    if (!range || !Range.isIRange(range)) {
        // if no range is provided, we cannot support multiple providers
        // as we cannot fall back to the one which would give results
        // => return the first legend for backwards compatibility and print a warning
        console.warn(`provideDocumentRangeSemanticTokensLegend might be out-of-sync with provideDocumentRangeSemanticTokens unless a range argument is passed in`);
        return providers[0].getLegend();
    }
    const result = await getDocumentRangeSemanticTokens(documentRangeSemanticTokensProvider, model, Range.lift(range), CancellationToken.None);
    if (!result) {
        return undefined;
    }
    return result.provider.getLegend();
});
CommandsRegistry.registerCommand('_provideDocumentRangeSemanticTokens', async (accessor, ...args) => {
    const [uri, range] = args;
    assertType(uri instanceof URI);
    assertType(Range.isIRange(range));
    const model = accessor.get(IModelService).getModel(uri);
    if (!model) {
        return undefined;
    }
    const { documentRangeSemanticTokensProvider } = accessor.get(ILanguageFeaturesService);
    const result = await getDocumentRangeSemanticTokens(documentRangeSemanticTokensProvider, model, Range.lift(range), CancellationToken.None);
    if (!result || !result.tokens) {
        // there is no provider or it didn't return tokens
        return undefined;
    }
    return encodeSemanticTokensDto({
        id: 0,
        type: 'full',
        data: result.tokens.data
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0U2VtYW50aWNUb2tlbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc2VtYW50aWNUb2tlbnMvY29tbW9uL2dldFNlbWFudGljVG9rZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUdyRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN4RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFeEYsTUFBTSxVQUFVLGdCQUFnQixDQUFDLENBQXVDO0lBQ3ZFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFrQixDQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUMsQ0FBQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxDQUF1QztJQUM1RSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUF1QixDQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDM0QsQ0FBQztBQUVELE1BQU0sT0FBTyw0QkFBNEI7SUFDeEMsWUFDaUIsUUFBd0Ms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