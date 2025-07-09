/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { IntervalTimer, TimeoutTimer } from '../../../base/common/async.js';
import { illegalState } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { IME } from '../../../base/common/ime.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as nls from '../../../nls.js';
import { NoMatchingKb } from './keybindingResolver.js';
const HIGH_FREQ_COMMANDS = /^(cursor|delete|undo|redo|tab|editor\.action\.clipboard)/;
export class AbstractKeybindingService extends Disposable {
    get onDidUpdateKeybindings() {
        return this._onDidUpdateKeybindings ? this._onDidUpdateKeybindings.event : Event.None; // Sinon stubbing walks properties on prototype
    }
    get inChordMode() {
        return this._currentChords.length > 0;
    }
    constructor(_contextKeyService, _commandService, _telemetryService, _notificationService, _logService) {
        super();
        this._contextKeyService = _contextKeyService;
        this._commandService = _commandService;
        this._telemetryService = _telemetryService;
        this._notificationService = _notificationService;
        this._logService = _logService;
        this._onDidUpdateKeybindings = this._register(new Emitter());
        this._currentChords = [];
        this._currentChordChecker = new IntervalTimer();
        this._currentChordStatusMessage = null;
        this._ignoreSingleModifiers = KeybindingModifierSet.EMPTY;
        this._currentSingleModifier = null;
        this._currentSingleModifierClearTimeout = new TimeoutTimer();
        this._currentlyDispatchingCommandId = null;
        this._logging = false;
    }
    dispose() {
        super.dispose();
    }
    getDefaultKeybindingsContent() {
        return '';
    }
    toggleLogging() {
        this._logging = !this._logging;
        return this._logging;
    }
    _log(str) {
        if (this._logging) {
            this._logService.info(`[KeybindingService]: ${str}`);
        }
    }
    getDefaultKeybindings() {
        return this._getResolver().getDefaultKeybindings();
    }
    getKeybindings() {
        return this._getResolver().getKeybindings();
    }
    customKeybindingsCount() {
        return 0;
    }
    lookupKeybindings(commandId) {
        return arrays.coalesce(this._getResolver().lookupKeybindings(commandId).map(item => item.resolvedKeybinding));
    }
    lookupKeybinding(commandId, context, enforceContextCheck = false) {
        const result = this._getResolver().lookupPrimaryKeybinding(commandId, context || this._contextKeyService, enforceContextCheck);
        if (!result) {
            return undefined;
        }
        return result.resolvedKeybinding;
    }
    dispatchEvent(e, target) {
        return this._dispatch(e, target);
    }
    // TODO@ulugbekna: update namings to align with `_doDispatch`
    // TODO@ulugbekna: this fn doesn't seem to take into account single-modifier keybindings, eg `shift shift`
    softDispatch(e, target) {
        this._log(`/ Soft dispatching keyboard event`);
        const keybinding = this.resolveKeyboardEvent(e);
        if (keybinding.hasMultipleChords()) {
            console.warn('keyboard event should not be mapped to multiple chords');
            return NoMatchingKb;
        }
        const [firstChord,] = keybinding.getDispatchChords();
        if (firstChord === null) {
            // cannot be dispatched, probably only modifier keys
            this._log(`\\ Keyboard event cannot be dispatched`);
            return NoMatchingKb;
        }
        const contextValue = this._contextKeyService.getContext(target);
        const currentChords = this._currentChords.map((({ keypress }) => keypress));
        return this._getResolver().resolve(contextValue, currentChords, firstChord);
    }
    _scheduleLeaveChordMode() {
        const chordLastInteractedTime = Date.now();
        this._currentChordChecker.cancelAndSet(() => {
            if (!this._documentHasFocus()) {
                // Focus has been lost => leave chord mode
                this._leaveChordMode();
                return;
            }
            if (Date.now() - chordLastInteractedTime > 5000) {
                // 5 seconds elapsed => leave chord mode
                this._leaveChordMode();
            }
        }, 500);
    }
    _expectAnotherChord(firstChord, keypressLabel) {
        this._currentChords.push({ keypress: firstChord, label: keypressLabel });
        switch (this._currentChords.length) {
            case 0:
                throw illegalState('impossible');
            case 1:
                // TODO@ulugbekna: revise this message and the one below (at least, fix terminology)
                this._currentChordStatusMessage = this._notificationService.status(nls.localize('first.chord', "({0}) was pressed. Waiting for second key of chord...", keypressLabel));
                break;
            default: {
                const fullKeypressLabel = this._currentChords.map(({ label }) => label).join(', ');
                this._currentChordStatusMessage = this._notificationService.status(nls.localize('next.chord', "({0}) was pressed. Waiting for next key of chord...", fullKeypressLabel));
            }
        }
        this._scheduleLeaveChordMode();
        if (IME.enabled) {
            IME.disable();
        }
    }
    _leaveChordMode() {
        if (this._currentChordStatusMessage) {
            this._currentChordStatusMessage.dispose();
            this._currentChordStatusMessage = null;
        }
        this._currentChordChecker.cancel();
        this._currentChords = [];
        IME.enable();
    }
    dispatchByUserSettingsLabel(userSettingsLabel, target) {
        this._log(`/ Dispatching keybinding triggered via menu entry accelerator - ${userSettingsLabel}`);
        const keybindings = this.resolveUserBinding(userSettingsLabel);
        if (keybindings.length === 0) {
            this._log(`\\ Could not resolve - ${userSettingsLabel}`);
        }
        else {
            this._doDispatch(keybindings[0], target, /*isSingleModiferChord*/ false);
        }
    }
    _dispatch(e, target) {
        return this._doDispatch(this.resolveKeyboardEvent(e), target, /*isSingleModiferChord*/ false);
    }
    _singleModifierDispatch(e, target) {
        const keybinding = this.resolveKeyboardEvent(e);
        const [singleModifier,] = keybinding.getSingleModifierDispatchChords();
        if (singleModifier) {
            if (this._ignoreSingleModifiers.has(singleModifier)) {
                this._log(`+ Ignoring single modifier ${singleModifier} due to it being pressed together with other keys.`);
                this._ignoreSingleModifiers = KeybindingModifierSet.EMPTY;
                this._currentSingleModifierClearTimeout.cancel();
                this._currentSingleModifier = null;
                return false;
            }
            this._ignoreSingleModifiers = KeybindingModifierSet.EMPTY;
            if (this._currentSingleModifier === null) {
                // we have a valid `singleModifier`, store it for the next keyup, but clear it in 300ms
                this._log(`+ Storing single modifier for possible chord ${singleModifier}.`);
                this._currentSingleModifier = singleModifier;
                this._currentSingleModifierClearTimeout.cancelAndSet(() => {
                    this._log(`+ Clearing single modifier due to 300ms elapsed.`);
                    this._currentSingleModifier = null;
                }, 300);
                return false;
            }
            if (singleModifier === this._currentSingleModifier) {
                // bingo!
                this._log(`/ Dispatching single modifier chord ${singleModifier} ${singleModifier}`);
                this._currentSingleModifierClearTimeout.cancel();
                this._currentSingleModifier = null;
                return this._doDispatch(keybinding, target, /*isSingleModiferChord*/ true);
            }
            this._log(`+ Clearing single modifier due to modifier mismatch: ${this._currentSingleModifier} ${singleModifier}`);
            this._currentSingleModifierClearTimeout.cancel();
            this._currentSingleModifier = null;
            return false;
        }
        // When pressing a modifier and holding it pressed with any other modifier or key combination,
        // the pressed modifiers should no longer be considered for single modifier dispatch.
        const [firstChord,] = keybinding.getChords();
        this._ignoreSingleModifiers = new KeybindingModifierSet(firstChord);
        if (this._currentSingleModifier !== null) {
            this._log(`+ Clearing single modifier due to other key up.`);
        }
        this._currentSingleModifierClearTimeout.cancel();
        this._currentSingleModifier = null;
        return false;
    }
    _doDispatch(userKeypress, target, isSingleModiferChord = false) {
        let shouldPreventDefault = false;
        if (userKeypress.hasMultipleChords()) { // warn - because user can press a single chord at a time
            console.warn('Unexpected keyboard event mapped to multiple chords');
            return false;
        }
        let userPressedChord = null;
        let currentChords = null;
        if (isSingleModiferChord) {
            // The keybinding is the second keypress of a single modifier chord, e.g. "shift shift".
            // A single modifier can only occur when the same modifier is pressed in short sequence,
            // hence we disregard `_currentChord` and use the same modifier instead.
            const [dispatchKeyname,] = userKeypress.getSingleModifierDispatchChords();
            userPressedChord = dispatchKeyname;
            currentChords = dispatchKeyname ? [dispatchKeyname] : []; // TODO@ulugbekna: in the `else` case we assign an empty array - make sure `resolve` can handle an empty array well
        }
        else {
            [userPressedChord,] = userKeypress.getDispatchChords();
            currentChords = this._currentChords.map(({ keypress }) => keypress);
        }
        if (userPressedChord === null) {
            this._log(`\\ Keyboard event cannot be dispatched in keydown phase.`);
            // cannot be dispatched, probably only modifier keys
            return shouldPreventDefault;
        }
        const contextValue = this._contextKeyService.getContext(target);
        const keypressLabel = userKeypress.getLabel();
        const resolveResult = this._getResolver().resolve(contextValue, currentChords, userPressedChord);
        switch (resolveResult.kind) {
            case 0 /* ResultKind.NoMatchingKb */: {
                this._logService.trace('KeybindingService#dispatch', keypressLabel, `[ No matching keybinding ]`);
                if (this.inChordMode) {
                    const currentChordsLabel = this._currentChords.map(({ label }) => label).join(', ');
                    this._log(`+ Leaving multi-chord mode: Nothing bound to "${currentChordsLabel}, ${keypressLabel}".`);
                    this._notificationService.status(nls.localize('missing.chord', "The key combination ({0}, {1}) is not a command.", currentChordsLabel, keypressLabel), { hideAfter: 10 * 1000 /* 10s */ });
                    this._leaveChordMode();
                    shouldPreventDefault = true;
                }
                return shouldPreventDefault;
            }
            case 1 /* ResultKind.MoreChordsNeeded */: {
                this._logService.trace('KeybindingService#dispatch', keypressLabel, `[ Several keybindings match - more chords needed ]`);
                shouldPreventDefault = true;
                this._expectAnotherChord(userPressedChord, keypressLabel);
                this._log(this._currentChords.length === 1 ? `+ Entering multi-chord mode...` : `+ Continuing multi-chord mode...`);
                return shouldPreventDefault;
            }
            case 2 /* ResultKind.KbFound */: {
                this._logService.trace('KeybindingService#dispatch', keypressLabel, `[ Will dispatch command ${resolveResult.commandId} ]`);
                if (resolveResult.commandId === null || resolveResult.commandId === '') {
                    if (this.inChordMode) {
                        const currentChordsLabel = this._currentChords.map(({ label }) => label).join(', ');
                        this._log(`+ Leaving chord mode: Nothing bound to "${currentChordsLabel}, ${keypressLabel}".`);
                        this._notificationService.status(nls.localize('missing.chord', "The key combination ({0}, {1}) is not a command.", currentChordsLabel, keypressLabel), { hideAfter: 10 * 1000 /* 10s */ });
                        this._leaveChordMode();
                        shouldPreventDefault = true;
                    }
                }
                else {
                    if (this.inChordMode) {
                        this._leaveChordMode();
                    }
                    if (!resolveResult.isBubble) {
                        shouldPreventDefault = true;
                    }
                    this._log(`+ Invoking command ${resolveResult.commandId}.`);
                    this._currentlyDispatchingCommandId = resolveResult.commandId;
                    try {
                        if (typeof resolveResult.commandArgs === 'undefined') {
                            this._commandService.executeCommand(resolveResult.commandId).then(undefined, err => this._notificationService.warn(err));
                        }
                        else {
                            this._commandService.executeCommand(resolveResult.commandId, resolveResult.commandArgs).then(undefined, err => this._notificationService.warn(err));
                        }
                    }
                    finally {
                        this._currentlyDispatchingCommandId = null;
                    }
                    if (!HIGH_FREQ_COMMANDS.test(resolveResult.commandId)) {
                        this._telemetryService.publicLog2('workbenchActionExecuted', { id: resolveResult.commandId, from: 'keybinding', detail: userKeypress.getUserSettingsLabel() ?? undefined });
                    }
                }
                return shouldPreventDefault;
            }
        }
    }
    mightProducePrintableCharacter(event) {
        if (event.ctrlKey || event.metaKey) {
            // ignore ctrl/cmd-combination but not shift/alt-combinatios
            return false;
        }
        // weak check for certain ranges. this is properly implemented in a subclass
        // with access to the KeyboardMapperFactory.
        if ((event.keyCode >= 31 /* KeyCode.KeyA */ && event.keyCode <= 56 /* KeyCode.KeyZ */)
            || (event.keyCode >= 21 /* KeyCode.Digit0 */ && event.keyCode <= 30 /* KeyCode.Digit9 */)) {
            return true;
        }
        return false;
    }
}
class KeybindingModifierSet {
    static { this.EMPTY = new KeybindingModifierSet(null); }
    constructor(source) {
        this._ctrlKey = source ? source.ctrlKey : false;
        this._shiftKey = source ? source.shiftKey : false;
        this._altKey = source ? source.altKey : false;
        this._metaKey = source ? source.metaKey : false;
    }
    has(modifier) {
        switch (modifier) {
            case 'ctrl': return this._ctrlKey;
            case 'shift': return this._shiftKey;
            case 'alt': return this._altKey;
            case 'meta': return this._metaKey;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RLZXliaW5kaW5nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXliaW5kaW5nL2NvbW1vbi9hYnN0cmFjdEtleWJpbmRpbmdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUM7QUFDekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFHbEQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFLdkMsT0FBTyxFQUFvRCxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQVd6RyxNQUFNLGtCQUFrQixHQUFHLDBEQUEwRCxDQUFDO0FBRXRGLE1BQU0sT0FBZ0IseUJBQTBCLFNBQVEsVUFBVTtJQUtqRSxJQUFJLHNCQUFzQjtRQUN6QixPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLCtDQUErQztJQUN2SSxDQUFDO0lBb0JELElBQVcsV0FBVztRQUNyQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsWUFDUyxr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