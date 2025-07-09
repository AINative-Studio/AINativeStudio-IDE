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
import { CachedFunction } from '../../../base/common/cache.js';
import { getStructuralKey } from '../../../base/common/equals.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { FileAccess } from '../../../base/common/network.js';
import { derived, observableFromEvent, ValueWithChangeEventFromObservable } from '../../../base/common/observable.js';
import { localize } from '../../../nls.js';
import { IAccessibilityService } from '../../accessibility/common/accessibility.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { observableConfigValue } from '../../observable/common/platformObservableUtils.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
export const IAccessibilitySignalService = createDecorator('accessibilitySignalService');
/** Make sure you understand the doc comments of the method you want to call when using this token! */
export const AcknowledgeDocCommentsToken = Symbol('AcknowledgeDocCommentsToken');
let AccessibilitySignalService = class AccessibilitySignalService extends Disposable {
    constructor(configurationService, accessibilityService, telemetryService) {
        super();
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this.telemetryService = telemetryService;
        this.sounds = new Map();
        this.screenReaderAttached = observableFromEvent(this, this.accessibilityService.onDidChangeScreenReaderOptimized, () => /** @description accessibilityService.onDidChangeScreenReaderOptimized */ this.accessibilityService.isScreenReaderOptimized());
        this.sentTelemetry = new Set();
        this.playingSounds = new Set();
        this._signalConfigValue = new CachedFunction((signal) => observableConfigValue(signal.settingsKey, { sound: 'off', announcement: 'off' }, this.configurationService));
        this._signalEnabledState = new CachedFunction({ getCacheKey: getStructuralKey }, (arg) => {
            return derived(reader => {
                /** @description sound enabled */
                const setting = this._signalConfigValue.get(arg.signal).read(reader);
                if (arg.modality === 'sound' || arg.modality === undefined) {
                    if (checkEnabledState(setting.sound, () => this.screenReaderAttached.read(reader), arg.userGesture)) {
                        return true;
                    }
                }
                if (arg.modality === 'announcement' || arg.modality === undefined) {
                    if (checkEnabledState(setting.announcement, () => this.screenReaderAttached.read(reader), arg.userGesture)) {
                        return true;
                    }
                }
                return false;
            }).recomputeInitiallyAndOnChange(this._store);
        });
    }
    getEnabledState(signal, userGesture, modality) {
        return new ValueWithChangeEventFromObservable(this._signalEnabledState.get({ signal, userGesture, modality }));
    }
    async playSignal(signal, options = {}) {
        const shouldPlayAnnouncement = options.modality === 'announcement' || options.modality === undefined;
        const announcementMessage = signal.announcementMessage;
        if (shouldPlayAnnouncement && this.isAnnouncementEnabled(signal, options.userGesture) && announcementMessage) {
            this.accessibilityService.status(announcementMessage);
        }
        const shouldPlaySound = options.modality === 'sound' || options.modality === undefined;
        if (shouldPlaySound && this.isSoundEnabled(signal, options.userGesture)) {
            this.sendSignalTelemetry(signal, options.source);
            await this.playSound(signal.sound.getSound(), options.allowManyInParallel);
        }
    }
    async playSignals(signals) {
        for (const signal of signals) {
            this.sendSignalTelemetry('signal' in signal ? signal.signal : signal, 'source' in signal ? signal.source : undefined);
        }
        const signalArray = signals.map(s => 'signal' in s ? s.signal : s);
        const announcements = signalArray.filter(signal => this.isAnnouncementEnabled(signal)).map(s => s.announcementMessage);
        if (announcements.length) {
            this.accessibilityService.status(announcements.join(', '));
        }
        // Some sounds are reused. Don't play the same sound twice.
        const sounds = new Set(signalArray.filter(signal => this.isSoundEnabled(signal)).map(signal => signal.sound.getSound()));
        await Promise.all(Array.from(sounds).map(sound => this.playSound(sound, true)));
    }
    sendSignalTelemetry(signal, source) {
        const isScreenReaderOptimized = this.accessibilityService.isScreenReaderOptimized();
        const key = signal.name + (source ? `::${source}` : '') + (isScreenReaderOptimized ? '{screenReaderOptimized}' : '');
        // Only send once per user session
        if (this.sentTelemetry.has(key) || this.getVolumeInPercent() === 0) {
            return;
        }
        this.sentTelemetry.add(key);
        this.telemetryService.publicLog2('signal.played', {
            signal: signal.name,
            source: source ?? '',
            isScreenReaderOptimized,
        });
    }
    getVolumeInPercent() {
        const volume = this.configurationService.getValue('accessibility.signalOptions.volume');
        if (typeof volume !== 'number') {
            return 50;
        }
        return Math.max(Math.min(volume, 100), 0);
    }
    async playSound(sound, allowManyInParallel = false) {
        if (!allowManyInParallel && this.playingSounds.has(sound)) {
            return;
        }
        this.playingSounds.add(sound);
        const url = FileAccess.asBrowserUri(`vs/platform/accessibilitySignal/browser/media/${sound.fileName}`).toString(true);
        try {
            const sound = this.sounds.get(url);
            if (sound) {
                sound.volume = this.getVolumeInPercent() / 100;
                sound.currentTime = 0;
                await sound.play();
            }
            else {
                const playedSound = await playAudio(url, this.getVolumeInPercent() / 100);
                this.sounds.set(url, playedSound);
            }
        }
        catch (e) {
            if (!e.message.includes('play() can only be initiated by a user gesture')) {
                // tracking this issue in #178642, no need to spam the console
                console.error('Error while playing sound', e);
            }
        }
        finally {
            this.playingSounds.delete(sound);
        }
    }
    playSignalLoop(signal, milliseconds) {
        let playing = true;
        const playSound = () => {
            if (playing) {
                this.playSignal(signal, { allowManyInParallel: true }).finally(() => {
                    setTimeout(() => {
                        if (playing) {
                            playSound();
                        }
                    }, milliseconds);
                });
            }
        };
        playSound();
        return toDisposable(() => playing = false);
    }
    isAnnouncementEnabled(signal, userGesture) {
        if (!signal.announcementMessage) {
            return false;
        }
        return this._signalEnabledState.get({ signal, userGesture: !!userGesture, modality: 'announcement' }).get();
    }
    isSoundEnabled(signal, userGesture) {
        return this._signalEnabledState.get({ signal, userGesture: !!userGesture, modality: 'sound' }).get();
    }
    onSoundEnabledChanged(signal) {
        return this.getEnabledState(signal, false).onDidChange;
    }
    getDelayMs(signal, modality, mode) {
        if (!this.configurationService.getValue('accessibility.signalOptions.debouncePositionChanges')) {
            return 0;
        }
        let value;
        if (signal.name === AccessibilitySignal.errorAtPosition.name && mode === 'positional') {
            value = this.configurationService.getValue('accessibility.signalOptions.experimental.delays.errorAtPosition');
        }
        else if (signal.name === AccessibilitySignal.warningAtPosition.name && mode === 'positional') {
            value = this.configurationService.getValue('accessibility.signalOptions.experimental.delays.warningAtPosition');
        }
        else {
            value = this.configurationService.getValue('accessibility.signalOptions.experimental.delays.general');
        }
        return modality === 'sound' ? value.sound : value.announcement;
    }
};
AccessibilitySignalService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IAccessibilityService),
    __param(2, ITelemetryService)
], AccessibilitySignalService);
export { AccessibilitySignalService };
function checkEnabledState(state, getScreenReaderAttached, isTriggeredByUserGesture) {
    return state === 'on' || state === 'always' || (state === 'auto' && getScreenReaderAttached()) || state === 'userGesture' && isTriggeredByUserGesture;
}
/**
 * Play the given audio url.
 * @volume value between 0 and 1
 */
