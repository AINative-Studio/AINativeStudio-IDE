/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { implies, expressionsAreEqualWithConstantSubstitution } from '../../contextkey/common/contextkey.js';
//#region resolution-result
export var ResultKind;
(function (ResultKind) {
    /** No keybinding found this sequence of chords */
    ResultKind[ResultKind["NoMatchingKb"] = 0] = "NoMatchingKb";
    /** There're several keybindings that have the given sequence of chords as a prefix */
    ResultKind[ResultKind["MoreChordsNeeded"] = 1] = "MoreChordsNeeded";
    /** A single keybinding found to be dispatched/invoked */
    ResultKind[ResultKind["KbFound"] = 2] = "KbFound";
})(ResultKind || (ResultKind = {}));
// util definitions to make working with the above types easier within this module:
export const NoMatchingKb = { kind: 0 /* ResultKind.NoMatchingKb */ };
const MoreChordsNeeded = { kind: 1 /* ResultKind.MoreChordsNeeded */ };
function KbFound(commandId, commandArgs, isBubble) {
    return { kind: 2 /* ResultKind.KbFound */, commandId, commandArgs, isBubble };
}
//#endregion
/**
 * Stores mappings from keybindings to commands and from commands to keybindings.
 * Given a sequence of chords, `resolve`s which keybinding it matches
 */
