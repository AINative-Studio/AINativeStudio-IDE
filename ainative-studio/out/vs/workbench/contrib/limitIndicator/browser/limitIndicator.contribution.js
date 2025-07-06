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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGltaXRJbmRpY2F0b3IuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbGltaXRJbmRpY2F0b3IvYnJvd3Nlci9saW1pdEluZGljYXRvci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBZSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFtQixzQkFBc0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQzNILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxJQUFJLG1CQUFtQixFQUEyRCxNQUFNLGtDQUFrQyxDQUFDO0FBRzlJLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBRWhHLE1BQU0sbUJBQW1CLEdBQUcsK0JBQStCLENBQUM7QUFDNUQsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBRXBGOzs7R0FHRztBQUNJLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTtJQUV6RCxZQUNpQixhQUE2QixFQUNyQixxQkFBNkM7UUFFckUs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