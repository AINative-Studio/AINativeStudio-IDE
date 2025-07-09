/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AsyncIterableObject } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { registerModelAndPositionCommand } from '../../../browser/editorExtensions.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
export class HoverProviderResult {
    constructor(provider, hover, ordinal) {
        this.provider = provider;
        this.hover = hover;
        this.ordinal = ordinal;
    }
}
/**
 * Does not throw or return a rejected promise (returns undefined instead).
 */
async function executeProvider(provider, ordinal, model, position, token) {
    const result = await Promise
        .resolve(provider.provideHover(model, position, token))
        .catch(onUnexpectedExternalError);
    if (!result || !isValid(result)) {
        return undefined;
    }
    return new HoverProviderResult(provider, result, ordinal);
}
export function getHoverProviderResultsAsAsyncIterable(registry, model, position, token, recursive = false) {
    const providers = registry.ordered(model, recursive);
    const promises = providers.map((provider, index) => executeProvider(provider, index, model, position, token));
    return AsyncIterableObject.fromPromisesResolveOrder(promises).coalesce();
}
export function getHoversPromise(registry, model, position, token, recursive = false) {
    return getHoverProviderResultsAsAsyncIterable(registry, model, position, token, recursive).map(item => item.hover).toPromise();
}
registerModelAndPositionCommand('_executeHoverProvider', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    return getHoversPromise(languageFeaturesService.hoverProvider, model, position, CancellationToken.None);
});
registerModelAndPositionCommand('_executeHoverProvider_recursive', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    return getHoversPromise(languageFeaturesService.hoverProvider, model, position, CancellationToken.None, true);
});
function isValid(result) {
    const hasRange = (typeof result.range !== 'undefined');
    const hasHtmlContent = typeof result.contents !== 'undefined' && result.contents && result.contents.length > 0;
    return hasRange && hasHtmlContent;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0SG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvYnJvd3Nlci9nZXRIb3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUt2RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUV4RixNQUFNLE9BQU8sbUJBQW1CO0lBQy9CLFlBQ2lCLFFBQXVCLEVBQ3ZCLEtBQVksRUFDWixPQUFlO1FBRmYsYUFBUSxHQUFSLFFBQVEsQ0FBZTtRQUN2QixVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osWUFBTyxHQUFQLE9BQU8sQ0FBUTtJQUM1QixDQUFDO0NBQ0w7QUFFRDs7R0FFRztBQUNILEtBQUssVUFBVSxlQUFlLENBQUMsUUFBdUIsRUFBRSxPQUFlLEVBQUUsS0FBaUIsRUFBRSxRQUFrQixFQUFFLEtBQXdCO0lBQ3ZJLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTztTQUMxQixPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3RELEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQ25DLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUNqQyxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBQ0QsT0FBTyxJQUFJLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDM0QsQ0FBQztBQUVELE1BQU0sVUFBVSxzQ0FBc0MsQ0FBQyxRQUFnRCxFQUFFLEtBQWlCLEVBQUUsUUFBa0IsRUFBRSxLQUF3QixFQUFFLFNBQVMsR0FBRyxLQUFLO0lBQzFMLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3JELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDOUcsT0FBTyxtQkFBbUIsQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUMxRSxDQUFDO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUFDLFFBQWdELEVBQUUsS0FBaUIsRUFBRSxRQUFrQixFQUFFLEtBQXdCLEVBQUUsU0FBUyxHQUFHLEtBQUs7SUFDcEssT0FBTyxzQ0FBc0MsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2hJLENBQUM7QUFFRCwrQkFBK0IsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFvQixFQUFFO0lBQ3hHLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3ZFLE9BQU8sZ0JBQWdCLENBQUMsdUJBQXVCLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDekcsQ0FBQyxDQUFDLENBQUM7QUFFSCwrQkFBK0IsQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFvQixFQUFFO0lBQ2xILE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3ZFLE9BQU8sZ0JBQWdCLENBQUMsdUJBQXVCLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQy9HLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBUyxPQUFPLENBQUMsTUFBYTtJQUM3QixNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQU8sTUFBTSxDQUFDLEtBQUssS0FBSyxXQUFXLENBQUMsQ0FBQztJQUN2RCxNQUFNLGNBQWMsR0FBRyxPQUFPLE1BQU0sQ0FBQyxRQUFRLEtBQUssV0FBVyxJQUFJLE1BQU0sQ0FBQyxRQUFRLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQy9HLE9BQU8sUUFBUSxJQUFJLGNBQWMsQ0FBQztBQUNuQyxDQUFDIn0=