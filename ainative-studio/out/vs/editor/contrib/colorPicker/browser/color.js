/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { illegalArgument, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { IModelService } from '../../../common/services/model.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { DefaultDocumentColorProvider } from './defaultDocumentColorProvider.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
export async function getColors(colorProviderRegistry, model, token, defaultColorDecoratorsEnablement = 'auto') {
    return _findColorData(new ColorDataCollector(), colorProviderRegistry, model, token, defaultColorDecoratorsEnablement);
}
export function getColorPresentations(model, colorInfo, provider, token) {
    return Promise.resolve(provider.provideColorPresentations(model, colorInfo, token));
}
class ColorDataCollector {
    constructor() { }
    async compute(provider, model, token, colors) {
        const documentColors = await provider.provideDocumentColors(model, token);
        if (Array.isArray(documentColors)) {
            for (const colorInfo of documentColors) {
                colors.push({ colorInfo, provider });
            }
        }
        return Array.isArray(documentColors);
    }
}
export class ExtColorDataCollector {
    constructor() { }
    async compute(provider, model, token, colors) {
        const documentColors = await provider.provideDocumentColors(model, token);
        if (Array.isArray(documentColors)) {
            for (const colorInfo of documentColors) {
                colors.push({ range: colorInfo.range, color: [colorInfo.color.red, colorInfo.color.green, colorInfo.color.blue, colorInfo.color.alpha] });
            }
        }
        return Array.isArray(documentColors);
    }
}
export class ColorPresentationsCollector {
    constructor(colorInfo) {
        this.colorInfo = colorInfo;
    }
    async compute(provider, model, _token, colors) {
        const documentColors = await provider.provideColorPresentations(model, this.colorInfo, CancellationToken.None);
        if (Array.isArray(documentColors)) {
            colors.push(...documentColors);
        }
        return Array.isArray(documentColors);
    }
}
export async function _findColorData(collector, colorProviderRegistry, model, token, defaultColorDecoratorsEnablement) {
    let validDocumentColorProviderFound = false;
    let defaultProvider;
    const colorData = [];
    const documentColorProviders = colorProviderRegistry.ordered(model);
    for (let i = documentColorProviders.length - 1; i >= 0; i--) {
        const provider = documentColorProviders[i];
        if (defaultColorDecoratorsEnablement !== 'always' && provider instanceof DefaultDocumentColorProvider) {
            defaultProvider = provider;
        }
        else {
            try {
                if (await collector.compute(provider, model, token, colorData)) {
                    validDocumentColorProviderFound = true;
                }
            }
            catch (e) {
                onUnexpectedExternalError(e);
            }
        }
    }
    if (validDocumentColorProviderFound) {
        return colorData;
    }
    if (defaultProvider && defaultColorDecoratorsEnablement !== 'never') {
        await collector.compute(defaultProvider, model, token, colorData);
        return colorData;
    }
    return [];
}
export function _setupColorCommand(accessor, resource) {
    const { colorProvider: colorProviderRegistry } = accessor.get(ILanguageFeaturesService);
    const model = accessor.get(IModelService).getModel(resource);
    if (!model) {
        throw illegalArgument();
    }
    const defaultColorDecoratorsEnablement = accessor.get(IConfigurationService).getValue('editor.defaultColorDecorators', { resource });
    return { model, colorProviderRegistry, defaultColorDecoratorsEnablement };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29sb3JQaWNrZXIvYnJvd3Nlci9jb2xvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFLL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXhGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBR25HLE1BQU0sQ0FBQyxLQUFLLFVBQVUsU0FBUyxDQUFDLHFCQUFxRSxFQUFFLEtBQWlCLEVBQUUsS0FBd0IsRUFBRSxtQ0FBZ0UsTUFBTTtJQUN6TixPQUFPLGNBQWMsQ0FBYSxJQUFJLGtCQUFrQixFQUFFLEVBQUUscUJBQXFCLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQ3BJLENBQUM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQUMsS0FBaUIsRUFBRSxTQUE0QixFQUFFLFFBQStCLEVBQUUsS0FBd0I7SUFDL0ksT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDckYsQ0FBQztBQWFELE1BQU0sa0JBQWtCO0lBQ3ZCLGdCQUFnQixDQUFDO0lBQ2pCLEtBQUssQ0FBQyxPQUFPLENB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