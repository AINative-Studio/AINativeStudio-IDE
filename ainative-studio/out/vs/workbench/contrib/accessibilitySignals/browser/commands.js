/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { AccessibilitySignal, AcknowledgeDocCommentsToken, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
export class ShowSignalSoundHelp extends Action2 {
    static { this.ID = 'signals.sounds.help'; }
    constructor() {
        super({
            id: ShowSignalSoundHelp.ID,
            title: localize2('signals.sound.help', "Help: List Signal Sounds"),
            f1: true,
            metadata: {
                description: localize('accessibility.sound.help.description', "List all accessibility sounds, noises, or audio cues and configure their settings")
            }
        });
    }
    async run(accessor) {
        const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
        const quickInputService = accessor.get(IQuickInputService);
        const configurationService = accessor.get(IConfigurationService);
        const accessibilityService = accessor.get(IAccessibilityService);
        const preferencesService = accessor.get(IPreferencesService);
        const userGestureSignals = [AccessibilitySignal.save, AccessibilitySignal.format];
        const items = AccessibilitySignal.allAccessibilitySignals.map((signal, idx) => ({
            label: userGestureSignals.includes(signal) ? `${signal.name} (${configurationService.getValue(signal.settingsKey + '.sound')})` : signal.name,
            signal,
            buttons: userGestureSignals.includes(signal) ? [{
                    iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                    tooltip: localize('sounds.help.settings', 'Configure Sound'),
                    alwaysVisible: true
                }] : []
        })).sort((a, b) => a.label.localeCompare(b.label));
        const disposables = new DisposableStore();
        const qp = disposables.add(quickInputService.createQuickPick());
        qp.items = items;
        qp.selectedItems = items.filter(i => accessibilitySignalService.isSoundEnabled(i.signal) || userGestureSignals.includes(i.signal) && configurationService.getValue(i.signal.settingsKey + '.sound') !== 'never');
        disposables.add(qp.onDidAccept(() => {
            const enabledSounds = qp.selectedItems.map(i => i.signal);
            const disabledSounds = qp.items.map(i => i.signal).filter(i => !enabledSounds.includes(i));
            for (const signal of enabledSounds) {
                let { sound, announcement } = configurationService.getValue(signal.settingsKey);
                sound = userGestureSignals.includes(signal) ? 'userGesture' : accessibilityService.isScreenReaderOptimized() ? 'auto' : 'on';
                if (announcement) {
                    configurationService.updateValue(signal.settingsKey, { sound, announcement });
                }
                else {
                    configurationService.updateValue(signal.settingsKey, { sound });
                }
            }
            for (const signal of disabledSounds) {
                const announcement = configurationService.getValue(signal.settingsKey + '.announcement');
                const sound = getDisabledSettingValue(userGestureSignals.includes(signal), accessibilityService.isScreenReaderOptimized());
                const value = announcement ? { sound, announcement } : { sound };
                configurationService.updateValue(signal.settingsKey, value);
            }
            qp.hide();
        }));
        disposables.add(qp.onDidTriggerItemButton(e => {
            preferencesService.openUserSettings({ jsonEditor: true, revealSetting: { key: e.item.signal.settingsKey, edit: true } });
        }));
        disposables.add(qp.onDidChangeActive(() => {
            accessibilitySignalService.playSound(qp.activeItems[0].signal.sound.getSound(true), true, AcknowledgeDocCommentsToken);
        }));
        disposables.add(qp.onDidHide(() => disposables.dispose()));
        qp.placeholder = localize('sounds.help.placeholder', 'Select a sound to play and configure');
        qp.canSelectMany = true;
        await qp.show();
    }
}
function getDisabledSettingValue(isUserGestureSignal, isScreenReaderOptimized) {
    return isScreenReaderOptimized ? (isUserGestureSignal ? 'never' : 'off') : (isUserGestureSignal ? 'never' : 'auto');
}
export class ShowAccessibilityAnnouncementHelp extends Action2 {
    static { this.ID = 'accessibility.announcement.help'; }
    constructor() {
        super({
            id: ShowAccessibilityAnnouncementHelp.ID,
            title: localize2('accessibility.announcement.help', "Help: List Signal Announcements"),
            f1: true,
            metadata: {
                description: localize('accessibility.announcement.help.description', "List all accessibility announcements, alerts, braille messages, and configure their settings")
            }
        });
    }
    async run(accessor) {
        const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
        const quickInputService = accessor.get(IQuickInputService);
        const configurationService = accessor.get(IConfigurationService);
        const accessibilityService = accessor.get(IAccessibilityService);
        const preferencesService = accessor.get(IPreferencesService);
        const userGestureSignals = [AccessibilitySignal.save, AccessibilitySignal.format];
        const items = AccessibilitySignal.allAccessibilitySignals.filter(c => !!c.legacyAnnouncementSettingsKey).map((signal, idx) => ({
            label: userGestureSignals.includes(signal) ? `${signal.name} (${configurationService.getValue(signal.settingsKey + '.announcement')})` : signal.name,
            signal,
            buttons: userGestureSignals.includes(signal) ? [{
                    iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                    tooltip: localize('announcement.help.settings', 'Configure Announcement'),
                    alwaysVisible: true,
                }] : []
        })).sort((a, b) => a.label.localeCompare(b.label));
        const disposables = new DisposableStore();
        const qp = disposables.add(quickInputService.createQuickPick());
        qp.items = items;
        qp.selectedItems = items.filter(i => accessibilitySignalService.isAnnouncementEnabled(i.signal) || userGestureSignals.includes(i.signal) && configurationService.getValue(i.signal.settingsKey + '.announcement') !== 'never');
        const screenReaderOptimized = accessibilityService.isScreenReaderOptimized();
        disposables.add(qp.onDidAccept(() => {
            if (!screenReaderOptimized) {
                // announcements are off by default when screen reader is not active
                qp.hide();
                return;
            }
            const enabledAnnouncements = qp.selectedItems.map(i => i.signal);
            const disabledAnnouncements = AccessibilitySignal.allAccessibilitySignals.filter(cue => !!cue.legacyAnnouncementSettingsKey && !enabledAnnouncements.includes(cue));
            for (const signal of enabledAnnouncements) {
                let { sound, announcement } = configurationService.getValue(signal.settingsKey);
                announcement = userGestureSignals.includes(signal) ? 'userGesture' : signal.announcementMessage && accessibilityService.isScreenReaderOptimized() ? 'auto' : undefined;
                configurationService.updateValue(signal.settingsKey, { sound, announcement });
            }
            for (const signal of disabledAnnouncements) {
                const announcement = getDisabledSettingValue(userGestureSignals.includes(signal), true);
                const sound = configurationService.getValue(signal.settingsKey + '.sound');
                const value = announcement ? { sound, announcement } : { sound };
                configurationService.updateValue(signal.settingsKey, value);
            }
            qp.hide();
        }));
        disposables.add(qp.onDidTriggerItemButton(e => {
            preferencesService.openUserSettings({ jsonEditor: true, revealSetting: { key: e.item.signal.settingsKey, edit: true } });
        }));
        disposables.add(qp.onDidHide(() => disposables.dispose()));
        qp.placeholder = screenReaderOptimized ? localize('announcement.help.placeholder', 'Select an announcement to configure') : localize('announcement.help.placeholder.disabled', 'Screen reader is not active, announcements are disabled by default.');
        qp.canSelectMany = true;
        await qp.show();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eVNpZ25hbHMvYnJvd3Nlci9jb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwyQkFBMkIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQy9LLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxrQkFBa0IsRUFBa0IsTUFBTSxzREFBc0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdkUsTUFBTSxPQUFPLG1CQUFvQixTQUFRLE9BQU87YUFDL0IsT0FBRSxHQUFHLHFCQUFxQixDQUFDO0lBRTNDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7WUFDMUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSwwQkFBMEIsQ0FBQztZQUNsRSxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFB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