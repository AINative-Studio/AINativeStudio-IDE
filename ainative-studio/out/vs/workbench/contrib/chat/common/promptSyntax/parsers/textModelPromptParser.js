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
import { BasePromptParser } from './basePromptParser.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { TextModelContentsProvider } from '../contentProviders/textModelContentsProvider.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
/**
 * Class capable of parsing prompt syntax out of a provided text model,
 * including all the nested child file references it may have.
 */
let TextModelPromptParser = class TextModelPromptParser extends BasePromptParser {
    constructor(model, seenReferences = [], initService, logService) {
        const contentsProvider = initService.createInstance(TextModelContentsProvider, model);
        super(contentsProvider, seenReferences, initService, logService);
        this._register(contentsProvider);
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `text-model-prompt:${this.uri.path}`;
    }
};
TextModelPromptParser = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILogService)
], TextModelPromptParser);
export { TextModelPromptParser };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsUHJvbXB0UGFyc2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL3RleHRNb2RlbFByb21wdFBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUV6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFekc7OztHQUdHO0FBQ0ksSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxnQkFBMkM7SUFDckYsWUFDQyxLQUFpQixFQUNqQixpQkFBMkIsRUFBRSxFQUNOLFdBQWtDLEVBQzVDLFVBQXVCO1FBRXBDLE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV0RixLQUFLLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUVqRSxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLHFCQUFxQixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzdDLENBQUM7Q0FDRCxDQUFBO0FBcEJZLHFCQUFxQjtJQUkvQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsV0FBVyxDQUFBO0dBTEQscUJBQXFCLENBb0JqQyJ9