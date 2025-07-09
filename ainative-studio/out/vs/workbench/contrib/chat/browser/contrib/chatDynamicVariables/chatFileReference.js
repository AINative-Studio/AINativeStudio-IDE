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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEZpbGVSZWZlcmVuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NvbnRyaWIvY2hhdER5bmFtaWNWYXJpYWJsZXMvY2hhdEZpbGVSZWZlcmVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUdqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFekc7Ozs7R0FJRztBQUNJLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsZ0JBQWdCO0lBQ3REOztPQUVHO0lBQ0gsWUFDaUIsU0FBMkIsRUFDcEIsV0FBa0MsRUFDNUMsVUFBdUI7UUFFcEMsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLFNBQVMsQ0FBQztRQUUzQixNQUFNLENBQ0wsSUFBSSxZQUFZLEdBQUcsRUFDbkIsc0NBQXNDLElBQUksSUFBSSxDQUM5QyxDQUFDO1FBRUYsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBWHpCLGNBQVMsR0FBVCxTQUFTLENBQWtCO0lBWTVDLENBQUM7SUFFRDs7OztPQUlHO0lBRUgsSUFBVyxFQUFFO1FBQ1osT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQztJQUM3QixDQUFDO0lBRUQsSUFBVyxLQUFLLENBQUMsS0FBYTtRQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDOUIsQ0FBQztJQUVELElBQVcsSUFBSTtRQUNkLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNqQixDQUFDO0lBRUQsSUFBVyxNQUFNO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7SUFDOUIsQ0FBQztJQUVELElBQVcsTUFBTTtRQUNoQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO0lBQzlCLENBQUM7SUFFRCxJQUFXLFFBQVE7UUFDbEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztJQUNoQyxDQUFDO0lBRUQsSUFBVyxJQUFJO1FBQ2QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztJQUM1QixDQUFDO0lBRUQsSUFBVyxnQkFBZ0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDO0lBQ3hDLENBQUM7Q0FDRCxDQUFBO0FBNURZLGlCQUFpQjtJQU0zQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsV0FBVyxDQUFBO0dBUEQsaUJBQWlCLENBNEQ3QiJ9