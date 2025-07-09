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
import { FilePromptContentProvider } from '../contentProviders/filePromptContentsProvider.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
/**
 * Class capable of parsing prompt syntax out of a provided file,
 * including all the nested child file references it may have.
 */
let FilePromptParser = class FilePromptParser extends BasePromptParser {
    constructor(uri, seenReferences = [], initService, logService) {
        const contentsProvider = initService.createInstance(FilePromptContentProvider, uri);
        super(contentsProvider, seenReferences, initService, logService);
        this._register(contentsProvider);
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `file-prompt:${this.uri.path}`;
    }
};
FilePromptParser = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILogService)
], FilePromptParser);
export { FilePromptParser };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVByb21wdFBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy9maWxlUHJvbXB0UGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRXpELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUV6Rzs7O0dBR0c7QUFDSSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLGdCQUEyQztJQUNoRixZQUNDLEdBQVEsRUFDUixpQkFBMkIsRUFBRSxFQUNOLFdBQWtDLEVBQzVDLFVBQXVCO1FBRXBDLE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNwRixLQUFLLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUVqRSxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLGVBQWUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0NBQ0QsQ0FBQTtBQW5CWSxnQkFBZ0I7SUFJMUIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFdBQVcsQ0FBQTtHQUxELGdCQUFnQixDQW1CNUIifQ==