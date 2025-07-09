/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { Server as ChildProcessServer } from '../../../../base/parts/ipc/node/ipc.cp.js';
import { Server as UtilityProcessServer } from '../../../../base/parts/ipc/node/ipc.mp.js';
import { isUtilityProcess } from '../../../../base/parts/sandbox/node/electronTypes.js';
import { UniversalWatcher } from './watcher.js';
let server;
if (isUtilityProcess(process)) {
    server = new UtilityProcessServer();
}
else {
    server = new ChildProcessServer('watcher');
}
const service = new UniversalWatcher();
server.registerChannel('watcher', ProxyChannel.fromService(service, new DisposableStore()));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlck1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvbm9kZS93YXRjaGVyL3dhdGNoZXJNYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDeEUsT0FBTyxFQUFFLE1BQU0sSUFBSSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxNQUFNLElBQUksb0JBQW9CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN4RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFaEQsSUFBSSxNQUF5RCxDQUFDO0FBQzlELElBQUksZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztJQUMvQixNQUFNLEdBQUcsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO0FBQ3JDLENBQUM7S0FBTSxDQUFDO0lBQ1AsTUFBTSxHQUFHLElBQUksa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELE1BQU0sT0FBTyxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztBQUN2QyxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQyJ9