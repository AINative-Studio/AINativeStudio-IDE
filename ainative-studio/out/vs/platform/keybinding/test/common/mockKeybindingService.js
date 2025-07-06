/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { KeyCodeChord } from '../../../../base/common/keybindings.js';
import { OS } from '../../../../base/common/platform.js';
import { NoMatchingKb } from '../../common/keybindingResolver.js';
import { USLayoutResolvedKeybinding } from '../../common/usLayoutResolvedKeybinding.js';
class MockKeybindingContextKey {
    constructor(defaultValue) {
        this._defaultValue = defaultValue;
        this._value = this._defaultValue;
    }
    set(value) {
        this._value = value;
    }
    reset() {
        this._value = this._defaultValue;
    }
    get() {
        return this._value;
    }
}
export class MockContextKeyService {
    constructor() {
        this._keys = new Map();
    }
    dispose() {
        //
    }
    createKey(key, defaultValue) {
        const ret = new MockKeybindingContextKey(defaultValue);
        this._keys.set(key, ret);
        return ret;
    }
    contextMatchesRules(rules) {
        return false;
    }
    get onDidChangeContext() {
        return Event.None;
    }
    bufferChangeEvents(callback) { callback(); }
    getContextKeyValue(key) {
        const value = this._keys.get(key);
        if (value) {
            return value.get();
        }
    }
    getContext(domNode) {
        return null;
    }
    createScoped(domNode) {
        return this;
    }
    createOverlay() {
        return this;
    }
    updateParent(_parentContextKeyService) {
        // no-op
    }
}
export class MockScopableContextKeyService extends MockContextKeyService {
    /**
     * Don't implement this for all tests since we rarely depend on this behavior and it isn't implemented fully
     */
    createScoped(domNote) {
        return new MockScopableContextKeyService();
    }
}
export class MockKeybindingService {
    constructor() {
        this.inChordMode = false;
    }
    get onDidUpdateKeybindings() {
        return Event.None;
    }
    getDefaultKeybindingsContent() {
        return '';
    }
    getDefaultKeybindings() {
        return [];
    }
    getKeybindings() {
        return [];
    }
    resolveKeybinding(keybinding) {
        return USLayoutResolvedKeybinding.resolveKeybinding(keybinding, OS);
    }
    resolveKeyboardEvent(keyboardEvent) {
        const chord = new KeyCodeChord(keyboardEvent.ctrlKey, keyboardEvent.shiftKey, keyboardEvent.altKey, keyboardEvent.metaKey, keyboardEvent.keyCode);
        return this.resolveKeybinding(chord.toKeybinding())[0];
    }
    resolveUserBinding(userBinding) {
        return [];
    }
    lookupKeybindings(commandId) {
        return [];
    }
    lookupKeybinding(commandId) {
        return undefined;
    }
    customKeybindingsCount() {
        return 0;
    }
    softDispatch(keybinding, target) {
        return NoMatchingKb;
    }
    dispatchByUserSettingsLabel(userSettingsLabel, target) {
    }
    dispatchEvent(e, target) {
        return false;
    }
    enableKeybindingHoldMode(commandId) {
        return undefined;
    }
    mightProducePrintableCharacter(e) {
        return false;
    }
    toggleLogging() {
        return false;
    }
    _dumpDebugInfo() {
        return '';
    }
    _dumpDebugInfoJSON() {
        return '';
    }
    registerSchemaContribution() {
        // noop
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0tleWJpbmRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0va2V5YmluZGluZy90ZXN0L2NvbW1vbi9tb2NrS2V5YmluZGluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBc0IsWUFBWSxFQUFjLE1BQU0sd0NBQXdDLENBQUM7QUFDdEcsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBR3pELE9BQU8sRUFBRSxZQUFZLEVBQW9CLE1BQU0sb0NBQW9DLENBQUM7QUFFcEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFeEYsTUFBTSx3QkFBd0I7SUFJN0IsWUFBWSxZQUEyQjtRQUN0QyxJQUFJLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQztRQUNsQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDbEMsQ0FBQztJQUVNLEdBQUcsQ0FBQyxLQUFvQjtRQUM5QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztJQUNyQixDQUFDO0lBRU0sS0FBSztRQUNYLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUNsQyxDQUFDO0lBRU0sR0FBRztRQUNULE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8scUJBQXFCO0lBQWxDO1FBR1MsVUFBSyxHQUFHLElBQUksR0FBRyxFQUE0QixDQUFDO0lBbUNyRCxDQUFDO0lBakNPLE9BQU87UUFDYixFQUFFO0lBQ0gsQ0FBQztJQUNNLFNBQVMsQ0FBOEMsR0FB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