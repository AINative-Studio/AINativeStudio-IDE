/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
export async function shouldPasteTerminalText(accessor, text, bracketedPasteMode) {
    const configurationService = accessor.get(IConfigurationService);
    const dialogService = accessor.get(IDialogService);
    // If the clipboard has only one line, a warning should never show
    const textForLines = text.split(/\r?\n/);
    if (textForLines.length === 1) {
        return true;
    }
    // Get config value
    function parseConfigValue(value) {
        // Valid value
        if (typeof value === 'string') {
            if (value === 'auto' || value === 'always' || value === 'never') {
                return value;
            }
        }
        // Legacy backwards compatibility
        if (typeof value === 'boolean') {
            return value ? 'auto' : 'never';
        }
        // Invalid value fallback
        return 'auto';
    }
    const configValue = parseConfigValue(configurationService.getValue("terminal.integrated.enableMultiLinePasteWarning" /* TerminalSettingId.EnableMultiLinePasteWarning */));
    // Never show it
    if (configValue === 'never') {
        return true;
    }
    // Special edge cases to not show for auto
    if (configValue === 'auto') {
        // Ignore check if the shell is in bracketed paste mode (ie. the shell can handle multi-line
        // text).
        if (bracketedPasteMode) {
            return true;
        }
        const textForLines = text.split(/\r?\n/);
        // Ignore check when a command is copied with a trailing new line
        if (textForLines.length === 2 && textForLines[1].trim().length === 0) {
            return true;
        }
    }
    const displayItemsCount = 3;
    const maxPreviewLineLength = 30;
    let detail = localize('preview', "Preview:");
    for (let i = 0; i < Math.min(textForLines.length, displayItemsCount); i++) {
        const line = textForLines[i];
        const cleanedLine = line.length > maxPreviewLineLength ? `${line.slice(0, maxPreviewLineLength)}…` : line;
        detail += `\n${cleanedLine}`;
    }
    if (textForLines.length > displayItemsCount) {
        detail += `\n…`;
    }
    const { result, checkboxChecked } = await dialogService.prompt({
        message: localize('confirmMoveTrashMessageFilesAndDirectories', "Are you sure you want to paste {0} lines of text into the terminal?", textForLines.length),
        detail,
        type: 'warning',
        buttons: [
            {
                label: localize({ key: 'multiLinePasteButton', comment: ['&& denotes a mnemonic'] }, "&&Paste"),
                run: () => ({ confirmed: true, singleLine: false })
            },
            {
                label: localize({ key: 'multiLinePasteButton.oneLine', comment: ['&& denotes a mnemonic'] }, "Paste as &&one line"),
                run: () => ({ confirmed: true, singleLine: true })
            }
        ],
        cancelButton: true,
        checkbox: {
            label: localize('doNotAskAgain', "Do not ask me again")
        }
    });
    if (!result) {
        return false;
    }
    if (result.confirmed && checkboxChecked) {
        await configurationService.updateValue("terminal.integrated.enableMultiLinePasteWarning" /* TerminalSettingId.EnableMultiLinePasteWarning */, 'never');
    }
    if (result.singleLine) {
        return { modifiedText: text.replace(/\r?\n/g, '') };
    }
    return result.confirmed;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDbGlwYm9hcmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2xpcGJvYXJkL2Jyb3dzZXIvdGVybWluYWxDbGlwYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUluRixNQUFNLENBQUMsS0FBSyxVQUFVLHVCQUF1QixDQUFDLFFBQTBCLEVBQUUsSUFBWSxFQUFFLGtCQUF1QztJQUM5SCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUNqRSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRW5ELGtFQUFrRTtJQUNsRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3pDLElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUMvQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxtQkFBbUI7SUFDbkIsU0FBUyxnQkFBZ0IsQ0FBQyxLQUFjO1FBQ3ZDLGNBQWM7UUFDZCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQy9CLElBQUksS0FBSyxLQUFLLE1BQU0sSUFBSSxLQUFLLEtBQUssUUFBUSxJQUFJLEtBQUssS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDakUsT0FBTyxLQUFLLENBQUM7WUFD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