function playAudio(url, volume) {
    return new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.volume = volume;
        audio.addEventListener('ended', () => {
            resolve(audio);
        });
        audio.addEventListener('error', (e) => {
            // When the error event fires, ended might not be called
            reject(e.error);
        });
        audio.play().catch(e => {
            // When play fails, the error event is not fired.
            reject(e);
        });
    });
}
/**
 * Corresponds to the audio files in ./media.
*/
export class Sound {
    static register(options) {
        const sound = new Sound(options.fileName);
        return sound;
    }
    static { this.error = Sound.register({ fileName: 'error.mp3' }); }
    static { this.warning = Sound.register({ fileName: 'warning.mp3' }); }
    static { this.success = Sound.register({ fileName: 'success.mp3' }); }
    static { this.foldedArea = Sound.register({ fileName: 'foldedAreas.mp3' }); }
    static { this.break = Sound.register({ fileName: 'break.mp3' }); }
    static { this.quickFixes = Sound.register({ fileName: 'quickFixes.mp3' }); }
    static { this.taskCompleted = Sound.register({ fileName: 'taskCompleted.mp3' }); }
    static { this.taskFailed = Sound.register({ fileName: 'taskFailed.mp3' }); }
    static { this.terminalBell = Sound.register({ fileName: 'terminalBell.mp3' }); }
    static { this.diffLineInserted = Sound.register({ fileName: 'diffLineInserted.mp3' }); }
    static { this.diffLineDeleted = Sound.register({ fileName: 'diffLineDeleted.mp3' }); }
    static { this.diffLineModified = Sound.register({ fileName: 'diffLineModified.mp3' }); }
    static { this.requestSent = Sound.register({ fileName: 'requestSent.mp3' }); }
    static { this.responseReceived1 = Sound.register({ fileName: 'responseReceived1.mp3' }); }
    static { this.responseReceived2 = Sound.register({ fileName: 'responseReceived2.mp3' }); }
    static { this.responseReceived3 = Sound.register({ fileName: 'responseReceived3.mp3' }); }
    static { this.responseReceived4 = Sound.register({ fileName: 'responseReceived4.mp3' }); }
    static { this.clear = Sound.register({ fileName: 'clear.mp3' }); }
    static { this.save = Sound.register({ fileName: 'save.mp3' }); }
    static { this.format = Sound.register({ fileName: 'format.mp3' }); }
    static { this.voiceRecordingStarted = Sound.register({ fileName: 'voiceRecordingStarted.mp3' }); }
    static { this.voiceRecordingStopped = Sound.register({ fileName: 'voiceRecordingStopped.mp3' }); }
    static { this.progress = Sound.register({ fileName: 'progress.mp3' }); }
    static { this.chatEditModifiedFile = Sound.register({ fileName: 'chatEditModifiedFile.mp3' }); }
    static { this.editsKept = Sound.register({ fileName: 'editsKept.mp3' }); }
    static { this.editsUndone = Sound.register({ fileName: 'editsUndone.mp3' }); }
    constructor(fileName) {
        this.fileName = fileName;
    }
}
export class SoundSource {
    constructor(randomOneOf) {
        this.randomOneOf = randomOneOf;
    }
    getSound(deterministic = false) {
        if (deterministic || this.randomOneOf.length === 1) {
            return this.randomOneOf[0];
        }
        else {
            const index = Math.floor(Math.random() * this.randomOneOf.length);
            return this.randomOneOf[index];
        }
    }
}
export class AccessibilitySignal {
    constructor(sound, name, legacySoundSettingsKey, settingsKey, legacyAnnouncementSettingsKey, announcementMessage) {
        this.sound = sound;
        this.name = name;
        this.legacySoundSettingsKey = legacySoundSettingsKey;
        this.settingsKey = settingsKey;
        this.legacyAnnouncementSettingsKey = legacyAnnouncementSettingsKey;
        this.announcementMessage = announcementMessage;
    }
    static { this._signals = new Set(); }
    static register(options) {
        const soundSource = new SoundSource('randomOneOf' in options.sound ? options.sound.randomOneOf : [options.sound]);
        const signal = new AccessibilitySignal(soundSource, options.name, options.legacySoundSettingsKey, options.settingsKey, options.legacyAnnouncementSettingsKey, options.announcementMessage);
        AccessibilitySignal._signals.add(signal);
        return signal;
    }
    static get allAccessibilitySignals() {
        return [...this._signals];
    }
    static { this.errorAtPosition = AccessibilitySignal.register({
        name: localize('accessibilitySignals.positionHasError.name', 'Error at Position'),
        sound: Sound.error,
        announcementMessage: localize('accessibility.signals.positionHasError', 'Error'),
        settingsKey: 'accessibility.signals.positionHasError',
        delaySettingsKey: 'accessibility.signalOptions.delays.errorAtPosition'
    }); }
    static { this.warningAtPosition = AccessibilitySignal.register({
        name: localize('accessibilitySignals.positionHasWarning.name', 'Warning at Position'),
        sound: Sound.warning,
        announcementMessage: localize('accessibility.signals.positionHasWarning', 'Warning'),
        settingsKey: 'accessibility.signals.positionHasWarning',
        delaySettingsKey: 'accessibility.signalOptions.delays.warningAtPosition'
    }); }
    static { this.errorOnLine = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasError.name', 'Error on Line'),
        sound: Sound.error,
        legacySoundSettingsKey: 'audioCues.lineHasError',
        legacyAnnouncementSettingsKey: 'accessibility.alert.error',
        announcementMessage: localize('accessibility.signals.lineHasError', 'Error on Line'),
        settingsKey: 'accessibility.signals.lineHasError',
    }); }
    static { this.warningOnLine = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasWarning.name', 'Warning on Line'),
        sound: Sound.warning,
        legacySoundSettingsKey: 'audioCues.lineHasWarning',
        legacyAnnouncementSettingsKey: 'accessibility.alert.warning',
        announcementMessage: localize('accessibility.signals.lineHasWarning', 'Warning on Line'),
        settingsKey: 'accessibility.signals.lineHasWarning',
    }); }
    static { this.foldedArea = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasFoldedArea.name', 'Folded Area on Line'),
        sound: Sound.foldedArea,
        legacySoundSettingsKey: 'audioCues.lineHasFoldedArea',
        legacyAnnouncementSettingsKey: 'accessibility.alert.foldedArea',
        announcementMessage: localize('accessibility.signals.lineHasFoldedArea', 'Folded'),
        settingsKey: 'accessibility.signals.lineHasFoldedArea',
    }); }
    static { this.break = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasBreakpoint.name', 'Breakpoint on Line'),
        sound: Sound.break,
        legacySoundSettingsKey: 'audioCues.lineHasBreakpoint',
        legacyAnnouncementSettingsKey: 'accessibility.alert.breakpoint',
        announcementMessage: localize('accessibility.signals.lineHasBreakpoint', 'Breakpoint'),
        settingsKey: 'accessibility.signals.lineHasBreakpoint',
    }); }
    static { this.inlineSuggestion = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasInlineSuggestion.name', 'Inline Suggestion on Line'),
        sound: Sound.quickFixes,
        legacySoundSettingsKey: 'audioCues.lineHasInlineSuggestion',
        settingsKey: 'accessibility.signals.lineHasInlineSuggestion',
    }); }
    static { this.terminalQuickFix = AccessibilitySignal.register({
        name: localize('accessibilitySignals.terminalQuickFix.name', 'Terminal Quick Fix'),
        sound: Sound.quickFixes,
        legacySoundSettingsKey: 'audioCues.terminalQuickFix',
        legacyAnnouncementSettingsKey: 'accessibility.alert.terminalQuickFix',
        announcementMessage: localize('accessibility.signals.terminalQuickFix', 'Quick Fix'),
        settingsKey: 'accessibility.signals.terminalQuickFix',
    }); }
    static { this.onDebugBreak = AccessibilitySignal.register({
        name: localize('accessibilitySignals.onDebugBreak.name', 'Debugger Stopped on Breakpoint'),
        sound: Sound.break,
        legacySoundSettingsKey: 'audioCues.onDebugBreak',
        legacyAnnouncementSettingsKey: 'accessibility.alert.onDebugBreak',
        announcementMessage: localize('accessibility.signals.onDebugBreak', 'Breakpoint'),
        settingsKey: 'accessibility.signals.onDebugBreak',
    }); }
    static { this.noInlayHints = AccessibilitySignal.register({
        name: localize('accessibilitySignals.noInlayHints', 'No Inlay Hints on Line'),
        sound: Sound.error,
        legacySoundSettingsKey: 'audioCues.noInlayHints',
        legacyAnnouncementSettingsKey: 'accessibility.alert.noInlayHints',
        announcementMessage: localize('accessibility.signals.noInlayHints', 'No Inlay Hints'),
        settingsKey: 'accessibility.signals.noInlayHints',
    }); }
    static { this.taskCompleted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.taskCompleted', 'Task Completed'),
        sound: Sound.taskCompleted,
        legacySoundSettingsKey: 'audioCues.taskCompleted',
        legacyAnnouncementSettingsKey: 'accessibility.alert.taskCompleted',
        announcementMessage: localize('accessibility.signals.taskCompleted', 'Task Completed'),
        settingsKey: 'accessibility.signals.taskCompleted',
    }); }
    static { this.taskFailed = AccessibilitySignal.register({
        name: localize('accessibilitySignals.taskFailed', 'Task Failed'),
        sound: Sound.taskFailed,
        legacySoundSettingsKey: 'audioCues.taskFailed',
        legacyAnnouncementSettingsKey: 'accessibility.alert.taskFailed',
        announcementMessage: localize('accessibility.signals.taskFailed', 'Task Failed'),
        settingsKey: 'accessibility.signals.taskFailed',
    }); }
    static { this.terminalCommandFailed = AccessibilitySignal.register({
        name: localize('accessibilitySignals.terminalCommandFailed', 'Terminal Command Failed'),
        sound: Sound.error,
        legacySoundSettingsKey: 'audioCues.terminalCommandFailed',
        legacyAnnouncementSettingsKey: 'accessibility.alert.terminalCommandFailed',
        announcementMessage: localize('accessibility.signals.terminalCommandFailed', 'Command Failed'),
        settingsKey: 'accessibility.signals.terminalCommandFailed',
    }); }
    static { this.terminalCommandSucceeded = AccessibilitySignal.register({
        name: localize('accessibilitySignals.terminalCommandSucceeded', 'Terminal Command Succeeded'),
        sound: Sound.success,
        announcementMessage: localize('accessibility.signals.terminalCommandSucceeded', 'Command Succeeded'),
        settingsKey: 'accessibility.signals.terminalCommandSucceeded',
    }); }
    static { this.terminalBell = AccessibilitySignal.register({
        name: localize('accessibilitySignals.terminalBell', 'Terminal Bell'),
        sound: Sound.terminalBell,
        legacySoundSettingsKey: 'audioCues.terminalBell',
        legacyAnnouncementSettingsKey: 'accessibility.alert.terminalBell',
        announcementMessage: localize('accessibility.signals.terminalBell', 'Terminal Bell'),
        settingsKey: 'accessibility.signals.terminalBell',
    }); }
    static { this.notebookCellCompleted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.notebookCellCompleted', 'Notebook Cell Completed'),
        sound: Sound.taskCompleted,
        legacySoundSettingsKey: 'audioCues.notebookCellCompleted',
        legacyAnnouncementSettingsKey: 'accessibility.alert.notebookCellCompleted',
        announcementMessage: localize('accessibility.signals.notebookCellCompleted', 'Notebook Cell Completed'),
        settingsKey: 'accessibility.signals.notebookCellCompleted',
    }); }
    static { this.notebookCellFailed = AccessibilitySignal.register({
        name: localize('accessibilitySignals.notebookCellFailed', 'Notebook Cell Failed'),
        sound: Sound.taskFailed,
        legacySoundSettingsKey: 'audioCues.notebookCellFailed',
        legacyAnnouncementSettingsKey: 'accessibility.alert.notebookCellFailed',
        announcementMessage: localize('accessibility.signals.notebookCellFailed', 'Notebook Cell Failed'),
        settingsKey: 'accessibility.signals.notebookCellFailed',
    }); }
    static { this.diffLineInserted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.diffLineInserted', 'Diff Line Inserted'),
        sound: Sound.diffLineInserted,
        legacySoundSettingsKey: 'audioCues.diffLineInserted',
        settingsKey: 'accessibility.signals.diffLineInserted',
    }); }
    static { this.diffLineDeleted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.diffLineDeleted', 'Diff Line Deleted'),
        sound: Sound.diffLineDeleted,
        legacySoundSettingsKey: 'audioCues.diffLineDeleted',
        settingsKey: 'accessibility.signals.diffLineDeleted',
    }); }
    static { this.diffLineModified = AccessibilitySignal.register({
        name: localize('accessibilitySignals.diffLineModified', 'Diff Line Modified'),
        sound: Sound.diffLineModified,
        legacySoundSettingsKey: 'audioCues.diffLineModified',
        settingsKey: 'accessibility.signals.diffLineModified',
    }); }
    static { this.chatEditModifiedFile = AccessibilitySignal.register({
        name: localize('accessibilitySignals.chatEditModifiedFile', 'Chat Edit Modified File'),
        sound: Sound.chatEditModifiedFile,
        announcementMessage: localize('accessibility.signals.chatEditModifiedFile', 'File Modified from Chat Edits'),
        settingsKey: 'accessibility.signals.chatEditModifiedFile',
    }); }
    static { this.chatRequestSent = AccessibilitySignal.register({
        name: localize('accessibilitySignals.chatRequestSent', 'Chat Request Sent'),
        sound: Sound.requestSent,
        legacySoundSettingsKey: 'audioCues.chatRequestSent',
        legacyAnnouncementSettingsKey: 'accessibility.alert.chatRequestSent',
        announcementMessage: localize('accessibility.signals.chatRequestSent', 'Chat Request Sent'),
        settingsKey: 'accessibility.signals.chatRequestSent',
    }); }
    static { this.chatResponseReceived = AccessibilitySignal.register({
        name: localize('accessibilitySignals.chatResponseReceived', 'Chat Response Received'),
        legacySoundSettingsKey: 'audioCues.chatResponseReceived',
        sound: {
            randomOneOf: [
                Sound.responseReceived1,
                Sound.responseReceived2,
                Sound.responseReceived3,
                Sound.responseReceived4
            ]
        },
        settingsKey: 'accessibility.signals.chatResponseReceived'
    }); }
    static { this.codeActionTriggered = AccessibilitySignal.register({
        name: localize('accessibilitySignals.codeActionRequestTriggered', 'Code Action Request Triggered'),
        sound: Sound.voiceRecordingStarted,
        legacySoundSettingsKey: 'audioCues.codeActionRequestTriggered',
        legacyAnnouncementSettingsKey: 'accessibility.alert.codeActionRequestTriggered',
        announcementMessage: localize('accessibility.signals.codeActionRequestTriggered', 'Code Action Request Triggered'),
        settingsKey: 'accessibility.signals.codeActionTriggered',
    }); }
    static { this.codeActionApplied = AccessibilitySignal.register({
        name: localize('accessibilitySignals.codeActionApplied', 'Code Action Applied'),
        legacySoundSettingsKey: 'audioCues.codeActionApplied',
        sound: Sound.voiceRecordingStopped,
        settingsKey: 'accessibility.signals.codeActionApplied'
    }); }
    static { this.progress = AccessibilitySignal.register({
        name: localize('accessibilitySignals.progress', 'Progress'),
        sound: Sound.progress,
        legacySoundSettingsKey: 'audioCues.chatResponsePending',
        legacyAnnouncementSettingsKey: 'accessibility.alert.progress',
        announcementMessage: localize('accessibility.signals.progress', 'Progress'),
        settingsKey: 'accessibility.signals.progress'
    }); }
    static { this.clear = AccessibilitySignal.register({
        name: localize('accessibilitySignals.clear', 'Clear'),
        sound: Sound.clear,
        legacySoundSettingsKey: 'audioCues.clear',
        legacyAnnouncementSettingsKey: 'accessibility.alert.clear',
        announcementMessage: localize('accessibility.signals.clear', 'Clear'),
        settingsKey: 'accessibility.signals.clear'
    }); }
    static { this.save = AccessibilitySignal.register({
        name: localize('accessibilitySignals.save', 'Save'),
        sound: Sound.save,
        legacySoundSettingsKey: 'audioCues.save',
        legacyAnnouncementSettingsKey: 'accessibility.alert.save',
        announcementMessage: localize('accessibility.signals.save', 'Save'),
        settingsKey: 'accessibility.signals.save'
    }); }
    static { this.format = AccessibilitySignal.register({
        name: localize('accessibilitySignals.format', 'Format'),
        sound: Sound.format,
        legacySoundSettingsKey: 'audioCues.format',
        legacyAnnouncementSettingsKey: 'accessibility.alert.format',
        announcementMessage: localize('accessibility.signals.format', 'Format'),
        settingsKey: 'accessibility.signals.format'
    }); }
    static { this.voiceRecordingStarted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.voiceRecordingStarted', 'Voice Recording Started'),
        sound: Sound.voiceRecordingStarted,
        legacySoundSettingsKey: 'audioCues.voiceRecordingStarted',
        settingsKey: 'accessibility.signals.voiceRecordingStarted'
    }); }
    static { this.voiceRecordingStopped = AccessibilitySignal.register({
        name: localize('accessibilitySignals.voiceRecordingStopped', 'Voice Recording Stopped'),
        sound: Sound.voiceRecordingStopped,
        legacySoundSettingsKey: 'audioCues.voiceRecordingStopped',
        settingsKey: 'accessibility.signals.voiceRecordingStopped'
    }); }
    static { this.editsKept = AccessibilitySignal.register({
        name: localize('accessibilitySignals.editsKept', 'Edits Kept'),
        sound: Sound.editsKept,
        announcementMessage: localize('accessibility.signals.editsKept', 'Edits Kept'),
        settingsKey: 'accessibility.signals.editsKept',
    }); }
    static { this.editsUndone = AccessibilitySignal.register({
        name: localize('accessibilitySignals.editsUndone', 'Undo Edits'),
        sound: Sound.editsUndone,
        announcementMessage: localize('accessibility.signals.editsUndone', 'Edits Undone'),
        settingsKey: 'accessibility.signals.editsUndone',
    }); }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNpZ25hbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWNjZXNzaWJpbGl0eVNpZ25hbC9icm93c2VyL2FjY2Vzc2liaWxpdHlTaWduYWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGtDQUFrQyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMzRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV4RSxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxlQUFlLENBQThCLDRCQUE0QixDQUFDLENBQUM7QUF3QnRILHNHQUFzRztBQUN0RyxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxNQUFNLENBQUMsNkJB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