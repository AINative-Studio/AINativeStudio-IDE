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
import { reset } from '../../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../../base/browser/ui/actionbar/actionbar.js';
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { CompareResult } from '../../../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../../../base/common/errors.js';
import { toDisposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived } from '../../../../../../base/common/observable.js';
import { OverviewRulerLane } from '../../../../../../editor/common/model.js';
import { localize } from '../../../../../../nls.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { LineRange } from '../../model/lineRange.js';
import { applyObservableDecorations, join } from '../../utils.js';
import { handledConflictMinimapOverViewRulerColor, unhandledConflictMinimapOverViewRulerColor } from '../colors.js';
import { EditorGutter } from '../editorGutter.js';
import { ctxIsMergeResultEditor } from '../../../common/mergeEditor.js';
import { CodeEditorView, createSelectionsAutorun, TitleMenu } from './codeEditorView.js';
let ResultCodeEditorView = class ResultCodeEditorView extends CodeEditorView {
    constructor(viewModel, instantiationService, _labelService, configurationService) {
        super(instantiationService, viewModel, configurationService);
        this._labelService = _labelService;
        this.decorations = derived(this, reader => {
            const viewModel = this.viewModel.read(reader);
            if (!viewModel) {
                return [];
            }
            const model = viewModel.model;
            const textModel = model.resultTextModel;
            const result = new Array();
            const baseRangeWithStoreAndTouchingDiffs = join(model.modifiedBaseRanges.read(reader), model.baseResultDiffs.read(reader), (baseRange, diff) => baseRange.baseRange.touches(diff.inputRange)
                ? CompareResult.neitherLessOrGreaterThan
                : LineRange.compareByStart(baseRange.baseRange, diff.inputRange));
            const activeModifiedBaseRange = viewModel.activeModifiedBaseRange.read(reader);
            const showNonConflictingChanges = viewModel.showNonConflictingChanges.read(reader);
            for (const m of baseRangeWithStoreAndTouchingDiffs) {
                const modifiedBaseRange = m.left;
                if (modifiedBaseRange) {
                    const blockClassNames = ['merge-editor-block'];
                    let blockPadding = [0, 0, 0, 0];
                    const isHandled = model.isHandled(modifiedBaseRange).read(reader);
                    if (isHandled) {
                        blockClassNames.push('handled');
                    }
                    if (modifiedBaseRange === activeModifiedBaseRange) {
                        blockClassNames.push('focused');
                        blockPadding = [0, 2, 0, 2];
                    }
                    if (modifiedBaseRange.isConflicting) {
                        blockClassNames.push('conflicting');
                    }
                    blockClassNames.push('result');
                    if (!modifiedBaseRange.isConflicting && !showNonConflictingChanges && isHandled) {
                        continue;
                    }
                    const range = model.getLineRangeInResult(modifiedBaseRange.baseRange, reader);
                    result.push({
                        range: range.toInclusiveRangeOrEmpty(),
                        options: {
                            showIfCollapsed: true,
                            blockClassName: blockClassNames.join(' '),
                            blockPadding,
                            blockIsAfterEnd: range.startLineNumber > textModel.getLineCount(),
                            description: 'Result Diff',
                            minimap: {
                                position: 2 /* MinimapPosition.Gutter */,
                                color: { id: isHandled ? handledConflictMinimapOverViewRulerColor : unhandledConflictMinimapOverViewRulerColor },
                            },
                            overviewRuler: modifiedBaseRange.isConflicting ? {
                                position: OverviewRulerLane.Center,
                                color: { id: isHandled ? handledConflictMinimapOverViewRulerColor : unhandledConflictMinimapOverViewRulerColor },
                            } : undefined
                        }
                    });
                }
                if (!modifiedBaseRange || modifiedBaseRange.isConflicting) {
                    for (const diff of m.rights) {
                        const range = diff.outputRange.toInclusiveRange();
                        if (range) {
                            result.push({
                                range,
                                options: {
                                    className: `merge-editor-diff result`,
                                    description: 'Merge Editor',
                                    isWholeLine: true,
                                }
                            });
                        }
                        if (diff.rangeMappings) {
                            for (const d of diff.rangeMappings) {
                                result.push({
                                    range: d.outputRange,
                                    options: {
                                        className: `merge-editor-diff-word result`,
                                        description: 'Merge Editor'
                                    }
                                });
                            }
                        }
                    }
                }
            }
            return result;
        });
        this.editor.invokeWithinContext(accessor => {
            const contextKeyService = accessor.get(IContextKeyService);
            const isMergeResultEditor = ctxIsMergeResultEditor.bindTo(contextKeyService);
            isMergeResultEditor.set(true);
            this._register(toDisposable(() => isMergeResultEditor.reset()));
        });
        this.htmlElements.gutterDiv.style.width = '5px';
        this.htmlElements.root.classList.add(`result`);
        this._register(autorunWithStore((reader, store) => {
            /** @description update checkboxes */
            if (this.checkboxesVisible.read(reader)) {
                store.add(new EditorGutter(this.editor, this.htmlElements.gutterDiv, {
                    getIntersectingGutterItems: (range, reader) => [],
                    createView: (item, target) => { throw new BugIndicatingError(); },
                }));
            }
        }));
        this._register(autorun(reader => {
            /** @description update labels & text model */
            const vm = this.viewModel.read(reader);
            if (!vm) {
                return;
            }
            this.editor.setModel(vm.model.resultTextModel);
            reset(this.htmlElements.title, ...renderLabelWithIcons(localize('result', 'Result')));
            reset(this.htmlElements.description, ...renderLabelWithIcons(this._labelService.getUriLabel(vm.model.resultTextModel.uri, { relative: true })));
        }));
        const remainingConflictsActionBar = this._register(new ActionBar(this.htmlElements.detail));
        this._register(autorun(reader => {
            /** @description update remainingConflicts label */
            const vm = this.viewModel.read(reader);
            if (!vm) {
                return;
            }
            const model = vm.model;
            if (!model) {
                return;
            }
            const count = model.unhandledConflictsCount.read(reader);
            const text = count === 1
                ? localize('mergeEditor.remainingConflicts', '{0} Conflict Remaining', count)
                : localize('mergeEditor.remainingConflict', '{0} Conflicts Remaining ', count);
            remainingConflictsActionBar.clear();
            remainingConflictsActionBar.push({
                class: undefined,
                enabled: count > 0,
                id: 'nextConflict',
                label: text,
                run() {
                    vm.model.telemetry.reportConflictCounterClicked();
                    vm.goToNextModifiedBaseRange(m => !model.isHandled(m).get());
                },
                tooltip: count > 0
                    ? localize('goToNextConflict', 'Go to next conflict')
                    : localize('allConflictHandled', 'All conflicts handled, the merge can be completed now.'),
            });
        }));
        this._register(applyObservableDecorations(this.editor, this.decorations));
        this._register(createSelectionsAutorun(this, (baseRange, viewModel) => viewModel.model.translateBaseRangeToResult(baseRange)));
        this._register(instantiationService.createInstance(TitleMenu, MenuId.MergeInputResultToolbar, this.htmlElements.toolbar));
    }
};
ResultCodeEditorView = __decorate([
    __param(1, IInstantiationService),
    __param(2, ILabelService),
    __param(3, IConfigurationService)
], ResultCodeEditorView);
export { ResultCodeEditorView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdWx0Q29kZUVkaXRvclZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L2VkaXRvcnMvcmVzdWx0Q29kZUVkaXRvclZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNyRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFlLE1BQU0sNkNBQTZDLENBQUM7QUFDOUcsT0FBTyxFQUEwQyxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtEQUFrRCxDQUFD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