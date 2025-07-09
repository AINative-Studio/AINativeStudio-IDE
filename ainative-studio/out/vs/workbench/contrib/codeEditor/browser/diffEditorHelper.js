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
import { autorunWithStore, observableFromEvent } from '../../../../base/common/observable.js';
import { registerDiffEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { EmbeddedDiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/embeddedDiffEditorWidget.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { localize } from '../../../../nls.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { FloatingEditorClickWidget } from '../../../browser/codeeditor.js';
import { Extensions } from '../../../common/configuration.js';
import { DiffEditorAccessibilityHelp } from './diffEditorAccessibilityHelp.js';
let DiffEditorHelperContribution = class DiffEditorHelperContribution extends Disposable {
    static { this.ID = 'editor.contrib.diffEditorHelper'; }
    constructor(_diffEditor, _instantiationService, _textResourceConfigurationService, _notificationService) {
        super();
        this._diffEditor = _diffEditor;
        this._instantiationService = _instantiationService;
        this._textResourceConfigurationService = _textResourceConfigurationService;
        this._notificationService = _notificationService;
        const isEmbeddedDiffEditor = this._diffEditor instanceof EmbeddedDiffEditorWidget;
        if (!isEmbeddedDiffEditor) {
            const computationResult = observableFromEvent(this, e => this._diffEditor.onDidUpdateDiff(e), () => /** @description diffEditor.diffComputationResult */ this._diffEditor.getDiffComputationResult());
            const onlyWhiteSpaceChange = computationResult.map(r => r && !r.identical && r.changes2.length === 0);
            this._register(autorunWithStore((reader, store) => {
                /** @description update state */
                if (onlyWhiteSpaceChange.read(reader)) {
                    const helperWidget = store.add(this._instantiationService.createInstance(FloatingEditorClickWidget, this._diffEditor.getModifiedEditor(), localize('hintWhitespace', "Show Whitespace Differences"), null));
                    store.add(helperWidget.onClick(() => {
                        this._textResourceConfigurationService.updateValue(this._diffEditor.getModel().modified.uri, 'diffEditor.ignoreTrimWhitespace', false);
                    }));
                    helperWidget.render();
                }
            }));
            this._register(this._diffEditor.onDidUpdateDiff(() => {
                const diffComputationResult = this._diffEditor.getDiffComputationResult();
                if (diffComputationResult && diffComputationResult.quitEarly) {
                    this._notificationService.prompt(Severity.Warning, localize('hintTimeout', "The diff algorithm was stopped early (after {0} ms.)", this._diffEditor.maxComputationTime), [{
                            label: localize('removeTimeout', "Remove Limit"),
                            run: () => {
                                this._textResourceConfigurationService.updateValue(this._diffEditor.getModel().modified.uri, 'diffEditor.maxComputationTime', 0);
                            }
                        }], {});
                }
            }));
        }
    }
};
DiffEditorHelperContribution = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITextResourceConfigurationService),
    __param(3, INotificationService)
], DiffEditorHelperContribution);
registerDiffEditorContribution(DiffEditorHelperContribution.ID, DiffEditorHelperContribution);
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'diffEditor.experimental.collapseUnchangedRegions',
        migrateFn: (value, accessor) => {
            return [
                ['diffEditor.hideUnchangedRegions.enabled', { value }],
                ['diffEditor.experimental.collapseUnchangedRegions', { value: undefined }]
            ];
        }
    }]);
AccessibleViewRegistry.register(new DiffEditorAccessibilityHelp());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvZGlmZkVkaXRvckhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFOUYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFFcEgsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDcEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzlHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBbUMsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUvRSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7YUFDN0IsT0FBRSxH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