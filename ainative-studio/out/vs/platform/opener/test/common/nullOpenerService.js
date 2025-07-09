/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
export const NullOpenerService = Object.freeze({
    _serviceBrand: undefined,
    registerOpener() { return Disposable.None; },
    registerValidator() { return Disposable.None; },
    registerExternalUriResolver() { return Disposable.None; },
    setDefaultExternalOpener() { },
    registerExternalOpener() { return Disposable.None; },
    async open() { return false; },
    async resolveExternalUri(uri) { return { resolved: uri, dispose() { } }; },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVsbE9wZW5lclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vb3BlbmVyL3Rlc3QvY29tbW9uL251bGxPcGVuZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUlsRSxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFpQjtJQUM5RCxhQUFhLEVBQUUsU0FBUztJQUN4QixjQUFjLEtBQUssT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM1QyxpQkFBaUIsS0FBSyxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9DLDJCQUEyQixLQUFLLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDekQsd0JBQXdCLEtBQUssQ0FBQztJQUM5QixzQkFBc0IsS0FBSyxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3BELEtBQUssQ0FBQyxJQUFJLEtBQUssT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzlCLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxHQUFRLElBQUksT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztDQUMvRSxDQUFDLENBQUMifQ==