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
import { LANGUAGE_SELECTOR } from '../constants.js';
import { IPromptsService } from '../service/types.js';
import { assert } from '../../../../../../base/common/assert.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { FolderReference, NotPromptFile } from '../../promptFileReferenceErrors.js';
import { Extensions } from '../../../../../common/contributions.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
/**
 * Provides link references for prompt files.
 */
let PromptLinkProvider = class PromptLinkProvider extends Disposable {
    constructor(promptsService, languageService) {
        super();
        this.promptsService = promptsService;
        this.languageService = languageService;
        this._register(this.languageService.linkProvider.register(LANGUAGE_SELECTOR, this));
    }
    /**
     * Provide list of links for the provided text model.
     */
    async provideLinks(model, token) {
        assert(!token.isCancellationRequested, new CancellationError());
        const parser = this.promptsService.getSyntaxParserFor(model);
        assert(!parser.disposed, 'Prompt parser must not be disposed.');
        // start the parser in case it was not started yet,
        // and wait for it to settle to a final result
        const { references } = await parser
            .start()
            .settled();
        // validate that the cancellation was not yet requested
        assert(!token.isCancellationRequested, new CancellationError());
        // filter out references that are not valid links
        const links = references
            .filter((reference) => {
            const { errorCondition, linkRange } = reference;
            if (!errorCondition && linkRange) {
                return true;
            }
            // don't provide links for folder references
            if (errorCondition instanceof FolderReference) {
                return false;
            }
            return errorCondition instanceof NotPromptFile;
        })
            .map((reference) => {
            const { uri, linkRange } = reference;
            // must always be true because of the filter above
            assertDefined(linkRange, 'Link range must be defined.');
            return {
                range: linkRange,
                url: uri,
            };
        });
        return {
            links,
        };
    }
};
PromptLinkProvider = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageFeaturesService)
], PromptLinkProvider);
export { PromptLinkProvider };
// register the provider as a workbench contribution
Registry.as(Extensions.Workbench)
    .registerWorkbenchContribution(PromptLinkProvider, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0TGlua1Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlRmVhdHVyZXMvcHJvbXB0TGlua1Byb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUdwRixPQUFPLEVBQW1DLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRXhHOztHQUVHO0FBQ0ksSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO0lBQ2pELFlBQ21DLGNBQStCLEVBQ3RCLGVBQXlDO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBSDBCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUN0QixvQkFBZSxHQUFmLGVBQWUsQ0FBMEI7UUFJcEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxLQUFLLENBQUMsWUFBWSxDQUN4QixLQUFpQixFQUNqQixLQUF3QjtRQUV4QixNQUFNLENBQ0wsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQzlCLElBQUksaUJBQWlCLEVBQUUsQ0FDdkIsQ0FBQztRQUVGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUNMLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFDaEIscUNBQXFDLENBQ3JDLENBQUM7UUFFRixtREFBbUQ7UUFDbkQsOENBQThDO1FBQzlDLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxNQUFNLE1BQU07YUFDakMsS0FBSyxFQUFFO2FBQ1AsT0FBTyxFQUFFLENBQUM7UUFFWix1REFBdUQ7UUFDdkQsTUFBTSxDQUNMLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUM5QixJQUFJLGlCQUFpQixFQUFFLENBQ3ZCLENBQUM7UUFFRixpREFBaUQ7UUFDakQsTUFBTSxLQUFLLEdBQVksVUFBVTthQUMvQixNQUFNLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtZQUNyQixNQUFNLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxHQUFHLFNBQVMsQ0FBQztZQUNoRCxJQUFJLENBQUMsY0FBYyxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNsQyxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFFRCw0Q0FBNEM7WUFDNUMsSUFBSSxjQUFjLFlBQVksZUFBZSxFQUFFLENBQUM7Z0JBQy9DLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztZQUVELE9BQU8sY0FBYyxZQUFZLGFBQWEsQ0FBQztRQUNoRCxDQUFDLENBQUM7YUFDRCxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtZQUNsQixNQUFNLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLFNBQVMsQ0FBQztZQUVyQyxrREFBa0Q7WUFDbEQsYUFBYSxDQUNaLFNBQVMsRUFDVCw2QkFBNkIsQ0FDN0IsQ0FBQztZQUVGLE9BQU87Z0JBQ04sS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLEdBQUcsRUFBRSxHQUFHO2FBQ1IsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTztZQUNOLEtBQUs7U0FDTCxDQUFDO0lBQ0gsQ0FBQztDQUNELENBQUE7QUExRVksa0JBQWtCO0lBRTVCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSx3QkFBd0IsQ0FBQTtHQUhkLGtCQUFrQixDQTBFOUI7O0FBRUQsb0RBQW9EO0FBQ3BELFFBQVEsQ0FBQyxFQUFFLENBQWtDLFVBQVUsQ0FBQyxTQUFTLENBQUM7S0FDaEUsNkJBQTZCLENBQUMsa0JBQWtCLG9DQUE0QixDQUFDIn0=