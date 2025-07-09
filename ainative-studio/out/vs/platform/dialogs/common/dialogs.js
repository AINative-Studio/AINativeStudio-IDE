/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../base/common/resources.js';
import Severity from '../../../base/common/severity.js';
import { localize } from '../../../nls.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { mnemonicButtonLabel } from '../../../base/common/labels.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { deepClone } from '../../../base/common/objects.js';
export const IDialogService = createDecorator('dialogService');
var DialogKind;
(function (DialogKind) {
    DialogKind[DialogKind["Confirmation"] = 1] = "Confirmation";
    DialogKind[DialogKind["Prompt"] = 2] = "Prompt";
    DialogKind[DialogKind["Input"] = 3] = "Input";
})(DialogKind || (DialogKind = {}));
export class AbstractDialogHandler {
    getConfirmationButtons(dialog) {
        return this.getButtons(dialog, DialogKind.Confirmation);
    }
    getPromptButtons(dialog) {
        return this.getButtons(dialog, DialogKind.Prompt);
    }
    getInputButtons(dialog) {
        return this.getButtons(dialog, DialogKind.Input);
    }
    getButtons(dialog, kind) {
        // We put buttons in the order of "default" button first and "cancel"
        // button last. There maybe later processing when presenting the buttons
        // based on OS standards.
        const buttons = [];
        switch (kind) {
            case DialogKind.Confirmation: {
                const confirmationDialog = dialog;
                if (confirmationDialog.primaryButton) {
                    buttons.push(confirmationDialog.primaryButton);
                }
                else {
                    buttons.push(localize({ key: 'yesButton', comment: ['&& denotes a mnemonic'] }, "&&Yes"));
                }
                if (confirmationDialog.cancelButton) {
                    buttons.push(confirmationDialog.cancelButton);
                }
                else {
                    buttons.push(localize('cancelButton', "Cancel"));
                }
                break;
            }
            case DialogKind.Prompt: {
                const promptDialog = dialog;
                if (Array.isArray(promptDialog.buttons) && promptDialog.buttons.length > 0) {
                    buttons.push(...promptDialog.buttons.map(button => button.label));
                }
                if (promptDialog.cancelButton) {
                    if (promptDialog.cancelButton === true) {
                        buttons.push(localize('cancelButton', "Cancel"));
                    }
                    else if (typeof promptDialog.cancelButton === 'string') {
                        buttons.push(promptDialog.cancelButton);
                    }
                    else {
                        if (promptDialog.cancelButton.label) {
                            buttons.push(promptDialog.cancelButton.label);
                        }
                        else {
                            buttons.push(localize('cancelButton', "Cancel"));
                        }
                    }
                }
                if (buttons.length === 0) {
                    buttons.push(localize({ key: 'okButton', comment: ['&& denotes a mnemonic'] }, "&&OK"));
                }
                break;
            }
            case DialogKind.Input: {
                const inputDialog = dialog;
                if (inputDialog.primaryButton) {
                    buttons.push(inputDialog.primaryButton);
                }
                else {
                    buttons.push(localize({ key: 'okButton', comment: ['&& denotes a mnemonic'] }, "&&OK"));
                }
                if (inputDialog.cancelButton) {
                    buttons.push(inputDialog.cancelButton);
                }
                else {
                    buttons.push(localize('cancelButton', "Cancel"));
                }
                break;
            }
        }
        return buttons;
    }
    getDialogType(type) {
        if (typeof type === 'string') {
            return type;
        }
        if (typeof type === 'number') {
            return (type === Severity.Info) ? 'info' : (type === Severity.Error) ? 'error' : (type === Severity.Warning) ? 'warning' : 'none';
        }
        return undefined;
    }
    getPromptResult(prompt, buttonIndex, checkboxChecked) {
        const promptButtons = [...(prompt.buttons ?? [])];
        if (prompt.cancelButton && typeof prompt.cancelButton !== 'string' && typeof prompt.cancelButton !== 'boolean') {
            promptButtons.push(prompt.cancelButton);
        }
        let result = promptButtons[buttonIndex]?.run({ checkboxChecked });
        if (!(result instanceof Promise)) {
            result = Promise.resolve(result);
        }
        return { result, checkboxChecked };
    }
}
export const IFileDialogService = createDecorator('fileDialogService');
export var ConfirmResult;
(function (ConfirmResult) {
    ConfirmResult[ConfirmResult["SAVE"] = 0] = "SAVE";
    ConfirmResult[ConfirmResult["DONT_SAVE"] = 1] = "DONT_SAVE";
    ConfirmResult[ConfirmResult["CANCEL"] = 2] = "CANCEL";
})(ConfirmResult || (ConfirmResult = {}));
const MAX_CONFIRM_FILES = 10;
export function getFileNamesMessage(fileNamesOrResources) {
    const message = [];
    message.push(...fileNamesOrResources.slice(0, MAX_CONFIRM_FILES).map(fileNameOrResource => typeof fileNameOrResource === 'string' ? fileNameOrResource : basename(fileNameOrResource)));
    if (fileNamesOrResources.length > MAX_CONFIRM_FILES) {
        if (fileNamesOrResources.length - MAX_CONFIRM_FILES === 1) {
            message.push(localize('moreFile', "...1 additional file not shown"));
        }
        else {
            message.push(localize('moreFiles', "...{0} additional files not shown", fileNamesOrResources.length - MAX_CONFIRM_FILES));
        }
    }
    message.push('');
    return message.join('\n');
}
/**
 * A utility method to ensure the options for the message box dialog
 * are using properties that are consistent across all platforms and
 * specific to the platform where necessary.
 */
