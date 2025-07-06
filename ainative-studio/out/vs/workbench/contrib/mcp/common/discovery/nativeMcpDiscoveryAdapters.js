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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwRGlzY292ZXJ5QWRhcHRlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL2Rpc2NvdmVyeS9uYXRpdmVNY3BEaXNjb3ZlcnlBZGFwdGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFleEQsTUFBTSxVQUFVLDhCQUE4QixDQUFDLFFBQWdCLEVBQUUsUUFBa0IsRUFBRSxHQUFTO0lBQzdGLElBQUksTUFPSCxDQUFDO0lBRUYsSUFBSSxDQUFDO1FBQ0osTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUFDLE1BQU0sQ0FBQztRQUNSLE9BQU87SUFDUixDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBZ0MsRUFBRTtRQUM3RixPQUFPO1lBQ04sRUFBRSxFQUFFLEdBQUcsUUFBUSxJQUFJLElBQUksRUFBRTtZQUN6QixLQUFLLEVBQUUsSUFBSTtZQUNYLE1BQU0sRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDcEIsSUFBSSxvQ0FBNEI7Z0JBQ2hDLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7Z0JBQzFCLE9BQU8sRUFBRSxFQUFFO2FBQ1gsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsSUFBSSxzQ0FBOEI7Z0JBQ2xDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUU7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