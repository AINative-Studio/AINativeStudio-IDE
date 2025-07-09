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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVN0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvYWNjZXNzaWJpbGl0eVN0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNwRixPQUFPLEVBQXVCLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDeEgsT0FBTyxFQUF1QixvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRTNJLE9BQU8sRUFBMkIsaUJBQWlCLEVBQXNCLE1BQU0sa0RBQWtELENBQUM7QUFDbEksT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXZFLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTthQUVsQyxPQUFFLEdBQUcsdUNBQXVDLEFBQTFDLENBQTJDO0lBTTdELFlBQ3dCLG9CQUE0RCxFQUM3RCxtQkFBMEQsRUFDekQsb0JBQTRELEVBQ2hFLGdCQUFvRCxFQUN2RCxhQUE4QztRQUU5RCxLQUFLLEVBQUUsQ0FBQztRQU5nQyx5QkFBb0IsR0FBcEIs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