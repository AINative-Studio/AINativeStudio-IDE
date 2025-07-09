/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../base/common/uri.js';
export function claudeConfigToServerDefinition(idPrefix, contents, cwd) {
    let parsed;
    try {
        parsed = JSON.parse(contents.toString());
    }
    catch {
        return;
    }
    return Object.entries(parsed.mcpServers).map(([name, server]) => {
        return {
            id: `${idPrefix}.${name}`,
            label: name,
            launch: server.url ? {
                type: 2 /* McpServerTransportType.SSE */,
                uri: URI.parse(server.url),
                headers: [],
            } : {
                type: 1 /* McpServerTransportType.Stdio */,
                args: server.args || [],
                command: server.command,
                env: server.env || {},
                envFile: undefined,
                cwd,
            }
        };
    });
}
export class ClaudeDesktopMpcDiscoveryAdapter {
    constructor(remoteAuthority) {
        this.remoteAuthority = remoteAuthority;
        this.order = 400 /* McpCollectionSortOrder.Filesystem */;
        this.discoverySource = "claude-desktop" /* DiscoverySource.ClaudeDesktop */;
        this.id = `claude-desktop.${this.remoteAuthority}`;
    }
    getFilePath({ platform, winAppData, xdgHome, homedir }) {
        if (platform === 3 /* Platform.Windows */) {
            const appData = winAppData || URI.joinPath(homedir, 'AppData', 'Roaming');
            return URI.joinPath(appData, 'Claude', 'claude_desktop_config.json');
        }
        else if (platform === 1 /* Platform.Mac */) {
            return URI.joinPath(homedir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
        }
        else {
            const configDir = xdgHome || URI.joinPath(homedir, '.config');
            return URI.joinPath(configDir, 'Claude', 'claude_desktop_config.json');
        }
    }
    adaptFile(contents, { homedir }) {
        return claudeConfigToServerDefinition(this.id, contents, homedir);
    }
}
export class WindsurfDesktopMpcDiscoveryAdapter extends ClaudeDesktopMpcDiscoveryAdapter {
    constructor(remoteAuthority) {
        super(remoteAuthority);
        this.discoverySource = "windsurf" /* DiscoverySource.Windsurf */;
        this.id = `windsurf.${this.remoteAuthority}`;
    }
    getFilePath({ homedir }) {
        return URI.joinPath(homedir, '.codeium', 'windsurf', 'mcp_config.json');
    }
}
export class CursorDesktopMpcDiscoveryAdapter extends ClaudeDesktopMpcDiscoveryAdapter {
    constructor(remoteAuthority) {
        super(remoteAuthority);
        this.discoverySource = "cursor-global" /* DiscoverySource.CursorGlobal */;
        this.id = `cursor.${this.remoteAuthority}`;
    }
    getFilePath({ homedir }) {
        return URI.joinPath(homedir, '.cursor', 'mcp.json');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwRGlzY292ZXJ5QWRhcHRlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9kaXNjb3ZlcnkvbmF0aXZlTWNwRGlzY292ZXJ5QWRhcHRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBZXhELE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxRQUFnQixFQUFFLFFBQWtCLEVBQUUsR0FBUztJQUM3RixJQUFJLE1BT0gsQ0FBQztJQUVGLElBQUksQ0FBQztRQUNKLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDUixPQUFPO0lBQ1IsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQWdDLEVBQUU7UUFDN0YsT0FBTztZQUNOLEVBQUUsRUFBRSxHQUFHLFFBQVEsSUFBSSxJQUFJLEVBQUU7WUFDekIsS0FBSyxFQUFFLElBQUk7WUFDWCxNQUFNLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BCLElBQUksb0NBQTRCO2dCQUNoQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO2dCQUMxQixPQUFPLEVBQUUsRUFBRTthQUNYLENBQUMsQ0FBQyxDQUFDO2dCQUNILElBQUksc0NBQThCO2dCQUNsQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksSUFBSSxFQUFFO2dCQUN2QixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87Z0JBQ3ZCLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRyxJQUFJLEVBQUU7Z0JBQ3JCLE9BQU8sRUFBRSxTQUFTO2dCQUNsQixHQUFHO2FBQ0g7U0FDRCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsTUFBTSxPQUFPLGdDQUFnQztJQUs1QyxZQUE0QixlQUE4QjtRQUE5QixvQkFBZSxHQUFmLGVBQWUsQ0FBZTtRQUgxQyxVQUFLLCtDQUFxQztRQUMxQyxvQkFBZSx3REFBa0Q7UUFHaEYsSUFBSSxDQUFDLEVBQUUsR0FBRyxrQkFBa0IsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3BELENBQUM7SUFFRCxXQUFXLENBQUMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQTJCO1FBQzlFLElBQUksUUFBUSw2QkFBcUIsRUFBRSxDQUFDO1lBQ25DLE1BQU0sT0FBTyxHQUFHLFVBQVUsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUUsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUN0RSxDQUFDO2FBQU0sSUFBSSxRQUFRLHlCQUFpQixFQUFFLENBQUM7WUFDdEMsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsUUFBUSxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDeEcsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFNBQVMsR0FBRyxPQUFPLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDOUQsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUN4RSxDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsQ0FBQyxRQUFrQixFQUFFLEVBQUUsT0FBTyxFQUEyQjtRQUNqRSxPQUFPLDhCQUE4QixDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ25FLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxrQ0FBbUMsU0FBUSxnQ0FBZ0M7SUFHdkYsWUFBWSxlQUE4QjtRQUN6QyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFIQyxvQkFBZSw2Q0FBNkM7UUFJcEYsSUFBSSxDQUFDLEVBQUUsR0FBRyxZQUFZLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUM5QyxDQUFDO0lBRVEsV0FBVyxDQUFDLEVBQUUsT0FBTyxFQUEyQjtRQUN4RCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUN6RSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZ0NBQWlDLFNBQVEsZ0NBQWdDO0lBR3JGLFlBQVksZUFBOEI7UUFDekMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBSEMsb0JBQWUsc0RBQWlEO1FBSXhGLElBQUksQ0FBQyxFQUFFLEdBQUcsVUFBVSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDNUMsQ0FBQztJQUVRLFdBQVcsQ0FBQyxFQUFFLE9BQU8sRUFBMkI7UUFDeEQsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDckQsQ0FBQztDQUNEIn0=