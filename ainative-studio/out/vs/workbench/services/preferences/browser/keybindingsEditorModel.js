/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var KeybindingsEditorModel_1;
import { localize } from '../../../../nls.js';
import { distinct, coalesce } from '../../../../base/common/arrays.js';
import * as strings from '../../../../base/common/strings.js';
import { Language } from '../../../../base/common/platform.js';
import { or, matchesContiguousSubString, matchesPrefix, matchesCamelCase, matchesWords } from '../../../../base/common/filters.js';
import { AriaLabelProvider, UserSettingsLabelProvider, UILabelProvider } from '../../../../base/common/keybindingLabels.js';
import { MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ResolvedKeybindingItem } from '../../../../platform/keybinding/common/resolvedKeybindingItem.js';
import { getAllUnboundCommands } from '../../keybinding/browser/unboundCommands.js';
import { isEmptyObject, isString } from '../../../../base/common/types.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ExtensionIdentifier, ExtensionIdentifierMap } from '../../../../platform/extensions/common/extensions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
export const KEYBINDING_ENTRY_TEMPLATE_ID = 'keybinding.entry.template';
const SOURCE_SYSTEM = localize('default', "System");
const SOURCE_EXTENSION = localize('extension', "Extension");
const SOURCE_USER = localize('user', "User");
export function createKeybindingCommandQuery(commandId, when) {
    const whenPart = when ? ` +when:${when}` : '';
    return `@command:${commandId}${whenPart}`;
}
const wordFilter = or(matchesPrefix, matchesWords, matchesContiguousSubString);
const COMMAND_REGEX = /@command:\s*([^\+]+)/i;
const WHEN_REGEX = /\+when:\s*(.+)/i;
const SOURCE_REGEX = /@source:\s*(user|default|system|extension)/i;
const EXTENSION_REGEX = /@ext:\s*((".+")|([^\s]+))/i;
const KEYBINDING_REGEX = /@keybinding:\s*((\".+\")|(\S+))/i;
let KeybindingsEditorModel = KeybindingsEditorModel_1 = class KeybindingsEditorModel extends EditorModel {
    constructor(os, keybindingsService, extensionService) {
        super();
        this.keybindingsService = keybindingsService;
        this.extensionService = extensionService;
        this._keybindingItems = [];
        this._keybindingItemsSortedByPrecedence = [];
        this.modifierLabels = {
            ui: UILabelProvider.modifierLabels[os],
            aria: AriaLabelProvider.modifierLabels[os],
            user: UserSettingsLabelProvider.modifierLabels[os]
        };
    }
    fetch(searchValue, sortByPrecedence = false) {
        let keybindingItems = sortByPrecedence ? this._keybindingItemsSortedByPrecedence : this._keybindingItems;
        // @command:COMMAND_ID
        const commandIdMatches = COMMAND_REGEX.exec(searchValue);
        if (commandIdMatches && commandIdMatches[1]) {
            const command = commandIdMatches[1].trim();
            let filteredKeybindingItems = keybindingItems.filter(k => k.command === command);
            // +when:WHEN_EXPRESSION
            if (filteredKeybindingItems.length) {
                const whenMatches = WHEN_REGEX.exec(searchValue);
                if (whenMatches && whenMatches[1]) {
                    const whenValue = whenMatches[1].trim();
                    filteredKeybindingItems = this.filterByWhen(filteredKeybindingItems, command, whenValue);
                }
            }
            return filteredKeybindingItems.map((keybindingItem) => ({ id: KeybindingsEditorModel_1.getId(keybindingItem), keybindingItem, templateId: KEYBINDING_ENTRY_TEMPLATE_ID }));
        }
        // @source:SOURCE
        if (SOURCE_REGEX.test(searchValue)) {
            keybindingItems = this.filterBySource(keybindingItems, searchValue);
            searchValue = searchValue.replace(SOURCE_REGEX, '');
        }
        else {
            // @ext:EXTENSION_ID
            const extensionMatches = EXTENSION_REGEX.exec(searchValue);
            if (extensionMatches && (extensionMatches[2] || extensionMatches[3])) {
                const extensionId = extensionMatches[2] ? extensionMatches[2].substring(1, extensionMatches[2].length - 1) : extensionMatches[3];
                keybindingItems = this.filterByExtension(keybindingItems, extensionId);
                searchValue = searchValue.replace(EXTENSION_REGEX, '');
            }
            else {
                // @keybinding:KEYBINDING
                const keybindingMatches = KEYBINDING_REGEX.exec(searchValue);
                if (keybindingMatches && (keybindingMatches[2] || keybindingMatches[3])) {
                    searchValue = keybindingMatches[2] || `"${keybindingMatches[3]}"`;
                }
            }
        }
        searchValue = searchValue.trim();
        if (!searchValue) {
            return keybindingItems.map((keybindingItem) => ({ id: KeybindingsEditorModel_1.getId(keybindingItem), keybindingItem, templateId: KEYBINDING_ENTRY_TEMPLATE_ID }));
        }
        return this.filterByText(keybindingItems, searchValue);
    }
    filterBySource(keybindingItems, searchValue) {
        if (/@source:\s*default/i.test(searchValue) || /@source:\s*system/i.test(searchValue)) {
            return keybindingItems.filter(k => k.source === SOURCE_SYSTEM);
        }
        if (/@source:\s*user/i.test(searchValue)) {
            return keybindingItems.filter(k => k.source === SOURCE_USER);
        }
        if (/@source:\s*extension/i.test(searchValue)) {
            return keybindingItems.filter(k => !isString(k.source) || k.source === SOURCE_EXTENSION);
        }
        return keybindingItems;
    }
    filterByExtension(keybindingItems, extension) {
        extension = extension.toLowerCase().trim();
        return keybindingItems.filter(k => !isString(k.source) && (ExtensionIdentifier.equals(k.source.identifier, extension) || k.source.displayName?.toLowerCase() === extension.toLowerCase()));
    }
    filterByText(keybindingItems, searchValue) {
        const quoteAtFirstChar = searchValue.charAt(0) === '"';
        const quoteAtLastChar = searchValue.charAt(searchValue.length - 1) === '"';
        const completeMatch = quoteAtFirstChar && quoteAtLastChar;
        if (quoteAtFirstChar) {
            searchValue = searchValue.substring(1);
        }
        if (quoteAtLastChar) {
            searchValue = searchValue.substring(0, searchValue.length - 1);
        }
        searchValue = searchValue.trim();
        const result = [];
        const words = searchValue.split(' ');
        const keybindingWords = this.splitKeybindingWords(words);
        for (const keybindingItem of keybindingItems) {
            const keybindingMatches = new KeybindingItemMatches(this.modifierLabels, keybindingItem, searchValue, words, keybindingWords, completeMatch);
            if (keybindingMatches.commandIdMatches
                || keybindingMatches.commandLabelMatches
                || keybindingMatches.commandDefaultLabelMatches
                || keybindingMatches.sourceMatches
                || keybindingMatches.whenMatches
                || keybindingMatches.keybindingMatches
                || keybindingMatches.extensionIdMatches
                || keybindingMatches.extensionLabelMatches) {
                result.push({
                    id: KeybindingsEditorModel_1.getId(keybindingItem),
                    templateId: KEYBINDING_ENTRY_TEMPLATE_ID,
                    commandLabelMatches: keybindingMatches.commandLabelMatches || undefined,
                    commandDefaultLabelMatches: keybindingMatches.commandDefaultLabelMatches || undefined,
                    keybindingItem,
                    keybindingMatches: keybindingMatches.keybindingMatches || undefined,
                    commandIdMatches: keybindingMatches.commandIdMatches || undefined,
                    sourceMatches: keybindingMatches.sourceMatches || undefined,
                    whenMatches: keybindingMatches.whenMatches || undefined,
                    extensionIdMatches: keybindingMatches.extensionIdMatches || undefined,
                    extensionLabelMatches: keybindingMatches.extensionLabelMatches || undefined
                });
            }
        }
        return result;
    }
    filterByWhen(keybindingItems, command, when) {
        if (keybindingItems.length === 0) {
            return [];
        }
        // Check if a keybinding with the same command id and when clause exists
        const keybindingItemsWithWhen = keybindingItems.filter(k => k.when === when);
        if (keybindingItemsWithWhen.length) {
            return keybindingItemsWithWhen;
        }
        // Create a new entry with the when clause which does not live in the model
        // We can reuse some of the properties from the same command with different when clause
        const commandLabel = keybindingItems[0].commandLabel;
        const keybindingItem = new ResolvedKeybindingItem(undefined, command, null, ContextKeyExpr.deserialize(when), false, null, false);
        const actionLabels = new Map([[command, commandLabel]]);
        return [KeybindingsEditorModel_1.toKeybindingEntry(command, keybindingItem, actionLabels, this.getExtensionsMapping())];
    }
    splitKeybindingWords(wordsSeparatedBySpaces) {
        const result = [];
        for (const word of wordsSeparatedBySpaces) {
            result.push(...coalesce(word.split('+')));
        }
        return result;
    }
    async resolve(actionLabels = new Map()) {
        const extensions = this.getExtensionsMapping();
        this._keybindingItemsSortedByPrecedence = [];
        const boundCommands = new Map();
        for (const keybinding of this.keybindingsService.getKeybindings()) {
            if (keybinding.command) { // Skip keybindings without commands
                this._keybindingItemsSortedByPrecedence.push(KeybindingsEditorModel_1.toKeybindingEntry(keybinding.command, keybinding, actionLabels, extensions));
                boundCommands.set(keybinding.command, true);
            }
        }
        const commandsWithDefaultKeybindings = this.keybindingsService.getDefaultKeybindings().map(keybinding => keybinding.command);
        for (const command of getAllUnboundCommands(boundCommands)) {
            const keybindingItem = new ResolvedKeybindingItem(undefined, command, null, undefined, commandsWithDefaultKeybindings.indexOf(command) === -1, null, false);
            this._keybindingItemsSortedByPrecedence.push(KeybindingsEditorModel_1.toKeybindingEntry(command, keybindingItem, actionLabels, extensions));
        }
        this._keybindingItemsSortedByPrecedence = distinct(this._keybindingItemsSortedByPrecedence, keybindingItem => KeybindingsEditorModel_1.getId(keybindingItem));
        this._keybindingItems = this._keybindingItemsSortedByPrecedence.slice(0).sort((a, b) => KeybindingsEditorModel_1.compareKeybindingData(a, b));
        return super.resolve();
    }
    static getId(keybindingItem) {
        return keybindingItem.command + (keybindingItem?.keybinding?.getAriaLabel() ?? '') + keybindingItem.when + (isString(keybindingItem.source) ? keybindingItem.source : keybindingItem.source.identifier.value);
    }
    getExtensionsMapping() {
        const extensions = new ExtensionIdentifierMap();
        for (const extension of this.extensionService.extensions) {
            extensions.set(extension.identifier, extension);
        }
        return extensions;
    }
    static compareKeybindingData(a, b) {
        if (a.keybinding && !b.keybinding) {
            return -1;
        }
        if (b.keybinding && !a.keybinding) {
            return 1;
        }
        if (a.commandLabel && !b.commandLabel) {
            return -1;
        }
        if (b.commandLabel && !a.commandLabel) {
            return 1;
        }
        if (a.commandLabel && b.commandLabel) {
            if (a.commandLabel !== b.commandLabel) {
                return a.commandLabel.localeCompare(b.commandLabel);
            }
        }
        if (a.command === b.command) {
            return a.keybindingItem.isDefault ? 1 : -1;
        }
        return a.command.localeCompare(b.command);
    }
    static toKeybindingEntry(command, keybindingItem, actions, extensions) {
        const menuCommand = MenuRegistry.getCommand(command);
        const editorActionLabel = actions.get(command);
        let source = SOURCE_USER;
        if (keybindingItem.isDefault) {
            const extensionId = keybindingItem.extensionId ?? (keybindingItem.resolvedKeybinding ? undefined : menuCommand?.source?.id);
            source = extensionId ? extensions.get(extensionId) ?? SOURCE_EXTENSION : SOURCE_SYSTEM;
        }
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            keybinding: keybindingItem.resolvedKeybinding,
            keybindingItem,
            command,
            commandLabel: KeybindingsEditorModel_1.getCommandLabel(menuCommand, editorActionLabel),
            commandDefaultLabel: KeybindingsEditorModel_1.getCommandDefaultLabel(menuCommand),
            when: keybindingItem.when ? keybindingItem.when.serialize() : '',
            source
        };
    }
    static getCommandDefaultLabel(menuCommand) {
        if (!Language.isDefaultVariant()) {
            if (menuCommand && menuCommand.title && menuCommand.title.original) {
                const category = menuCommand.category ? menuCommand.category.original : undefined;
                const title = menuCommand.title.original;
                return category ? localize('cat.title', "{0}: {1}", category, title) : title;
            }
        }
        return null;
    }
    static getCommandLabel(menuCommand, editorActionLabel) {
        if (menuCommand) {
            const category = menuCommand.category ? typeof menuCommand.category === 'string' ? menuCommand.category : menuCommand.category.value : undefined;
            const title = typeof menuCommand.title === 'string' ? menuCommand.title : menuCommand.title.value;
            return category ? localize('cat.title', "{0}: {1}", category, title) : title;
        }
        if (editorActionLabel) {
            return editorActionLabel;
        }
        return '';
    }
};
KeybindingsEditorModel = KeybindingsEditorModel_1 = __decorate([
    __param(1, IKeybindingService),
    __param(2, IExtensionService)
], KeybindingsEditorModel);
export { KeybindingsEditorModel };
class KeybindingItemMatches {
    constructor(modifierLabels, keybindingItem, searchValue, words, keybindingWords, completeMatch) {
        this.modifierLabels = modifierLabels;
        this.commandIdMatches = null;
        this.commandLabelMatches = null;
        this.commandDefaultLabelMatches = null;
        this.sourceMatches = null;
        this.whenMatches = null;
        this.keybindingMatches = null;
        this.extensionIdMatches = null;
        this.extensionLabelMatches = null;
        if (!completeMatch) {
            this.commandIdMatches = this.matches(searchValue, keybindingItem.command, or(matchesWords, matchesCamelCase), words);
            this.commandLabelMatches = keybindingItem.commandLabel ? this.matches(searchValue, keybindingItem.commandLabel, (word, wordToMatchAgainst) => matchesWords(word, keybindingItem.commandLabel, true), words) : null;
            this.commandDefaultLabelMatches = keybindingItem.commandDefaultLabel ? this.matches(searchValue, keybindingItem.commandDefaultLabel, (word, wordToMatchAgainst) => matchesWords(word, keybindingItem.commandDefaultLabel, true), words) : null;
            this.whenMatches = keybindingItem.when ? this.matches(null, keybindingItem.when, or(matchesWords, matchesCamelCase), words) : null;
            if (isString(keybindingItem.source)) {
                this.sourceMatches = this.matches(searchValue, keybindingItem.source, (word, wordToMatchAgainst) => matchesWords(word, keybindingItem.source, true), words);
            }
            else {
                this.extensionLabelMatches = keybindingItem.source.displayName ? this.matches(searchValue, keybindingItem.source.displayName, (word, wordToMatchAgainst) => matchesWords(word, keybindingItem.commandLabel, true), words) : null;
            }
        }
        this.keybindingMatches = keybindingItem.keybinding ? this.matchesKeybinding(keybindingItem.keybinding, searchValue, keybindingWords, completeMatch) : null;
    }
    matches(searchValue, wordToMatchAgainst, wordMatchesFilter, words) {
        let matches = searchValue ? wordFilter(searchValue, wordToMatchAgainst) : null;
        if (!matches) {
            matches = this.matchesWords(words, wordToMatchAgainst, wordMatchesFilter);
        }
        if (matches) {
            matches = this.filterAndSort(matches);
        }
        return matches;
    }
    matchesWords(words, wordToMatchAgainst, wordMatchesFilter) {
        let matches = [];
        for (const word of words) {
            const wordMatches = wordMatchesFilter(word, wordToMatchAgainst);
            if (wordMatches) {
                matches = [...(matches || []), ...wordMatches];
            }
            else {
                matches = null;
                break;
            }
        }
        return matches;
    }
    filterAndSort(matches) {
        return distinct(matches, (a => a.start + '.' + a.end)).filter(match => !matches.some(m => !(m.start === match.start && m.end === match.end) && (m.start <= match.start && m.end >= match.end))).sort((a, b) => a.start - b.start);
    }
    matchesKeybinding(keybinding, searchValue, words, completeMatch) {
        const [firstPart, chordPart] = keybinding.getChords();
        const userSettingsLabel = keybinding.getUserSettingsLabel();
        const ariaLabel = keybinding.getAriaLabel();
        const label = keybinding.getLabel();
        if ((userSettingsLabel && strings.compareIgnoreCase(searchValue, userSettingsLabel) === 0)
            || (ariaLabel && strings.compareIgnoreCase(searchValue, ariaLabel) === 0)
            || (label && strings.compareIgnoreCase(searchValue, label) === 0)) {
            return {
                firstPart: this.createCompleteMatch(firstPart),
                chordPart: this.createCompleteMatch(chordPart)
            };
        }
        const firstPartMatch = {};
        let chordPartMatch = {};
        const matchedWords = [];
        const firstPartMatchedWords = [];
        let chordPartMatchedWords = [];
        let matchFirstPart = true;
        for (let index = 0; index < words.length; index++) {
            const word = words[index];
            let firstPartMatched = false;
            let chordPartMatched = false;
            matchFirstPart = matchFirstPart && !firstPartMatch.keyCode;
            let matchChordPart = !chordPartMatch.keyCode;
            if (matchFirstPart) {
                firstPartMatched = this.matchPart(firstPart, firstPartMatch, word, completeMatch);
                if (firstPartMatch.keyCode) {
                    for (const cordPartMatchedWordIndex of chordPartMatchedWords) {
                        if (firstPartMatchedWords.indexOf(cordPartMatchedWordIndex) === -1) {
                            matchedWords.splice(matchedWords.indexOf(cordPartMatchedWordIndex), 1);
                        }
                    }
                    chordPartMatch = {};
                    chordPartMatchedWords = [];
                    matchChordPart = false;
                }
            }
            if (matchChordPart) {
                chordPartMatched = this.matchPart(chordPart, chordPartMatch, word, completeMatch);
            }
            if (firstPartMatched) {
                firstPartMatchedWords.push(index);
            }
            if (chordPartMatched) {
                chordPartMatchedWords.push(index);
            }
            if (firstPartMatched || chordPartMatched) {
                matchedWords.push(index);
            }
            matchFirstPart = matchFirstPart && this.isModifier(word);
        }
        if (matchedWords.length !== words.length) {
            return null;
        }
        if (completeMatch) {
            if (!this.isCompleteMatch(firstPart, firstPartMatch)) {
                return null;
            }
            if (!isEmptyObject(chordPartMatch) && !this.isCompleteMatch(chordPart, chordPartMatch)) {
                return null;
            }
        }
        return this.hasAnyMatch(firstPartMatch) || this.hasAnyMatch(chordPartMatch) ? { firstPart: firstPartMatch, chordPart: chordPartMatch } : null;
    }
    matchPart(chord, match, word, completeMatch) {
        let matched = false;
        if (this.matchesMetaModifier(chord, word)) {
            matched = true;
            match.metaKey = true;
        }
        if (this.matchesCtrlModifier(chord, word)) {
            matched = true;
            match.ctrlKey = true;
        }
        if (this.matchesShiftModifier(chord, word)) {
            matched = true;
            match.shiftKey = true;
        }
        if (this.matchesAltModifier(chord, word)) {
            matched = true;
            match.altKey = true;
        }
        if (this.matchesKeyCode(chord, word, completeMatch)) {
            match.keyCode = true;
            matched = true;
        }
        return matched;
    }
    matchesKeyCode(chord, word, completeMatch) {
        if (!chord) {
            return false;
        }
        const ariaLabel = chord.keyAriaLabel || '';
        if (completeMatch || ariaLabel.length === 1 || word.length === 1) {
            if (strings.compareIgnoreCase(ariaLabel, word) === 0) {
                return true;
            }
        }
        else {
            if (matchesContiguousSubString(word, ariaLabel)) {
                return true;
            }
        }
        return false;
    }
    matchesMetaModifier(chord, word) {
        if (!chord) {
            return false;
        }
        if (!chord.metaKey) {
            return false;
        }
        return this.wordMatchesMetaModifier(word);
    }
    matchesCtrlModifier(chord, word) {
        if (!chord) {
            return false;
        }
        if (!chord.ctrlKey) {
            return false;
        }
        return this.wordMatchesCtrlModifier(word);
    }
    matchesShiftModifier(chord, word) {
        if (!chord) {
            return false;
        }
        if (!chord.shiftKey) {
            return false;
        }
        return this.wordMatchesShiftModifier(word);
    }
    matchesAltModifier(chord, word) {
        if (!chord) {
            return false;
        }
        if (!chord.altKey) {
            return false;
        }
        return this.wordMatchesAltModifier(word);
    }
    hasAnyMatch(keybindingMatch) {
        return !!keybindingMatch.altKey ||
            !!keybindingMatch.ctrlKey ||
            !!keybindingMatch.metaKey ||
            !!keybindingMatch.shiftKey ||
            !!keybindingMatch.keyCode;
    }
    isCompleteMatch(chord, match) {
        if (!chord) {
            return true;
        }
        if (!match.keyCode) {
            return false;
        }
        if (chord.metaKey && !match.metaKey) {
            return false;
        }
        if (chord.altKey && !match.altKey) {
            return false;
        }
        if (chord.ctrlKey && !match.ctrlKey) {
            return false;
        }
        if (chord.shiftKey && !match.shiftKey) {
            return false;
        }
        return true;
    }
    createCompleteMatch(chord) {
        const match = {};
        if (chord) {
            match.keyCode = true;
            if (chord.metaKey) {
                match.metaKey = true;
            }
            if (chord.altKey) {
                match.altKey = true;
            }
            if (chord.ctrlKey) {
                match.ctrlKey = true;
            }
            if (chord.shiftKey) {
                match.shiftKey = true;
            }
        }
        return match;
    }
    isModifier(word) {
        if (this.wordMatchesAltModifier(word)) {
            return true;
        }
        if (this.wordMatchesCtrlModifier(word)) {
            return true;
        }
        if (this.wordMatchesMetaModifier(word)) {
            return true;
        }
        if (this.wordMatchesShiftModifier(word)) {
            return true;
        }
        return false;
    }
    wordMatchesAltModifier(word) {
        if (strings.equalsIgnoreCase(this.modifierLabels.ui.altKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.aria.altKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.user.altKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(localize('option', "option"), word)) {
            return true;
        }
        return false;
    }
    wordMatchesCtrlModifier(word) {
        if (strings.equalsIgnoreCase(this.modifierLabels.ui.ctrlKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.aria.ctrlKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.user.ctrlKey, word)) {
            return true;
        }
        return false;
    }
    wordMatchesMetaModifier(word) {
        if (strings.equalsIgnoreCase(this.modifierLabels.ui.metaKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.aria.metaKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.user.metaKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(localize('meta', "meta"), word)) {
            return true;
        }
        return false;
    }
    wordMatchesShiftModifier(word) {
        if (strings.equalsIgnoreCase(this.modifierLabels.ui.shiftKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.aria.shiftKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.user.shiftKey, word)) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcmVmZXJlbmNlcy9icm93c2VyL2tleWJpbmRpbmdzRWRpdG9yTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFtQixRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRixPQUFPLEVBQW1CLEVBQUUsRUFBRSwwQkFBMEIsRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFcEosT0FBTyxFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixFQUFFLGVBQWUsRUFBK0IsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6SixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBR3BGLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNB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