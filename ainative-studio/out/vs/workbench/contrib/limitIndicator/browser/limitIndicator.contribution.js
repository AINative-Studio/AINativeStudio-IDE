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
import Severity from '../../../../base/common/severity.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ILanguageStatusService } from '../../../services/languageStatus/common/languageStatusService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import * as nls from '../../../../nls.js';
import { FoldingController } from '../../../../editor/contrib/folding/browser/folding.js';
import { ColorDetector } from '../../../../editor/contrib/colorPicker/browser/colorDetector.js';
const openSettingsCommand = 'workbench.action.openSettings';
const configureSettingsLabel = nls.localize('status.button.configure', "Configure");
/**
 * Uses that language status indicator to show information which language features have been limited for performance reasons.
 * Currently this is used for folding ranges and for color decorators.
 */
let LimitIndicatorContribution = class LimitIndicatorContribution extends Disposable {
    constructor(editorService, languageStatusService) {
        super();
        const accessors = [new ColorDecorationAccessor(), new FoldingRangeAccessor()];
        const statusEntries = accessors.map(indicator => new LanguageStatusEntry(languageStatusService, indicator));
        statusEntries.forEach(entry => this._register(entry));
        let control;
        const onActiveEditorChanged = () => {
            const activeControl = editorService.activeTextEditorControl;
            if (activeControl === control) {
                return;
            }
            control = activeControl;
            const editor = getCodeEditor(activeControl);
            statusEntries.forEach(statusEntry => statusEntry.onActiveEditorChanged(editor));
        };
        this._register(editorService.onDidActiveEditorChange(onActiveEditorChanged));
        onActiveEditorChanged();
    }
};
LimitIndicatorContribution = __decorate([
    __param(0, IEditorService),
    __param(1, ILanguageStatusService)
], LimitIndicatorContribution);
export { LimitIndicatorContribution };
class ColorDecorationAccessor {
    constructor() {
        this.id = 'decoratorsLimitInfo';
        this.name = nls.localize('colorDecoratorsStatusItem.name', 'Color Decorator Status');
        this.label = nls.localize('status.limitedColorDecorators.short', 'Color decorators');
        this.source = nls.localize('colorDecoratorsStatusItem.source', 'Color Decorators');
        this.settingsId = 'editor.colorDecoratorsLimit';
    }
    getLimitReporter(editor) {
        return ColorDetector.get(editor)?.limitReporter;
    }
}
class FoldingRangeAccessor {
    constructor() {
        this.id = 'foldingLimitInfo';
        this.name = nls.localize('foldingRangesStatusItem.name', 'Folding Status');
        this.label = nls.localize('status.limitedFoldingRanges.short', 'Folding ranges');
        this.source = nls.localize('foldingRangesStatusItem.source', 'Folding');
        this.settingsId = 'editor.foldingMaximumRegions';
    }
    getLimitReporter(editor) {
        return FoldingController.get(editor)?.limitReporter;
    }
}
class LanguageStatusEntry {
    constructor(languageStatusService, accessor) {
        this.languageStatusService = languageStatusService;
        this.accessor = accessor;
    }
    onActiveEditorChanged(editor) {
        if (this._indicatorChangeListener) {
            this._indicatorChangeListener.dispose();
            this._indicatorChangeListener = undefined;
        }
        let info;
        if (editor) {
            info = this.accessor.getLimitReporter(editor);
        }
        this.updateStatusItem(info);
        if (info) {
            this._indicatorChangeListener = info.onDidChange(_ => {
                this.updateStatusItem(info);
            });
            return true;
        }
        return false;
    }
    updateStatusItem(info) {
        if (this._limitStatusItem) {
            this._limitStatusItem.dispose();
            this._limitStatusItem = undefined;
        }
        if (info && info.limited !== false) {
            const status = {
                id: this.accessor.id,
                selector: '*',
                name: this.accessor.name,
                severity: Severity.Warning,
                label: this.accessor.label,
                detail: nls.localize('status.limited.details', 'only {0} shown for performance reasons', info.limited),
                command: { id: openSettingsCommand, arguments: [this.accessor.settingsId], title: configureSettingsLabel },
                accessibilityInfo: undefined,
                source: this.accessor.source,
                busy: false
            };
            this._limitStatusItem = this.languageStatusService.addStatus(status);
        }
    }
    dispose() {
        this._limitStatusItem?.dispose;
        this._limitStatusItem = undefined;
        this._indicatorChangeListener?.dispose;
        this._indicatorChangeListener = undefined;
    }
}
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(LimitIndicatorContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGltaXRJbmRpY2F0b3IuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xpbWl0SW5kaWNhdG9yL2Jyb3dzZXIvbGltaXRJbmRpY2F0b3IuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQWUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBbUIsc0JBQXNCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUMzSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsSUFBSSxtQkFBbUIsRUFBMkQsTUFBTSxrQ0FBa0MsQ0FBQztBQUc5SSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUVoRyxNQUFNLG1CQUFtQixHQUFHLCtCQUErQixDQUFDO0FBQzVELE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUVwRjs7O0dBR0c7QUFDSSxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7SUFFekQsWUFDaUIsYUFBNkIsRUFDckIscUJBQTZDO1FBRXJFLEtBQUssRUFBRSxDQUFDO1FBRVIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLHVCQUF1QixFQUFFLEVBQUUsSUFBSSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7UUFDOUUsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksbUJBQW1CLENBQUMscUJBQXFCLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUM1RyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXRELElBQUksT0FBWSxDQUFDO1FBRWpCLE1BQU0scUJBQXFCLEdBQUcsR0FBRyxFQUFFO1lBQ2xDLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQztZQUM1RCxJQUFJLGFBQWEsS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDL0IsT0FBTztZQUNSLENBQUM7WUFDRCxPQUFPLEdBQUcsYUFBYSxDQUFDO1lBQ3hCLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUU1QyxhQUFhLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDakYsQ0FBQyxDQUFDO1FBQ0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBRTdFLHFCQUFxQixFQUFFLENBQUM7SUFDekIsQ0FBQztDQUVELENBQUE7QUE3QlksMEJBQTBCO0lBR3BDLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxzQkFBc0IsQ0FBQTtHQUpaLDBCQUEwQixDQTZCdEM7O0FBbUJELE1BQU0sdUJBQXVCO0lBQTdCO1FBQ1UsT0FBRSxHQUFHLHFCQUFxQixDQUFDO1FBQzNCLFNBQUksR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFDaEYsVUFBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMscUNBQXFDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUNoRixXQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzlFLGVBQVUsR0FBRyw2QkFBNkIsQ0FBQztJQUtyRCxDQUFDO0lBSEEsZ0JBQWdCLENBQUMsTUFBbUI7UUFDbkMsT0FBTyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLGFBQWEsQ0FBQztJQUNqRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLG9CQUFvQjtJQUExQjtRQUNVLE9BQUUsR0FBRyxrQkFBa0IsQ0FBQztRQUN4QixTQUFJLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3RFLFVBQUssR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDNUUsV0FBTSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDbkUsZUFBVSxHQUFHLDhCQUE4QixDQUFDO0lBS3RELENBQUM7SUFIQSxnQkFBZ0IsQ0FBQyxNQUFtQjtRQUNuQyxPQUFPLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxhQUFhLENBQUM7SUFDckQsQ0FBQztDQUNEO0FBRUQsTUFBTSxtQkFBbUI7SUFLeEIsWUFBb0IscUJBQTZDLEVBQVUsUUFBaUM7UUFBeEYsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUFVLGFBQVEsR0FBUixRQUFRLENBQXlCO0lBQzVHLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxNQUEwQjtRQUMvQyxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsU0FBUyxDQUFDO1FBQzNDLENBQUM7UUFFRCxJQUFJLElBQTJCLENBQUM7UUFDaEMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUIsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNWLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNwRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFHTyxnQkFBZ0IsQ0FBQyxJQUEyQjtRQUNuRCxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDO1FBQ25DLENBQUM7UUFDRCxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ3BDLE1BQU0sTUFBTSxHQUFvQjtnQkFDL0IsRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDcEIsUUFBUSxFQUFFLEdBQUc7Z0JBQ2IsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSTtnQkFDeEIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxPQUFPO2dCQUMxQixLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO2dCQUMxQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSx3Q0FBd0MsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUN0RyxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLEVBQUUsc0JBQXNCLEVBQUU7Z0JBQzFHLGlCQUFpQixFQUFFLFNBQVM7Z0JBQzVCLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU07Z0JBQzVCLElBQUksRUFBRSxLQUFLO2FBQ1gsQ0FBQztZQUNGLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RFLENBQUM7SUFDRixDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUM7UUFDL0IsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQztRQUNsQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsT0FBTyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxTQUFTLENBQUM7SUFDM0MsQ0FBQztDQUNEO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsNkJBQTZCLENBQ3hHLDBCQUEwQixrQ0FFMUIsQ0FBQyJ9