/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { registerMainProcessRemoteService } from '../../ipc/electron-sandbox/services.js';
export const IExternalTerminalService = createDecorator('externalTerminal');
registerMainProcessRemoteService(IExternalTerminalService, 'externalTerminal');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZXJuYWxUZXJtaW5hbC9lbGVjdHJvbi1zYW5kYm94L2V4dGVybmFsVGVybWluYWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUUxRixNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxlQUFlLENBQTJCLGtCQUFrQixDQUFDLENBQUM7QUFNdEcsZ0NBQWdDLENBQUMsd0JBQXdCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyJ9