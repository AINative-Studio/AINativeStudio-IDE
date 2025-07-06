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
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import Severity from '../../../../base/common/severity.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService, NotificationPriority } from '../../../../platform/notification/common/notification.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
let AccessibilityStatus = class AccessibilityStatus extends Disposable {
    static { this.ID = 'workbench.contrib.accessibilityStatus'; }
    constructor(configurationService, notificationService, accessibilityService, statusbarService, openerService) {
        super();
        this.configurationService = configurationService;
        this.notificationService = notificationService;
        this.accessibilityService = accessibilityService;
        this.statusbarService = statusbarService;
        this.openerService = openerService;
        this.screenReaderNotification = null;
        this.promptedScreenReader = false;
        this.screenReaderModeElement = this._register(new MutableDisposable());
        this._register(CommandsRegistry.registerCommand({ id: 'showEditorScreenReaderNotification', handler: () => this.showScreenReaderNotification() }));
        this.updateScreenReaderModeElement(this.accessibilityService.isScreenReaderOptimized());
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.accessibilityService.onDidChangeScreenReaderOptimized(() => this.onScreenReaderModeChange()));
        this._register(this.configurationService.onDidChangeConfiguration(c => {
            if (c.affectsConfiguration('editor.accessibilitySupport')) {
                this.onScreenReaderModeChange();
            }
        }));
    }
    showScreenReaderNotification() {
        this.screenReaderNotification = this.notificationService.prompt(Severity.Info, localize('screenReaderDetectedExplanation.question', "Screen reader usage detected. Do you want to enable {0} to optimize the editor for screen reader usage?", 'editor.accessibilitySupport'), [{
                label: localize('screenReaderDetectedExplanation.answerYes', "Yes"),
                run: () => {
                    this.configurationService.updateValue('editor.accessibilitySupport', 'on', 2 /* ConfigurationTarget.USER */);
                }
            }, {
                label: localize('screenReaderDetectedExplanation.answerNo', "No"),
                run: () => {
                    this.configurationService.updateValue('editor.accessibilitySupport', 'off', 2 /* ConfigurationTarget.USER */);
                }
            },
            {
                label: localize('screenReaderDetectedExplanation.answerLearnMore', "Learn More"),
                run: () => {
                    this.openerService.open('https://code.visualstudio.com/docs/editor/accessibility#_screen-readers');
                }
            }], {
            sticky: true,
            priority: NotificationPriority.URGENT
        });
        Event.once(this.screenReaderNotification.onDidClose)(() => this.screenReaderNotification = null);
    }
    updateScreenReaderModeElement(visible) {
        if (visible) {
            if (!this.screenReaderModeElement.value) {
                const text = localize('screenReaderDetected', "Screen Reader Optimized");
                this.screenReaderModeElement.value = this.statusbarService.addEntry({
                    name: localize('status.editor.screenReaderMode', "Screen Reader Mode"),
                    text,
                    ariaLabel: text,
                    command: 'showEditorScreenReaderNotification',
                    kind: 'prominent',
                    showInAllWindows: true
                }, 'status.editor.screenReaderMode', 1 /* StatusbarAlignment.RIGHT */, 100.6);
            }
        }
        else {
            this.screenReaderModeElement.clear();
        }
    }
    onScreenReaderModeChange() {
        // We only support text based editors
        const screenReaderDetected = this.accessibilityService.isScreenReaderOptimized();
        if (screenReaderDetected) {
            const screenReaderConfiguration = this.configurationService.getValue('editor.accessibilitySupport');
            if (screenReaderConfiguration === 'auto') {
                if (!this.promptedScreenReader) {
                    this.promptedScreenReader = true;
                    setTimeout(() => this.showScreenReaderNotification(), 100);
                }
            }
        }
        if (this.screenReaderNotification) {
            this.screenReaderNotification.close();
        }
        this.updateScreenReaderModeElement(this.accessibilityService.isScreenReaderOptimized());
    }
};
AccessibilityStatus = __decorate([
    __param(0, IConfigurationService),
    __param(1, INotificationService),
    __param(2, IAccessibilityService),
    __param(3, IStatusbarService),
    __param(4, IOpenerService)
], AccessibilityStatus);
export { AccessibilityStatus };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVN0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL2FjY2Vzc2liaWxpdHlTdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3hILE9BQU8sRUFBdUIsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUUzSSxPQUFPLEVBQTJCLGlCQUFpQixFQUFzQixNQUFNLGtEQUFrRCxDQUFDO0FBQ2xJLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUV2RSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7YUFFbEMsT0FBRSxHQUFHLHVDQUF1QyxBQUExQyxDQUEyQztJQU03RCxZQUN3QixvQkFBNEQsRUFDN0QsbUJBQTBELEVBQ3pELG9CQUE0RCxFQUNoRSxnQkFBb0QsRUFDdkQsYUFBOEM7UUFFOUQsS0FBSyxFQUFFLENBQUM7UUFOZ0MseUJBQW9CLEdB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