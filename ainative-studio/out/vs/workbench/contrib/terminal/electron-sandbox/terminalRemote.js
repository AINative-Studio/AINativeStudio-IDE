/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { localize2 } from '../../../../nls.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { registerTerminalAction } from '../browser/terminalActions.js';
import { IHistoryService } from '../../../services/history/common/history.js';
export function registerRemoteContributions() {
    registerTerminalAction({
        id: "workbench.action.terminal.newLocal" /* TerminalCommandId.NewLocal */,
        title: localize2('workbench.action.terminal.newLocal', 'Create New Integrated Terminal (Local)'),
        run: async (c, accessor) => {
            const historyService = accessor.get(IHistoryService);
            const remoteAuthorityResolverService = accessor.get(IRemoteAuthorityResolverService);
            const nativeEnvironmentService = accessor.get(INativeEnvironmentService);
            let cwd;
            try {
                const activeWorkspaceRootUri = historyService.getLastActiveWorkspaceRoot(Schemas.vscodeRemote);
                if (activeWorkspaceRootUri) {
                    const canonicalUri = await remoteAuthorityResolverService.getCanonicalURI(activeWorkspaceRootUri);
                    if (canonicalUri.scheme === Schemas.file) {
                        cwd = canonicalUri;
                    }
                }
            }
            catch { }
            if (!cwd) {
                cwd = nativeEnvironmentService.userHome;
            }
            const instance = await c.service.createTerminal({ cwd });
            if (!instance) {
                return Promise.resolve(undefined);
            }
            c.service.setActiveInstance(instance);
            return c.groupService.showPanel(true);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxSZW1vdGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvZWxlY3Ryb24tc2FuZGJveC90ZXJtaW5hbFJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RSxNQUFNLFVBQVUsMkJBQTJCO0lBQzFDLHNCQUFzQixDQUFDO1FBQ3RCLEVBQUUsdUVBQTRCO1FBQzlCLEtBQUssRUFBRSxTQUFTLENBQUMsb0NBQW9DLEVBQUUsd0NBQXdDLENBQUM7UUFDaEcsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDMUIsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNyRCxNQUFNLDhCQUE4QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsQ0FBQztZQUNyRixNQUFNLHdCQUF3QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztZQUN6RSxJQUFJLEdBQW9CLENBQUM7WUFDekIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sc0JBQXNCLEdBQUcsY0FBYyxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDL0YsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO29CQUM1QixNQUFNLFlBQVksR0FBRyxNQUFNLDhCQUE4QixDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO29CQUNsRyxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUMxQyxHQUFHLEdBQUcsWUFBWSxDQUFDO29CQUNwQixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNYLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDVixHQUFHLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDO1lBQ3pDLENBQUM7WUFDRCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUN6RCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ25DLENBQUM7WUFFRCxDQUFDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3RDLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsQ0FBQztLQUNELENBQUMsQ0FBQztBQUNKLENBQUMifQ==