export function massageMessageBoxOptions(options, productService) {
    const massagedOptions = deepClone(options);
    let buttons = (massagedOptions.buttons ?? []).map(button => mnemonicButtonLabel(button).withMnemonic);
    let buttonIndeces = (options.buttons || []).map((button, index) => index);
    let defaultId = 0; // by default the first button is default button
    let cancelId = massagedOptions.cancelId ?? buttons.length - 1; // by default the last button is cancel button
    // Apply HIG per OS when more than one button is used
    if (buttons.length > 1) {
        const cancelButton = typeof cancelId === 'number' ? buttons[cancelId] : undefined;
        if (isLinux || isMacintosh) {
            // Linux: the GNOME HIG (https://developer.gnome.org/hig/patterns/feedback/dialogs.html?highlight=dialog)
            // recommend the following:
            // "Always ensure that the cancel button appears first, before the affirmative button. In left-to-right
            //  locales, this is on the left. This button order ensures that users become aware of, and are reminded
            //  of, the ability to cancel prior to encountering the affirmative button."
            //
            // Electron APIs do not reorder buttons for us, so we ensure a reverse order of buttons and a position
            // of the cancel button (if provided) that matches the HIG
            // macOS: the HIG (https://developer.apple.com/design/human-interface-guidelines/components/presentation/alerts)
            // recommend the following:
            // "Place buttons where people expect. In general, place the button people are most likely to choose on the trailing side in a
            //  row of buttons or at the top in a stack of buttons. Always place the default button on the trailing side of a row or at the
            //  top of a stack. Cancel buttons are typically on the leading side of a row or at the bottom of a stack."
            //
            // However: it seems that older macOS versions where 3 buttons were presented in a row differ from this
            // recommendation. In fact, cancel buttons were placed to the left of the default button and secondary
            // buttons on the far left. To support these older macOS versions we have to manually shuffle the cancel
            // button in the same way as we do on Linux. This will not have any impact on newer macOS versions where
            // shuffling is done for us.
            if (typeof cancelButton === 'string' && buttons.length > 1 && cancelId !== 1) {
                buttons.splice(cancelId, 1);
                buttons.splice(1, 0, cancelButton);
                const cancelButtonIndex = buttonIndeces[cancelId];
                buttonIndeces.splice(cancelId, 1);
                buttonIndeces.splice(1, 0, cancelButtonIndex);
                cancelId = 1;
            }
            if (isLinux && buttons.length > 1) {
                buttons = buttons.reverse();
                buttonIndeces = buttonIndeces.reverse();
                defaultId = buttons.length - 1;
                if (typeof cancelButton === 'string') {
                    cancelId = defaultId - 1;
                }
            }
        }
        else if (isWindows) {
            // Windows: the HIG (https://learn.microsoft.com/en-us/windows/win32/uxguide/win-dialog-box)
            // recommend the following:
            // "One of the following sets of concise commands: Yes/No, Yes/No/Cancel, [Do it]/Cancel,
            //  [Do it]/[Don't do it], [Do it]/[Don't do it]/Cancel."
            //
            // Electron APIs do not reorder buttons for us, so we ensure the position of the cancel button
            // (if provided) that matches the HIG
            if (typeof cancelButton === 'string' && buttons.length > 1 && cancelId !== buttons.length - 1 /* last action */) {
                buttons.splice(cancelId, 1);
                buttons.push(cancelButton);
                const buttonIndex = buttonIndeces[cancelId];
                buttonIndeces.splice(cancelId, 1);
                buttonIndeces.push(buttonIndex);
                cancelId = buttons.length - 1;
            }
        }
    }
    massagedOptions.buttons = buttons;
    massagedOptions.defaultId = defaultId;
    massagedOptions.cancelId = cancelId;
    massagedOptions.noLink = true;
    massagedOptions.title = massagedOptions.title || productService.nameLong;
    return {
        options: massagedOptions,
        buttonIndeces
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9ncy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9kaWFsb2dzL2NvbW1vbi9kaWFsb2dzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQztBQUV4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRzlFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRW5GLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQThQNUQsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBaUIsZUFBZSxDQUFDLENBQUM7QUEwQy9FLElBQUssVUFJSjtBQUpELFdBQUssVUFBVTtJQUNkLDJEQUFnQixDQUFBO0lBQ2hCLCtDQUFNLENBQUE7SUFDTiw2Q0FBSyxDQUFBO0FBQ04sQ0FBQyxFQUpJLFVBQVUsS0FBVixVQUFVLFFBSWQ7QUFFRCxNQUFNLE9BQWdCLHFCQUFxQjtJQUVoQyxzQkFBc0IsQ0FBQyxNQUFxQjtRQUNyRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRVMsZ0JBQWdCLENBQUMsTUFBd0I7UUFDbEQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLENB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