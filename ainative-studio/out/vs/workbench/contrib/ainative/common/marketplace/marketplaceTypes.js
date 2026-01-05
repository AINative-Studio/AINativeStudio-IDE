/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Error thrown during marketplace operations
 */
export class MarketplaceError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'MarketplaceError';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2VUeXBlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL21hcmtldHBsYWNlL21hcmtldHBsYWNlVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFtRmhHOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGdCQUFpQixTQUFRLEtBQUs7SUFDMUMsWUFDQyxPQUFlLEVBQ0MsSUFBcUY7UUFFckcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRkMsU0FBSSxHQUFKLElBQUksQ0FBaUY7UUFHckcsSUFBSSxDQUFDLElBQUksR0FBRyxrQkFBa0IsQ0FBQztJQUNoQyxDQUFDO0NBQ0QifQ==