/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IMainProcessService = createDecorator('mainProcessService');
/**
 * An implementation of `IMainProcessService` that leverages `IPCServer`.
 */
export class MainProcessService {
    constructor(server, router) {
        this.server = server;
        this.router = router;
    }
    getChannel(channelName) {
        return this.server.getChannel(channelName, this.router);
    }
    registerChannel(channelName, channel) {
        this.server.registerChannel(channelName, channel);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblByb2Nlc3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2lwYy9jb21tb24vbWFpblByb2Nlc3NTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUc5RSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUM7QUFJOUY7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBSTlCLFlBQ1MsTUFBaUIsRUFDakIsTUFBb0I7UUFEcEIsV0FBTSxHQUFOLE1BQU0sQ0FBVztRQUNqQixXQUFNLEdBQU4sTUFBTSxDQUFjO0lBQ3pCLENBQUM7SUFFTCxVQUFVLENBQUMsV0FBbUI7UUFDN0IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRCxlQUFlLENBQUMsV0FBbUIsRUFBRSxPQUErQjtRQUNuRSxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNEIn0=