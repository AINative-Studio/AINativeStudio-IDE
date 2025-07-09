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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Event } from '../../../../base/common/event.js';
let DiffEditorActiveAnnouncementContribution = class DiffEditorActiveAnnouncementContribution extends Disposable {
    static { this.ID = 'workbench.contrib.diffEditorActiveAnnouncement'; }
    constructor(_editorService, _accessibilityService, _configurationService) {
        super();
        this._editorService = _editorService;
        this._accessibilityService = _accessibilityService;
        this._configurationService = _configurationService;
        this._register(Event.runAndSubscribe(_accessibilityService.onDidChangeScreenReaderOptimized, () => this._updateListener()));
        this._register(_configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("accessibility.verbosity.diffEditorActive" /* AccessibilityVerbositySettingId.DiffEditorActive */)) {
                this._updateListener();
            }
        }));
    }
    _updateListener() {
        const announcementEnabled = this._configurationService.getValue("accessibility.verbosity.diffEditorActive" /* AccessibilityVerbositySettingId.DiffEditorActive */);
        const screenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
        if (!announcementEnabled || !screenReaderOptimized) {
            this._onDidActiveEditorChangeListener?.dispose();
            this._onDidActiveEditorChangeListener = undefined;
            return;
        }
        if (this._onDidActiveEditorChangeListener) {
            return;
        }
        this._onDidActiveEditorChangeListener = this._register(this._editorService.onDidActiveEditorChange(() => {
            if (isDiffEditor(this._editorService.activeTextEditorControl)) {
                this._accessibilityService.alert(localize('openDiffEditorAnnouncement', "Diff editor"));
            }
        }));
    }
};
DiffEditorActiveAnnouncementContribution = __decorate([
    __param(0, IEditorService),
    __param(1, IAccessibilityService),
    __param(2, IConfigurationService)
], DiffEditorActiveAnnouncementContribution);
export { DiffEditorActiveAnnouncementContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbkRpZmZFZGl0b3JBbm5vdW5jZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eVNpZ25hbHMvYnJvd3Nlci9vcGVuRGlmZkVkaXRvckFubm91bmNlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBR2xELElBQU0sd0NBQXdDLEdBQTlDLE1BQU0sd0NBQXlDLFNBQVEsVUFBVTthQUV2RCxPQUFFLEdBQUcsZ0RBQWdELEFBQW5ELENBQW9EO0lBSXRFLFlBQ2tDLGNBQThCLEVBQ3ZCLHFCQUE0QyxFQUM1QyxxQkFBNEM7UUFFcEYsS0FBSyxFQUFFLENBQUM7UUFKeUIsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ3ZCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDNUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUdwRixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMscUJBQXFCLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1SCxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2pFLElBQUksQ0FBQyxDQUFDLG9CQUFvQixtR0FBa0QsRUFBRSxDQUFDO2dCQUM5RSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDeEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sZUFBZTtRQUN0QixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLG1HQUFrRCxDQUFDO1FBQ2xILE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFFbkYsSUFBSSxDQUFDLG1CQUFtQixJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNwRCxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLGdDQUFnQyxHQUFHLFNBQVMsQ0FBQztZQUNsRCxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGdDQUFnQyxFQUFFLENBQUM7WUFDM0MsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsZ0NBQWdDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUN2RyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQztnQkFDL0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUN6RixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7O0FBdkNXLHdDQUF3QztJQU9sRCxXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtHQVRYLHdDQUF3QyxDQXdDcEQifQ==