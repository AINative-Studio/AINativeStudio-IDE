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
import { URI } from '../../../../../../base/common/uri.js';
import { assert } from '../../../../../../base/common/assert.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { FilePromptParser } from '../../../common/promptSyntax/parsers/filePromptParser.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
/**
 * A wrapper class for an `IDynamicVariable` object that that adds functionality
 * to parse nested file references of this variable.
 * See {@link FilePromptParser} for details.
 */
let ChatFileReference = class ChatFileReference extends FilePromptParser {
    /**
     * @throws if the `data` reference is no an instance of `URI`.
     */
    constructor(reference, initService, logService) {
        const { data } = reference;
        assert(data instanceof URI, `Variable data must be an URI, got '${data}'.`);
        super(data, [], initService, logService);
        this.reference = reference;
    }
    /**
     * Note! below are the getters that simply forward to the underlying `IDynamicVariable` object;
     * 		 while we could implement the logic generically using the `Proxy` class here, it's hard
     * 		 to make Typescript to recognize this generic implementation correctly
     */
    get id() {
        return this.reference.id;
    }
    get range() {
        return this.reference.range;
    }
    set range(range) {
        this.reference.range = range;
    }
    get data() {
        return this.uri;
    }
    get prefix() {
        return this.reference.prefix;
    }
    get isFile() {
        return this.reference.isFile;
    }
    get fullName() {
        return this.reference.fullName;
    }
    get icon() {
        return this.reference.icon;
    }
    get modelDescription() {
        return this.reference.modelDescription;
    }
};
ChatFileReference = __decorate([
    __param(1, IInstantiationService),
    __param(2, ILogService)
], ChatFileReference);
export { ChatFileReference };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEZpbGVSZWZlcmVuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29udHJpYi9jaGF0RHluYW1pY1ZhcmlhYmxlcy9jaGF0RmlsZVJlZmVyZW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUV6Rzs7OztHQUlHO0FBQ0ksSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxnQkFBZ0I7SUFDdEQ7O09BRUc7SUFDSCxZQUNpQixTQUEyQixFQUNwQixXQUFrQyxFQUM1QyxVQUF1QjtRQUVwQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsU0FBUyxDQUFDO1FBRTNCLE1BQU0sQ0FDTCxJQUFJLFlBQVksR0FBRyxFQUNuQixzQ0FBc0MsSUFBSSxJQUFJLENBQzlDLENBQUM7UUFFRixLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFYekIsY0FBUyxHQUFULFNBQVMsQ0FBa0I7SUFZNUMsQ0FBQztJQUVEOzs7O09BSUc7SUFFSCxJQUFXLEVBQUU7UUFDWixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFRCxJQUFXLEtBQUs7UUFDZixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO0lBQzdCLENBQUM7SUFFRCxJQUFXLEtBQUssQ0FBQyxLQUFhO1FBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBVyxJQUFJO1FBQ2QsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxJQUFXLE1BQU07UUFDaEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBVyxNQUFNO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7SUFDOUIsQ0FBQztJQUVELElBQVcsUUFBUTtRQUNsQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO0lBQ2hDLENBQUM7SUFFRCxJQUFXLElBQUk7UUFDZCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO0lBQzVCLENBQUM7SUFFRCxJQUFXLGdCQUFnQjtRQUMxQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUM7SUFDeEMsQ0FBQztDQUNELENBQUE7QUE1RFksaUJBQWlCO0lBTTNCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxXQUFXLENBQUE7R0FQRCxpQkFBaUIsQ0E0RDdCIn0=