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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNpZ25hbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY2Nlc3NpYmlsaXR5U2lnbmFsL2Jyb3dzZXIvYWNjZXNzaWJpbGl0eVNpZ25hbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXhFLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGVBQWUsQ0FBOEIsNEJBQTRCLENBQUMsQ0FBQztBQXdCdEgsc0dBQXNHO0FBQ3RHLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLE1BQU0sQ0FBQyw2QkFB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