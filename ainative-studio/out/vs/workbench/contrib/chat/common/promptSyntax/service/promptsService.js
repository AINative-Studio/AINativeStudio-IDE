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
import { assert } from '../../../../../../base/common/assert.js';
import { PromptFilesLocator } from '../utils/promptFilesLocator.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ObjectCache } from '../../../../../../base/common/objectCache.js';
import { TextModelPromptParser } from '../parsers/textModelPromptParser.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IUserDataProfileService } from '../../../../../services/userDataProfile/common/userDataProfile.js';
/**
 * Provides prompt services.
 */
let PromptsService = class PromptsService extends Disposable {
    constructor(initService, userDataService) {
        super();
        this.initService = initService;
        this.userDataService = userDataService;
        /**
         * Prompt files locator utility.
         */
        this.fileLocator = this.initService.createInstance(PromptFilesLocator);
        // the factory function below creates a new prompt parser object
        // for the provided model, if no active non-disposed parser exists
        this.cache = this._register(new ObjectCache((model) => {
            /**
             * Note! When/if shared with "file" prompts, the `seenReferences` array below must be taken into account.
             * Otherwise consumers will either see incorrect failing or incorrect successful results, based on their
             * use case, timing of their calls to the {@link getSyntaxParserFor} function, and state of this service.
             */
            const parser = initService.createInstance(TextModelPromptParser, model, []);
            parser.start();
            // this is a sanity check and the contract of the object cache,
            // we must return a non-disposed object from this factory function
            parser.assertNotDisposed('Created prompt parser must not be disposed.');
            return parser;
        }));
    }
    /**
     * @throws {Error} if:
     * 	- the provided model is disposed
     * 	- newly created parser is disposed immediately on initialization.
     * 	  See factory function in the {@link constructor} for more info.
     */
    getSyntaxParserFor(model) {
        assert(!model.isDisposed(), 'Cannot create a prompt syntax parser for a disposed model.');
        return this.cache.get(model);
    }
    async listPromptFiles() {
        const userLocations = [this.userDataService.currentProfile.promptsHome];
        const prompts = await Promise.all([
            this.fileLocator.listFilesIn(userLocations)
                .then(withType('user')),
            this.fileLocator.listFiles()
                .then(withType('local')),
        ]);
        return prompts.flat();
    }
    getSourceFolders(type) {
        // sanity check to make sure we don't miss a new
        // prompt type that could be added in the future
        assert(type === 'local' || type === 'user', `Unknown prompt type '${type}'.`);
        const prompts = (type === 'user')
            ? [this.userDataService.currentProfile.promptsHome]
            : this.fileLocator.getConfigBasedSourceFolders();
        return prompts.map(addType(type));
    }
};
PromptsService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IUserDataProfileService)
], PromptsService);
export { PromptsService };
/**
 * Utility to add a provided prompt `type` to a prompt URI.
 */
const addType = (type) => {
    return (uri) => {
        return { uri, type: type };
    };
};
/**
 * Utility to add a provided prompt `type` to a list of prompt URIs.
 */
const withType = (type) => {
    return (uris) => {
        return uris
            .map(addType(type));
    };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3NlcnZpY2UvcHJvbXB0c1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFFNUc7O0dBRUc7QUFDSSxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFlLFNBQVEsVUFBVTtJQWE3QyxZQUN3QixXQUFtRCxFQUNqRCxlQUF5RDtRQUVsRixLQUFLLEVBQUUsQ0FBQztRQUhnQyxnQkFBVyxHQUFYLFdBQVcsQ0FBdUI7UUFDaEMsb0JBQWUsR0FBZixlQUFlLENBQXlCO1FBUG5GOztXQUVHO1FBQ2MsZ0JBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBUWxGLGdFQUFnRTtRQUNoRSxrRUFBa0U7UUFDbEUsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMxQixJQUFJLFdBQVcsQ0FBQyxDQUFDLEtBQUssRUFBRSxF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