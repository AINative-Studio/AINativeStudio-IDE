/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../base/common/htmlContent.js';
export function resolveContentAndKeybindingItems(keybindingService, value) {
    if (!value) {
        return;
    }
    const configureKeybindingItems = [];
    const configuredKeybindingItems = [];
    const matches = value.matchAll(/(\<keybinding:(?<commandId>[^\<]*)\>)/gm);
    for (const match of [...matches]) {
        const commandId = match?.groups?.commandId;
        let kbLabel;
        if (match?.length && commandId) {
            const keybinding = keybindingService.lookupKeybinding(commandId)?.getAriaLabel();
            if (!keybinding) {
                kbLabel = ` (unassigned keybinding)`;
                configureKeybindingItems.push({
                    label: commandId,
                    id: commandId
                });
            }
            else {
                kbLabel = ' (' + keybinding + ')';
                configuredKeybindingItems.push({
                    label: commandId,
                    id: commandId
                });
            }
            value = value.replace(match[0], kbLabel);
        }
    }
    const content = new MarkdownString(value);
    content.isTrusted = true;
    return { content, configureKeybindingItems: configureKeybindingItems.length ? configureKeybindingItems : undefined, configuredKeybindingItems: configuredKeybindingItems.length ? configuredKeybindingItems : undefined };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXdLZXliaW5kaW5nUmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL2FjY2Vzc2libGVWaWV3S2V5YmluZGluZ1Jlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUl4RSxNQUFNLFVBQVUsZ0NBQWdDLENBQUMsaUJBQXFDLEVBQUUsS0FBYztJQUNyRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixPQUFPO0lBQ1IsQ0FBQztJQUNELE1BQU0sd0JBQXdCLEdBQTZCLEVBQUUsQ0FBQztJQUM5RCxNQUFNLHlCQUF5QixHQUE2QixFQUFFLENBQUM7SUFDL0QsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0lBQzFFLEtBQUssTUFBTSxLQUFLLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDbEMsTUFBTSxTQUFTLEdBQUcsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUM7UUFDM0MsSUFBSSxPQUFPLENBQUM7UUFDWixJQUFJLEtBQUssRUFBRSxNQUFNLElBQUksU0FBUyxFQUFFLENBQUM7WUFDaEMsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUM7WUFDakYsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNqQixPQUFPLEdBQUcsMEJBQTBCLENBQUM7Z0JBQ3JDLHdCQUF3QixDQUFDLElBQUksQ0FBQztvQkFDN0IsS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLEVBQUUsRUFBRSxTQUFTO2lCQUNiLENBQUMsQ0FBQztZQUNKLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEdBQUcsSUFBSSxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUM7Z0JBQ2xDLHlCQUF5QixDQUFDLElBQUksQ0FBQztvQkFDOUIsS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLEVBQUUsRUFBRSxTQUFTO2lCQUNiLENBQUMsQ0FBQztZQUNKLENBQUM7WUFDRCxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDMUMsQ0FBQztJQUNGLENBQUM7SUFDRCxNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMxQyxPQUFPLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztJQUN6QixPQUFPLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsRUFBRSx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUMzTixDQUFDIn0=