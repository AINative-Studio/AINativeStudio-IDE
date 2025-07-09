/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as glob from '../../../../../base/common/glob.js';
import { URI } from '../../../../../base/common/uri.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { isDocumentExcludePattern } from '../../common/notebookCommon.js';
import { INotebookKernelService } from '../../common/notebookKernelService.js';
import { INotebookService } from '../../common/notebookService.js';
CommandsRegistry.registerCommand('_resolveNotebookContentProvider', (accessor) => {
    const notebookService = accessor.get(INotebookService);
    const contentProviders = notebookService.getContributedNotebookTypes();
    return contentProviders.map(provider => {
        const filenamePatterns = provider.selectors.map(selector => {
            if (typeof selector === 'string') {
                return selector;
            }
            if (glob.isRelativePattern(selector)) {
                return selector;
            }
            if (isDocumentExcludePattern(selector)) {
                return {
                    include: selector.include,
                    exclude: selector.exclude
                };
            }
            return null;
        }).filter(pattern => pattern !== null);
        return {
            viewType: provider.id,
            displayName: provider.displayName,
            filenamePattern: filenamePatterns,
            options: {
                transientCellMetadata: provider.options.transientCellMetadata,
                transientDocumentMetadata: provider.options.transientDocumentMetadata,
                transientOutputs: provider.options.transientOutputs
            }
        };
    });
});
CommandsRegistry.registerCommand('_resolveNotebookKernels', async (accessor, args) => {
    const notebookKernelService = accessor.get(INotebookKernelService);
    const uri = URI.revive(args.uri);
    const kernels = notebookKernelService.getMatchingKernel({ uri, notebookType: args.viewType });
    return kernels.all.map(provider => ({
        id: provider.id,
        label: provider.label,
        description: provider.description,
        detail: provider.detail,
        isPreferred: false, // todo@jrieken,@rebornix
        preloads: provider.preloadUris,
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvYXBpQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdkYsT0FBTyxFQUFFLHdCQUF3QixFQUFvRCxNQUFNLGdDQUFnQyxDQUFDO0FBQzVILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRW5FLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDLFFBQVEsRUFLekUsRUFBRTtJQUNMLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQW1CLGdCQUFnQixDQUFDLENBQUM7SUFDekUsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztJQUN2RSxPQUFPLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUN0QyxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzFELElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ2xDLE9BQU8sUUFBUSxDQUFDO1lBQ2pCLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxPQUFPLFFBQVEsQ0FBQztZQUNqQixDQUFDO1lBRUQsSUFBSSx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUN4QyxPQUFPO29CQUNOLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztvQkFDekIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO2lCQUN6QixDQUFDO1lBQ0gsQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBOEgsQ0FBQztRQUVwSyxPQUFPO1lBQ04sUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1lBQ3JCLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVztZQUNqQyxlQUFlLEVBQUUsZ0JBQWdCO1lBQ2pDLE9BQU8sRUFBRTtnQkFDUixxQkFBcUIsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLHFCQUFxQjtnQkFDN0QseUJBQXlCLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUI7Z0JBQ3JFLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCO2FBQ25EO1NBQ0QsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMseUJBQXlCLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUc1RSxFQU9JLEVBQUU7SUFDTixNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUNuRSxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFvQixDQUFDLENBQUM7SUFDbEQsTUFBTSxPQUFPLEdBQUcscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBRTlGLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLEVBQUUsRUFBRSxRQUFRLENBQUMsRUFBRTtRQUNmLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztRQUNyQixXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVc7UUFDakMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO1FBQ3ZCLFdBQVcsRUFBRSxLQUFLLEVBQUUseUJBQXlCO1FBQzdDLFFBQVEsRUFBRSxRQUFRLENBQUMsV0FBVztLQUM5QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIn0=