/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IWebContentExtractorService = createDecorator('IWebContentExtractorService');
export const ISharedWebContentExtractorService = createDecorator('ISharedWebContentExtractorService');
/**
 * A service that extracts web content from a given URI.
 * This is a placeholder implementation that does not perform any actual extraction.
 * It's intended to be used on platforms where web content extraction is not supported such as in the browser.
 */
export class NullWebContentExtractorService {
    extract(_uri) {
        throw new Error('Not implemented');
    }
}
export class NullSharedWebContentExtractorService {
    readImage(_uri, _token) {
        throw new Error('Not implemented');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQ29udGVudEV4dHJhY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93ZWJDb250ZW50RXh0cmFjdG9yL2NvbW1vbi93ZWJDb250ZW50RXh0cmFjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RSxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxlQUFlLENBQThCLDZCQUE2QixDQUFDLENBQUM7QUFDdkgsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsZUFBZSxDQUFvQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBZ0J6STs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLDhCQUE4QjtJQUcxQyxPQUFPLENBQUMsSUFBVztRQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG9DQUFvQztJQUVoRCxTQUFTLENBQUMsSUFBUyxFQUFFLE1BQXlCO1FBQzdDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0NBQ0QifQ==