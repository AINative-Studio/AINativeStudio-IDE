/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
export const ICommunityMarketplace = createDecorator('communityMarketplace');
/**
 * Community marketplace specific error
 */
export class CommunityMarketplaceError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'CommunityMarketplaceError';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbXVuaXR5TWFya2V0cGxhY2VUeXBlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL21hcmtldHBsYWNlL2NvbW11bml0eU1hcmtldHBsYWNlVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBR2hHLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBd0Isc0JBQXNCLENBQUMsQ0FBQztBQWtIcEc7O0dBRUc7QUFDSCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsS0FBSztJQUNuRCxZQUNDLE9BQWUsRUFDQyxJQUFrRztRQUVsSCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFGQyxTQUFJLEdBQUosSUFBSSxDQUE4RjtRQUdsSCxJQUFJLENBQUMsSUFBSSxHQUFHLDJCQUEyQixDQUFDO0lBQ3pDLENBQUM7Q0FDRCJ9