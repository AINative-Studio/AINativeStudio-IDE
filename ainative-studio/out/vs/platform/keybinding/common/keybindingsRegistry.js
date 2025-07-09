/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeKeybinding } from '../../../base/common/keybindings.js';
import { OS } from '../../../base/common/platform.js';
import { CommandsRegistry } from '../../commands/common/commands.js';
import { Registry } from '../../registry/common/platform.js';
import { combinedDisposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
export var KeybindingWeight;
(function (KeybindingWeight) {
    KeybindingWeight[KeybindingWeight["EditorCore"] = 0] = "EditorCore";
    KeybindingWeight[KeybindingWeight["EditorContrib"] = 100] = "EditorContrib";
    KeybindingWeight[KeybindingWeight["WorkbenchContrib"] = 200] = "WorkbenchContrib";
    KeybindingWeight[KeybindingWeight["BuiltinExtension"] = 300] = "BuiltinExtension";
    KeybindingWeight[KeybindingWeight["ExternalExtension"] = 400] = "ExternalExtension";
    KeybindingWeight[KeybindingWeight["VoidExtension"] = 605] = "VoidExtension";
})(KeybindingWeight || (KeybindingWeight = {}));
/**
 * Stores all built-in and extension-provided keybindings (but not ones that user defines themselves)
 */
class KeybindingsRegistryImpl {
    constructor() {
        this._coreKeybindings = new LinkedList();
        this._extensionKeybindings = [];
        this._cachedMergedKeybindings = null;
    }
    /**
     * Take current platform into account and reduce to primary & secondary.
     */
    static bindToCurrentPlatform(kb) {
        if (OS === 1 /* OperatingSystem.Windows */) {
            if (kb && kb.win) {
                return kb.win;
            }
        }
        else if (OS === 2 /* OperatingSystem.Macintosh */) {
            if (kb && kb.mac) {
                return kb.mac;
            }
        }
        else {
            if (kb && kb.linux) {
                return kb.linux;
            }
        }
        return kb;
    }
    registerKeybindingRule(rule) {
        const actualKb = KeybindingsRegistryImpl.bindToCurrentPlatform(rule);
        const result = new DisposableStore();
        if (actualKb && actualKb.primary) {
            const kk = decodeKeybinding(actualKb.primary, OS);
            if (kk) {
                result.add(this._registerDefaultKeybinding(kk, rule.id, rule.args, rule.weight, 0, rule.when));
            }
        }
        if (actualKb && Array.isArray(actualKb.secondary)) {
            for (let i = 0, len = actualKb.secondary.length; i < len; i++) {
                const k = actualKb.secondary[i];
                const kk = decodeKeybinding(k, OS);
                if (kk) {
                    result.add(this._registerDefaultKeybinding(kk, rule.id, rule.args, rule.weight, -i - 1, rule.when));
                }
            }
        }
        return result;
    }
    setExtensionKeybindings(rules) {
        const result = [];
        let keybindingsLen = 0;
        for (const rule of rules) {
            if (rule.keybinding) {
                result[keybindingsLen++] = {
                    keybinding: rule.keybinding,
                    command: rule.id,
                    commandArgs: rule.args,
                    when: rule.when,
                    weight1: rule.weight,
                    weight2: 0,
                    extensionId: rule.extensionId || null,
                    isBuiltinExtension: rule.isBuiltinExtension || false
                };
            }
        }
        this._extensionKeybindings = result;
        this._cachedMergedKeybindings = null;
    }
    registerCommandAndKeybindingRule(desc) {
        return combinedDisposable(this.registerKeybindingRule(desc), CommandsRegistry.registerCommand(desc));
    }
    _registerDefaultKeybinding(keybinding, commandId, commandArgs, weight1, weight2, when) {
        const remove = this._coreKeybindings.push({
            keybinding: keybinding,
            command: commandId,
            commandArgs: commandArgs,
            when: when,
            weight1: weight1,
            weight2: weight2,
            extensionId: null,
            isBuiltinExtension: false
        });
        this._cachedMergedKeybindings = null;
        return toDisposable(() => {
            remove();
            this._cachedMergedKeybindings = null;
        });
    }
    getDefaultKeybindings() {
        if (!this._cachedMergedKeybindings) {
            this._cachedMergedKeybindings = Array.from(this._coreKeybindings).concat(this._extensionKeybindings);
            this._cachedMergedKeybindings.sort(sorter);
        }
        return this._cachedMergedKeybindings.slice(0);
    }
}
export const KeybindingsRegistry = new KeybindingsRegistryImpl();
// Define extension point ids
export const Extensions = {
    EditorModes: 'platform.keybindingsRegistry'
};
Registry.add(Extensions.EditorModes, KeybindingsRegistry);
function sorter(a, b) {
    if (a.weight1 !== b.weight1) {
        return a.weight1 - b.weight1;
    }
    if (a.command && b.command) {
        if (a.command < b.command) {
            return -1;
        }
        if (a.command > b.command) {
            return 1;
        }
    }
    return a.weight2 - b.weight2;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NSZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXliaW5kaW5nL2NvbW1vbi9rZXliaW5kaW5nc1JlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBYyxNQUFNLHFDQUFxQyxDQUFDO0FBQ25GLE9BQU8sRUFBbUIsRUFBRSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFxQyxNQUFNLG1DQUFtQyxDQUFDO0FBRXhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQWtEaEUsTUFBTSxDQUFOLElBQWtCLGdCQU9qQjtBQVBELFdBQWtCLGdCQUFnQjtJQUNqQyxtRUFBYyxDQUFBO0lBQ2QsMkVBQW1CLENBQUE7SUFDbkIsaUZBQXNCLENBQUE7SUFDdEIsaUZBQXNCLENBQUE7SUFDdEIsbUZBQXVCLENBQUE7SUFDdkIsMkVBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQVBpQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBT2pDO0FBY0Q7O0dBRUc7QUFDSCxNQUFNLHVCQUF1QjtJQU01QjtRQUNDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxFQUFFLENBQUM7UUFDaEMsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQztJQUN0QyxDQUFDO0lBRUQ7O09BRUc7SUFDSyxNQUFN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