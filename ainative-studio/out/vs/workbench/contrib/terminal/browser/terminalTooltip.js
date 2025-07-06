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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUb29sdGlwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFRvb2x0aXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFJeEUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFJM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTNELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxRQUEyQixFQUFFLGNBQStCO0lBQ2hHLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsR0FBRyx1SEFBZ0UsSUFBSSxHQUFHLENBQUMsQ0FBQztJQUN6SCxJQUFJLFlBQVksR0FBRyxFQUFFLENBQUM7SUFDdEIsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7SUFDOUMsTUFBTSxPQUFPLEdBQWlDLEVBQUUsQ0FBQztJQUNqRCxLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQy9CLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsSUFBSSxNQUFNLENBQUMsZUFBZSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDOUMsWUFBWSxJQUFJLGNBQWMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUs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