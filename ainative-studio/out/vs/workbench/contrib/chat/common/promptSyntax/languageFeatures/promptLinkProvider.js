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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0TGlua1Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9sYW5ndWFnZUZlYXR1cmVzL3Byb21wdExpbmtQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHcEYsT0FBTyxFQUFtQyxVQUFVLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUV4Rzs7R0FFRztBQUNJLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQUNqRCxZQUNtQyxjQUErQixFQUN0QixlQUF5QztRQUVwRixLQUFLLEVBQUUsQ0FBQztRQUgwQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDdEIsb0JBQWUsR0FBZixlQUFlLENBQTBCO1FBSXBGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDckYsQ0FBQztJQUVEOztPQUVHO0lBQ0ksS0FBSyxDQUFDLFlBQVksQ0FDeEIsS0FBaUIsRUFDakIsS0FBd0I7UUFFeEIsTUFBTSxDQUNMLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUM5QixJQUFJLGlCQUFpQixFQUFFLENBQ3ZCLENBQUM7UUFFRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FDTCxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQ2hCLHFDQUFxQyxDQUNyQyxDQUFDO1FBRUYsbURBQW1EO1FBQ25ELDhDQUE4QztRQUM5QyxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsTUFBTSxNQUFNO2FBQ2pDLEtBQUssRUFBRTthQUNQLE9BQU8sRUFBRSxDQUFDO1FBRVosdURBQXVEO1FBQ3ZELE1BQU0sQ0FDTCxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFDOUIsSUFBSSxpQkFBaUIsRUFBRSxDQUN2QixDQUFDO1FBRUYsaURBQWlEO1FBQ2pELE1BQU0sS0FBSyxHQUFZLFVBQVU7YUFDL0IsTUFBTSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDckIsTUFBTSxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsR0FBRyxTQUFTLENBQUM7WUFDaEQsSUFBSSxDQUFDLGNBQWMsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDbEMsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBRUQsNENBQTRDO1lBQzVDLElBQUksY0FBYyxZQUFZLGVBQWUsRUFBRSxDQUFDO2dCQUMvQyxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7WUFFRCxPQUFPLGNBQWMsWUFBWSxhQUFhLENBQUM7UUFDaEQsQ0FBQyxDQUFDO2FBQ0QsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDbEIsTUFBTSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxTQUFTLENBQUM7WUFFckMsa0RBQWtEO1lBQ2xELGFBQWEsQ0FDWixTQUFTLEVBQ1QsNkJBQTZCLENBQzdCLENBQUM7WUFFRixPQUFPO2dCQUNOLEtBQUssRUFBRSxTQUFTO2dCQUNoQixHQUFHLEVBQUUsR0FBRzthQUNSLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVKLE9BQU87WUFDTixLQUFLO1NBQ0wsQ0FBQztJQUNILENBQUM7Q0FDRCxDQUFBO0FBMUVZLGtCQUFrQjtJQUU1QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsd0JBQXdCLENBQUE7R0FIZCxrQkFBa0IsQ0EwRTlCOztBQUVELG9EQUFvRDtBQUNwRCxRQUFRLENBQUMsRUFBRSxDQUFrQyxVQUFVLENBQUMsU0FBUyxDQUFDO0tBQ2hFLDZCQUE2QixDQUFDLGtCQUFrQixvQ0FBNEIsQ0FBQyJ9