export class KeybindingResolver {
    constructor(
    /** built-in and extension-provided keybindings */
    defaultKeybindings, 
    /** user's keybindings */
    overrides, log) {
        this._log = log;
        this._defaultKeybindings = defaultKeybindings;
        this._defaultBoundCommands = new Map();
        for (const defaultKeybinding of defaultKeybindings) {
            const command = defaultKeybinding.command;
            if (command && command.charAt(0) !== '-') {
                this._defaultBoundCommands.set(command, true);
            }
        }
        this._map = new Map();
        this._lookupMap = new Map();
        this._keybindings = KeybindingResolver.handleRemovals([].concat(defaultKeybindings).concat(overrides));
        for (let i = 0, len = this._keybindings.length; i < len; i++) {
            const k = this._keybindings[i];
            if (k.chords.length === 0) {
                // unbound
                continue;
            }
            // substitute with constants that are registered after startup - https://github.com/microsoft/vscode/issues/174218#issuecomment-1437972127
            const when = k.when?.substituteConstants();
            if (when && when.type === 0 /* ContextKeyExprType.False */) {
                // when condition is false
                continue;
            }
            this._addKeyPress(k.chords[0], k);
        }
    }
    static _isTargetedForRemoval(defaultKb, keypress, when) {
        if (keypress) {
            for (let i = 0; i < keypress.length; i++) {
                if (keypress[i] !== defaultKb.chords[i]) {
                    return false;
                }
            }
        }
        // `true` means always, as does `undefined`
        // so we will treat `true` === `undefined`
        if (when && when.type !== 1 /* ContextKeyExprType.True */) {
            if (!defaultKb.when) {
                return false;
            }
            if (!expressionsAreEqualWithConstantSubstitution(when, defaultKb.when)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Looks for rules containing "-commandId" and removes them.
     */
    static handleRemovals(rules) {
        // Do a first pass and construct a hash-map for removals
        const removals = new Map();
        for (let i = 0, len = rules.length; i < len; i++) {
            const rule = rules[i];
            if (rule.command && rule.command.charAt(0) === '-') {
                const command = rule.command.substring(1);
                if (!removals.has(command)) {
                    removals.set(command, [rule]);
                }
                else {
                    removals.get(command).push(rule);
                }
            }
        }
        if (removals.size === 0) {
            // There are no removals
            return rules;
        }
        // Do a second pass and keep only non-removed keybindings
        const result = [];
        for (let i = 0, len = rules.length; i < len; i++) {
            const rule = rules[i];
            if (!rule.command || rule.command.length === 0) {
                result.push(rule);
                continue;
            }
            if (rule.command.charAt(0) === '-') {
                continue;
            }
            const commandRemovals = removals.get(rule.command);
            if (!commandRemovals || !rule.isDefault) {
                result.push(rule);
                continue;
            }
            let isRemoved = false;
            for (const commandRemoval of commandRemovals) {
                const when = commandRemoval.when;
                if (this._isTargetedForRemoval(rule, commandRemoval.chords, when)) {
                    isRemoved = true;
                    break;
                }
            }
            if (!isRemoved) {
                result.push(rule);
                continue;
            }
        }
        return result;
    }
    _addKeyPress(keypress, item) {
        const conflicts = this._map.get(keypress);
        if (typeof conflicts === 'undefined') {
            // There is no conflict so far
            this._map.set(keypress, [item]);
            this._addToLookupMap(item);
            return;
        }
        for (let i = conflicts.length - 1; i >= 0; i--) {
            const conflict = conflicts[i];
            if (conflict.command === item.command) {
                continue;
            }
            // Test if the shorter keybinding is a prefix of the longer one.
            // If the shorter keybinding is a prefix, it effectively will shadow the longer one and is considered a conflict.
            let isShorterKbPrefix = true;
            for (let i = 1; i < conflict.chords.length && i < item.chords.length; i++) {
                if (conflict.chords[i] !== item.chords[i]) {
                    // The ith step does not conflict
                    isShorterKbPrefix = false;
                    break;
                }
            }
            if (!isShorterKbPrefix) {
                continue;
            }
            if (KeybindingResolver.whenIsEntirelyIncluded(conflict.when, item.when)) {
                // `item` completely overwrites `conflict`
                // Remove conflict from the lookupMap
                this._removeFromLookupMap(conflict);
            }
        }
        conflicts.push(item);
        this._addToLookupMap(item);
    }
    _addToLookupMap(item) {
        if (!item.command) {
            return;
        }
        let arr = this._lookupMap.get(item.command);
        if (typeof arr === 'undefined') {
            arr = [item];
            this._lookupMap.set(item.command, arr);
        }
        else {
            arr.push(item);
        }
    }
    _removeFromLookupMap(item) {
        if (!item.command) {
            return;
        }
        const arr = this._lookupMap.get(item.command);
        if (typeof arr === 'undefined') {
            return;
        }
        for (let i = 0, len = arr.length; i < len; i++) {
            if (arr[i] === item) {
                arr.splice(i, 1);
                return;
            }
        }
    }
    /**
     * Returns true if it is provable `a` implies `b`.
     */
    static whenIsEntirelyIncluded(a, b) {
        if (!b || b.type === 1 /* ContextKeyExprType.True */) {
            return true;
        }
        if (!a || a.type === 1 /* ContextKeyExprType.True */) {
            return false;
        }
        return implies(a, b);
    }
    getDefaultBoundCommands() {
        return this._defaultBoundCommands;
    }
    getDefaultKeybindings() {
        return this._defaultKeybindings;
    }
    getKeybindings() {
        return this._keybindings;
    }
    lookupKeybindings(commandId) {
        const items = this._lookupMap.get(commandId);
        if (typeof items === 'undefined' || items.length === 0) {
            return [];
        }
        // Reverse to get the most specific item first
        const result = [];
        let resultLen = 0;
        for (let i = items.length - 1; i >= 0; i--) {
            result[resultLen++] = items[i];
        }
        return result;
    }
    lookupPrimaryKeybinding(commandId, context, enforceContextCheck = false) {
        const items = this._lookupMap.get(commandId);
        if (typeof items === 'undefined' || items.length === 0) {
            return null;
        }
        if (items.length === 1 && !enforceContextCheck) {
            return items[0];
        }
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (context.contextMatchesRules(item.when)) {
                return item;
            }
        }
        if (enforceContextCheck) {
            return null;
        }
        return items[items.length - 1];
    }
    /**
     * Looks up a keybinding trigged as a result of pressing a sequence of chords - `[...currentChords, keypress]`
     *
     * Example: resolving 3 chords pressed sequentially - `cmd+k cmd+p cmd+i`:
     * 	`currentChords = [ 'cmd+k' , 'cmd+p' ]` and `keypress = `cmd+i` - last pressed chord
     */
    resolve(context, currentChords, keypress) {
        const pressedChords = [...currentChords, keypress];
        this._log(`| Resolving ${pressedChords}`);
        const kbCandidates = this._map.get(pressedChords[0]);
        if (kbCandidates === undefined) {
            // No bindings with such 0-th chord
            this._log(`\\ No keybinding entries.`);
            return NoMatchingKb;
        }
        let lookupMap = null;
        if (pressedChords.length < 2) {
            lookupMap = kbCandidates;
        }
        else {
            // Fetch all chord bindings for `currentChords`
            lookupMap = [];
            for (let i = 0, len = kbCandidates.length; i < len; i++) {
                const candidate = kbCandidates[i];
                if (pressedChords.length > candidate.chords.length) { // # of pressed chords can't be less than # of chords in a keybinding to invoke
                    continue;
                }
                let prefixMatches = true;
                for (let i = 1; i < pressedChords.length; i++) {
                    if (candidate.chords[i] !== pressedChords[i]) {
                        prefixMatches = false;
                        break;
                    }
                }
                if (prefixMatches) {
                    lookupMap.push(candidate);
                }
            }
        }
        // check there's a keybinding with a matching when clause
        const result = this._findCommand(context, lookupMap);
        if (!result) {
            this._log(`\\ From ${lookupMap.length} keybinding entries, no when clauses matched the context.`);
            return NoMatchingKb;
        }
        // check we got all chords necessary to be sure a particular keybinding needs to be invoked
        if (pressedChords.length < result.chords.length) {
            // The chord sequence is not complete
            this._log(`\\ From ${lookupMap.length} keybinding entries, awaiting ${result.chords.length - pressedChords.length} more chord(s), when: ${printWhenExplanation(result.when)}, source: ${printSourceExplanation(result)}.`);
            return MoreChordsNeeded;
        }
        this._log(`\\ From ${lookupMap.length} keybinding entries, matched ${result.command}, when: ${printWhenExplanation(result.when)}, source: ${printSourceExplanation(result)}.`);
        return KbFound(result.command, result.commandArgs, result.bubble);
    }
    _findCommand(context, matches) {
        for (let i = matches.length - 1; i >= 0; i--) {
            const k = matches[i];
            if (!KeybindingResolver._contextMatchesRules(context, k.when)) {
                continue;
            }
            return k;
        }
        return null;
    }
    static _contextMatchesRules(context, rules) {
        if (!rules) {
            return true;
        }
        return rules.evaluate(context);
    }
}
function printWhenExplanation(when) {
    if (!when) {
        return `no when condition`;
    }
    return `${when.serialize()}`;
}
function printSourceExplanation(kb) {
    return (kb.extensionId
        ? (kb.isBuiltinExtension ? `built-in extension ${kb.extensionId}` : `user extension ${kb.extensionId}`)
        : (kb.isDefault ? `built-in` : `user`));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ1Jlc29sdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJpbmRpbmcvY29tbW9uL2tleWJpbmRpbmdSZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUEwRSwyQ0FBMkMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBR3JMLDJCQUEyQjtBQUUzQixNQUFNLENBQU4sSUFBa0IsVUFTakI7QUFURCxXQUFrQixVQUFVO0lBQzNCLGtEQUFrRDtJQUNsRCwyREFBWSxDQUFBO0lBRVosc0ZBQXNGO0lBQ3RGLG1FQUFnQixDQUFBO0lBRWhCLHlEQUF5RDtJQUN6RCxpREFBTyxDQUFBO0FBQ1IsQ0FBQyxFQVRpQixVQUFVLEtBQVYsVUFBVSxRQVMzQjtBQVFELG1GQUFtRjtBQUVuRixNQUFNLENBQUMsTUFBTSxZQUFZLEdBQXFCLEVBQUUsSUFBSSxpQ0FBeUIsRUFBRSxDQUFDO0FBQ2hGLE1BQU0sZ0JBQWdCLEdBQXFCLEVBQUUsSUFBSSxxQ0FBNkIsRUFBRSxDQUFDO0FBQ2pGLFNBQVMsT0FBTyxDQUFDLFNBQXdCLEVBQUUsV0FBZ0IsRUFBRSxRQUFpQjtJQUM3RSxPQUFPLEVBQUUsSUFBSSw0QkFBb0IsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxDQUFDO0FBQ3ZFLENBQUM7QUFFRCxZQUFZO0FBRVo7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGtCQUFrQjtJQVE5QjtJQUNDLGtEQUFrRDtJQUNsRCxrQkFBNEM7SUFDNUMseUJBQXlCO0lBQ3pCLFNBQW1DLEVBQ25DLEdBQTBCO1FBRTFCLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDO1FBQ2hCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxrQkFBa0Is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