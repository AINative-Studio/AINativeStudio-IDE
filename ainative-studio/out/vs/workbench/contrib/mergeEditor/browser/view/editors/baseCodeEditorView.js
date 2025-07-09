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
import { h, reset } from '../../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { BugIndicatingError } from '../../../../../../base/common/errors.js';
import { autorun, autorunWithStore, derived } from '../../../../../../base/common/observable.js';
import { OverviewRulerLane } from '../../../../../../editor/common/model.js';
import { localize } from '../../../../../../nls.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { applyObservableDecorations } from '../../utils.js';
import { handledConflictMinimapOverViewRulerColor, unhandledConflictMinimapOverViewRulerColor } from '../colors.js';
import { EditorGutter } from '../editorGutter.js';
import { CodeEditorView, TitleMenu, createSelectionsAutorun } from './codeEditorView.js';
let BaseCodeEditorView = class BaseCodeEditorView extends CodeEditorView {
    constructor(viewModel, instantiationService, configurationService) {
        super(instantiationService, viewModel, configurationService);
        this.decorations = derived(this, reader => {
            const viewModel = this.viewModel.read(reader);
            if (!viewModel) {
                return [];
            }
            const model = viewModel.model;
            const textModel = model.base;
            const activeModifiedBaseRange = viewModel.activeModifiedBaseRange.read(reader);
            const showNonConflictingChanges = viewModel.showNonConflictingChanges.read(reader);
            const showDeletionMarkers = this.showDeletionMarkers.read(reader);
            const result = [];
            for (const modifiedBaseRange of model.modifiedBaseRanges.read(reader)) {
                const range = modifiedBaseRange.baseRange;
                if (!range) {
                    continue;
                }
                const isHandled = model.isHandled(modifiedBaseRange).read(reader);
                if (!modifiedBaseRange.isConflicting && isHandled && !showNonConflictingChanges) {
                    continue;
                }
                const blockClassNames = ['merge-editor-block'];
                let blockPadding = [0, 0, 0, 0];
                if (isHandled) {
                    blockClassNames.push('handled');
                }
                if (modifiedBaseRange === activeModifiedBaseRange) {
                    blockClassNames.push('focused');
                    blockPadding = [0, 2, 0, 2];
                }
                blockClassNames.push('base');
                const inputToDiffAgainst = viewModel.baseShowDiffAgainst.read(reader);
                if (inputToDiffAgainst) {
                    for (const diff of modifiedBaseRange.getInputDiffs(inputToDiffAgainst)) {
                        const range = diff.inputRange.toInclusiveRange();
                        if (range) {
                            result.push({
                                range,
                                options: {
                                    className: `merge-editor-diff base`,
                                    description: 'Merge Editor',
                                    isWholeLine: true,
                                }
                            });
                        }
                        for (const diff2 of diff.rangeMappings) {
                            if (showDeletionMarkers || !diff2.inputRange.isEmpty()) {
                                result.push({
                                    range: diff2.inputRange,
                                    options: {
                                        className: diff2.inputRange.isEmpty() ? `merge-editor-diff-empty-word base` : `merge-editor-diff-word base`,
                                        description: 'Merge Editor',
                                        showIfCollapsed: true,
                                    },
                                });
                            }
                        }
                    }
                }
                result.push({
                    range: range.toInclusiveRangeOrEmpty(),
                    options: {
                        showIfCollapsed: true,
                        blockClassName: blockClassNames.join(' '),
                        blockPadding,
                        blockIsAfterEnd: range.startLineNumber > textModel.getLineCount(),
                        description: 'Merge Editor',
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
            return result;
        });
        this._register(createSelectionsAutorun(this, (baseRange, viewModel) => baseRange));
        this._register(instantiationService.createInstance(TitleMenu, MenuId.MergeBaseToolbar, this.htmlElements.title));
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
            this.editor.setModel(vm.model.base);
            reset(this.htmlElements.title, ...renderLabelWithIcons(localize('base', 'Base')));
            const baseShowDiffAgainst = vm.baseShowDiffAgainst.read(reader);
            let node = undefined;
            if (baseShowDiffAgainst) {
                const label = localize('compareWith', 'Comparing with {0}', baseShowDiffAgainst === 1 ? vm.model.input1.title : vm.model.input2.title);
                const tooltip = localize('compareWithTooltip', 'Differences are highlighted with a background color.');
                node = h('span', { title: tooltip }, [label]).root;
            }
            reset(this.htmlElements.description, ...(node ? [node] : []));
        }));
        this._register(applyObservableDecorations(this.editor, this.decorations));
    }
};
BaseCodeEditorView = __decorate([
    __param(1, IInstantiationService),
    __param(2, IConfigurationService)
], BaseCodeEditorView);
export { BaseCodeEditorView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUNvZGVFZGl0b3JWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvdmlldy9lZGl0b3JzL2Jhc2VDb2RlRWRpdG9yVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzdFLE9BQU8sRUFBZSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUcsT0FBTyxFQUEwQyxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHdDQUF3QyxFQUFFLDBDQUEwQyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3BILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVsRCxPQUFPLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FB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