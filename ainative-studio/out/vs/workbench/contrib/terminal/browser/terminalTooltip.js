/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { asArray } from '../../../../base/common/arrays.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import Severity from '../../../../base/common/severity.js';
import { basename } from '../../../../base/common/path.js';
export function getInstanceHoverInfo(instance, storageService) {
    const showDetailed = parseInt(storageService.get("terminal.integrated.tabs.showDetailed" /* TerminalStorageKeys.TabsShowDetailed */, -1 /* StorageScope.APPLICATION */) ?? '0');
    let statusString = '';
    const statuses = instance.statusList.statuses;
    const actions = [];
    for (const status of statuses) {
        if (showDetailed) {
            if (status.detailedTooltip ?? status.tooltip) {
                statusString += `\n\n---\n\n${status.icon ? `$(${status.icon?.id}) ` : ''}` + (status.detailedTooltip ?? status.tooltip ?? '');
            }
        }
        else {
            if (status.tooltip) {
                statusString += `\n\n---\n\n${status.icon ? `$(${status.icon?.id}) ` : ''}` + (status.tooltip ?? '');
            }
        }
        if (status.hoverActions) {
            actions.push(...status.hoverActions);
        }
    }
    actions.push({
        commandId: 'toggleDetailedInfo',
        label: showDetailed ? localize('hideDetails', 'Hide Details') : localize('showDetails', 'Show Details'),
        run() {
            storageService.store("terminal.integrated.tabs.showDetailed" /* TerminalStorageKeys.TabsShowDetailed */, (showDetailed + 1) % 2, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        },
    });
    const shellProcessString = getShellProcessTooltip(instance, !!showDetailed);
    const content = new MarkdownString(instance.title + shellProcessString + statusString, { supportThemeIcons: true });
    return { content, actions };
}
export function getShellProcessTooltip(instance, showDetailed) {
    const lines = [];
    if (instance.processId && instance.processId > 0) {
        lines.push(localize({ key: 'shellProcessTooltip.processId', comment: ['The first arg is "PID" which shouldn\'t be translated'] }, "Process ID ({0}): {1}", 'PID', instance.processId) + '\n');
    }
    if (instance.shellLaunchConfig.executable) {
        let commandLine = '';
        if (!showDetailed && instance.shellLaunchConfig.executable.length > 32) {
            const base = basename(instance.shellLaunchConfig.executable);
            const sepIndex = instance.shellLaunchConfig.executable.length - base.length - 1;
            const sep = instance.shellLaunchConfig.executable.substring(sepIndex, sepIndex + 1);
            commandLine += `…${sep}${base}`;
        }
        else {
            commandLine += instance.shellLaunchConfig.executable;
        }
        const args = asArray(instance.injectedArgs || instance.shellLaunchConfig.args || []).map(x => x.match(/\s/) ? `'${x}'` : x).join(' ');
        if (args) {
            commandLine += ` ${args}`;
        }
        lines.push(localize('shellProcessTooltip.commandLine', 'Command line: {0}', commandLine));
    }
    return lines.length ? `\n\n---\n\n${lines.join('\n')}` : '';
}
export function refreshShellIntegrationInfoStatus(instance) {
    if (!instance.xterm) {
        return;
    }
    const cmdDetectionType = (instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.hasRichCommandDetection
        ? localize('shellIntegration.rich', 'Rich')
        : instance.capabilities.has(2 /* TerminalCapability.CommandDetection */)
            ? localize('shellIntegration.basic', 'Basic')
            : instance.usedShellIntegrationInjection
                ? localize('shellIntegration.injectionFailed', "Injection failed to activate")
                : localize('shellIntegration.no', 'No'));
    const detailedAdditions = [];
    const seenSequences = Array.from(instance.xterm.shellIntegration.seenSequences);
    if (seenSequences.length > 0) {
        detailedAdditions.push(`Seen sequences: ${seenSequences.map(e => `\`${e}\``).join(', ')}`);
    }
    const combinedString = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.promptInputModel.getCombinedString();
    if (combinedString !== undefined) {
        detailedAdditions.push(`Prompt input: \`${combinedString}\``);
    }
    const detailedAdditionsString = detailedAdditions.length > 0
        ? '\n\n' + detailedAdditions.map(e => `- ${e}`).join('\n')
        : '';
    instance.statusList.add({
        id: "shell-integration-info" /* TerminalStatus.ShellIntegrationInfo */,
        severity: Severity.Info,
        tooltip: `${localize('shellIntegration', "Shell integration")}: ${cmdDetectionType}`,
        detailedTooltip: `${localize('shellIntegration', "Shell integration")}: ${cmdDetectionType}${detailedAdditionsString}`
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUb29sdGlwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxUb29sdGlwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBSXhFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBSTNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUzRCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsUUFBMkIsRUFBRSxjQUErQjtJQUNoRyxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLEdBQUcsdUhBQWdFLElBQUksR0FBRyxDQUFDLENBQUM7SUFDekgsSUFBSSxZQUFZLEdBQUcsRUFBRSxDQUFDO0lBQ3RCLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO0lBQzlDLE1BQU0sT0FBTyxHQUFpQyxFQUFFLENBQUM7SUFDakQsS0FBSyxNQUFNLE1BQU0sSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUMvQixJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLElBQUksTUFBTSxDQUFDLGVBQWUsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzlDLFlBQVksSUFBSSxjQUFjLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxJQUFJLE1BQU0sQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUM7WUFDaEksQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3BCLFlBQVksSUFBSSxjQUFjLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3RHLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDekIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN0QyxDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDWixTQUFTLEVBQUUsb0JBQW9CO1FBQy9CLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDO1FBQ3ZHLEdBQUc7WUFDRixjQUFjLENBQUMsS0FBSyxxRkFBdUMsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxnRUFBK0MsQ0FBQztRQUNsSSxDQUFDO0tBQ0QsQ0FBQyxDQUFDO0lBRUgsTUFBTSxrQkFBa0IsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzVFLE1BQU0sT0FBTyxHQUFHLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsa0JBQWtCLEdBQUcsWUFBWSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUVwSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDO0FBQzdCLENBQUM7QUFFRCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsUUFBMkIsRUFBRSxZQUFxQjtJQUN4RixNQUFNLEtBQUssR0FBYSxFQUFFLENBQUM7SUFFM0IsSUFBSSxRQUFRLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDbEQsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsK0JBQStCLEVBQUUsT0FBTyxFQUFFLENBQUMsdURBQXVELENBQUMsRUFBRSxFQUFFLHVCQUF1QixFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDL0wsQ0FBQztJQUVELElBQUksUUFBUSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzNDLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsWUFBWSxJQUFJLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQ3hFLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDN0QsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7WUFDaEYsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNwRixXQUFXLElBQUksSUFBSSxHQUFHLEdBQUcsSUFBSSxFQUFFLENBQUM7UUFDakMsQ0FBQzthQUFNLENBQUM7WUFDUCxXQUFXLElBQUksUUFBUSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQztRQUN0RCxDQUFDO1FBQ0QsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLElBQUksUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEksSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNWLFdBQVcsSUFBSSxJQUFJLElBQUksRUFBRSxDQUFDO1FBQzNCLENBQUM7UUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxtQkFBbUIsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQzNGLENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGNBQWMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDN0QsQ0FBQztBQUVELE1BQU0sVUFBVSxpQ0FBaUMsQ0FBQyxRQUEyQjtJQUM1RSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3JCLE9BQU87SUFDUixDQUFDO0lBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxDQUN4QixRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsNkNBQXFDLEVBQUUsdUJBQXVCO1FBQ3RGLENBQUMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsTUFBTSxDQUFDO1FBQzNDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsNkNBQXFDO1lBQy9ELENBQUMsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsT0FBTyxDQUFDO1lBQzdDLENBQUMsQ0FBQyxRQUFRLENBQUMsNkJBQTZCO2dCQUN2QyxDQUFDLENBQUMsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLDhCQUE4QixDQUFDO2dCQUM5RSxDQUFDLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxDQUMxQyxDQUFDO0lBRUYsTUFBTSxpQkFBaUIsR0FBYSxFQUFFLENBQUM7SUFDdkMsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2hGLElBQUksYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUM5QixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM1RixDQUFDO0lBQ0QsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLDZDQUFxQyxFQUFFLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDNUgsSUFBSSxjQUFjLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDbEMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixjQUFjLElBQUksQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFDRCxNQUFNLHVCQUF1QixHQUFHLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDO1FBQzNELENBQUMsQ0FBQyxNQUFNLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDMUQsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUVOLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1FBQ3ZCLEVBQUUsb0VBQXFDO1FBQ3ZDLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSTtRQUN2QixPQUFPLEVBQUUsR0FBRyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxnQkFBZ0IsRUFBRTtRQUNwRixlQUFlLEVBQUUsR0FBRyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxnQkFBZ0IsR0FBRyx1QkFBdUIsRUFBRTtLQUN0SCxDQUFDLENBQUM7QUFDSixDQUFDIn0=