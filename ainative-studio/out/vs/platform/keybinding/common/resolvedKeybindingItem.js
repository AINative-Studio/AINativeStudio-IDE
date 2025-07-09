/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ResolvedKeybindingItem {
    constructor(resolvedKeybinding, command, commandArgs, when, isDefault, extensionId, isBuiltinExtension) {
        this._resolvedKeybindingItemBrand = undefined;
        this.resolvedKeybinding = resolvedKeybinding;
        this.chords = resolvedKeybinding ? toEmptyArrayIfContainsNull(resolvedKeybinding.getDispatchChords()) : [];
        if (resolvedKeybinding && this.chords.length === 0) {
            // handle possible single modifier chord keybindings
            this.chords = toEmptyArrayIfContainsNull(resolvedKeybinding.getSingleModifierDispatchChords());
        }
        this.bubble = (command ? command.charCodeAt(0) === 94 /* CharCode.Caret */ : false);
        this.command = this.bubble ? command.substr(1) : command;
        this.commandArgs = commandArgs;
        this.when = when;
        this.isDefault = isDefault;
        this.extensionId = extensionId;
        this.isBuiltinExtension = isBuiltinExtension;
    }
}
export function toEmptyArrayIfContainsNull(arr) {
    const result = [];
    for (let i = 0, len = arr.length; i < len; i++) {
        const element = arr[i];
        if (!element) {
            return [];
        }
        result.push(element);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZWRLZXliaW5kaW5nSXRlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXliaW5kaW5nL2NvbW1vbi9yZXNvbHZlZEtleWJpbmRpbmdJdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE1BQU0sT0FBTyxzQkFBc0I7SUFhbEMsWUFBWSxrQkFBa0QsRUFBRSxPQUFzQixFQUFFLFdBQWdCLEVBQUUsSUFBc0MsRUFBRSxTQUFrQixFQUFFLFdBQTBCLEVBQUUsa0JBQTJCO1FBWjdOLGlDQUE0QixHQUFTLFNBQVMsQ0FBQztRQWE5QyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsa0JBQWtCLENBQUM7UUFDN0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDM0csSUFBSSxrQkFBa0IsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwRCxvREFBb0Q7WUFDcEQsSUFBSSxDQUFDLE1BQU0sR0FBRywwQkFBMEIsQ0FBQyxrQkFBa0IsQ0FBQywrQkFBK0IsRUFBRSxDQUFDLENBQUM7UUFDaEcsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLDRCQUFtQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUMxRCxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsa0JBQWtCLEdBQUcsa0JBQWtCLENBQUM7SUFDOUMsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLDBCQUEwQixDQUFJLEdBQWlCO0lBQzlELE1BQU0sTUFBTSxHQUFRLEVBQUUsQ0FBQztJQUN2QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDaEQsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyJ9