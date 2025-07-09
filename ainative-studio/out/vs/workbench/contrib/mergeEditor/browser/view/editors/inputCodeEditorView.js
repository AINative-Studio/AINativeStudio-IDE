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
import { addDisposableListener, EventType, h, reset } from '../../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Toggle } from '../../../../../../base/browser/ui/toggle/toggle.js';
import { Action, Separator } from '../../../../../../base/common/actions.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../../base/common/numbers.js';
import { autorun, autorunOpts, derived, derivedOpts, observableValue, transaction } from '../../../../../../base/common/observable.js';
import { noBreakWhitespace } from '../../../../../../base/common/strings.js';
import { isDefined } from '../../../../../../base/common/types.js';
import { OverviewRulerLane } from '../../../../../../editor/common/model.js';
import { localize } from '../../../../../../nls.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { defaultToggleStyles } from '../../../../../../platform/theme/browser/defaultStyles.js';
import { applyObservableDecorations, setFields } from '../../utils.js';
import { handledConflictMinimapOverViewRulerColor, unhandledConflictMinimapOverViewRulerColor } from '../colors.js';
import { EditorGutter } from '../editorGutter.js';
import { CodeEditorView, createSelectionsAutorun, TitleMenu } from './codeEditorView.js';
let InputCodeEditorView = class InputCodeEditorView extends CodeEditorView {
    constructor(inputNumber, viewModel, instantiationService, contextMenuService, configurationService) {
        super(instantiationService, viewModel, configurationService);
        this.inputNumber = inputNumber;
        this.otherInputNumber = this.inputNumber === 1 ? 2 : 1;
        this.modifiedBaseRangeGutterItemInfos = derivedOpts({ debugName: `input${this.inputNumber}.modifiedBaseRangeGutterItemInfos` }, reader => {
            const viewModel = this.viewModel.read(reader);
            if (!viewModel) {
                return [];
            }
            const model = viewModel.model;
            const inputNumber = this.inputNumber;
            const showNonConflictingChanges = viewModel.showNonConflictingChanges.read(reader);
            return model.modifiedBaseRanges.read(reader)
                .filter((r) => r.getInputDiffs(this.inputNumber).length > 0 && (showNonConflictingChanges || r.isConflicting || !model.isHandled(r).read(reader)))
                .map((baseRange, idx) => new ModifiedBaseRangeGutterItemModel(idx.toString(), baseRange, inputNumber, viewModel));
        });
        this.decorations = derivedOpts({ debugName: `input${this.inputNumber}.decorations` }, reader => {
            const viewModel = this.viewModel.read(reader);
            if (!viewModel) {
                return [];
            }
            const model = viewModel.model;
            const textModel = (this.inputNumber === 1 ? model.input1 : model.input2).textModel;
            const activeModifiedBaseRange = viewModel.activeModifiedBaseRange.read(reader);
            const result = new Array();
            const showNonConflictingChanges = viewModel.showNonConflictingChanges.read(reader);
            const showDeletionMarkers = this.showDeletionMarkers.read(reader);
            const diffWithThis = viewModel.baseCodeEditorView.read(reader) !== undefined && viewModel.baseShowDiffAgainst.read(reader) === this.inputNumber;
            const useSimplifiedDecorations = !diffWithThis && this.useSimplifiedDecorations.read(reader);
            for (const modifiedBaseRange of model.modifiedBaseRanges.read(reader)) {
                const range = modifiedBaseRange.getInputRange(this.inputNumber);
                if (!range) {
                    continue;
                }
                const blockClassNames = ['merge-editor-block'];
                let blockPadding = [0, 0, 0, 0];
                const isHandled = model.isInputHandled(modifiedBaseRange, this.inputNumber).read(reader);
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
                const inputClassName = this.inputNumber === 1 ? 'input i1' : 'input i2';
                blockClassNames.push(inputClassName);
                if (!modifiedBaseRange.isConflicting && !showNonConflictingChanges && isHandled) {
                    continue;
                }
                if (useSimplifiedDecorations && !isHandled) {
                    blockClassNames.push('use-simplified-decorations');
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
                if (!useSimplifiedDecorations && (modifiedBaseRange.isConflicting || !model.isHandled(modifiedBaseRange).read(reader))) {
                    const inputDiffs = modifiedBaseRange.getInputDiffs(this.inputNumber);
                    for (const diff of inputDiffs) {
                        const range = diff.outputRange.toInclusiveRange();
                        if (range) {
                            result.push({
                                range,
                                options: {
                                    className: `merge-editor-diff ${inputClassName}`,
                                    description: 'Merge Editor',
                                    isWholeLine: true,
                                }
                            });
                        }
                        if (diff.rangeMappings) {
                            for (const d of diff.rangeMappings) {
                                if (showDeletionMarkers || !d.outputRange.isEmpty()) {
                                    result.push({
                                        range: d.outputRange,
                                        options: {
                                            className: d.outputRange.isEmpty() ? `merge-editor-diff-empty-word ${inputClassName}` : `merge-editor-diff-word ${inputClassName}`,
                                            description: 'Merge Editor',
                                            showIfCollapsed: true,
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }
            return result;
        });
        this.htmlElements.root.classList.add(`input`);
        this._register(new EditorGutter(this.editor, this.htmlElements.gutterDiv, {
            getIntersectingGutterItems: (range, reader) => {
                if (this.checkboxesVisible.read(reader)) {
                    return this.modifiedBaseRangeGutterItemInfos.read(reader);
                }
                else {
                    return [];
                }
            },
            createView: (item, target) => new MergeConflictGutterItemView(item, target, contextMenuService),
        }));
        this._register(createSelectionsAutorun(this, (baseRange, viewModel) => viewModel.model.translateBaseRangeToInput(this.inputNumber, baseRange)));
        this._register(instantiationService.createInstance(TitleMenu, inputNumber === 1 ? MenuId.MergeInput1Toolbar : MenuId.MergeInput2Toolbar, this.htmlElements.toolbar));
        this._register(autorunOpts({ debugName: `input${this.inputNumber}: update labels & text model` }, reader => {
            const vm = this.viewModel.read(reader);
            if (!vm) {
                return;
            }
            this.editor.setModel(this.inputNumber === 1 ? vm.model.input1.textModel : vm.model.input2.textModel);
            const title = this.inputNumber === 1
                ? vm.model.input1.title || localize('input1', 'Input 1')
                : vm.model.input2.title || localize('input2', 'Input 2');
            const description = this.inputNumber === 1
                ? vm.model.input1.description
                : vm.model.input2.description;
            const detail = this.inputNumber === 1
                ? vm.model.input1.detail
                : vm.model.input2.detail;
            reset(this.htmlElements.title, ...renderLabelWithIcons(title));
            reset(this.htmlElements.description, ...(description ? renderLabelWithIcons(description) : []));
            reset(this.htmlElements.detail, ...(detail ? renderLabelWithIcons(detail) : []));
        }));
        this._register(applyObservableDecorations(this.editor, this.decorations));
    }
};
InputCodeEditorView = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService)
], InputCodeEditorView);
export { InputCodeEditorView };
export class ModifiedBaseRangeGutterItemModel {
    constructor(id, baseRange, inputNumber, viewModel) {
        this.id = id;
        this.baseRange = baseRange;
        this.inputNumber = inputNumber;
        this.viewModel = viewModel;
        this.model = this.viewModel.model;
        this.range = this.baseRange.getInputRange(this.inputNumber);
        this.enabled = this.model.isUpToDate;
        this.toggleState = derived(this, reader => {
            const input = this.model
                .getState(this.baseRange)
                .read(reader)
                .getInput(this.inputNumber);
            return input === 2 /* InputState.second */ && !this.baseRange.isOrderRelevant
                ? 1 /* InputState.first */
                : input;
        });
        this.state = derived(this, reader => {
            const active = this.viewModel.activeModifiedBaseRange.read(reader);
            if (!this.model.hasBaseRange(this.baseRange)) {
                return { handled: false, focused: false }; // Invalid state, should only be observed temporarily
            }
            return {
                handled: this.model.isHandled(this.baseRange).read(reader),
                focused: this.baseRange === active,
            };
        });
    }
    setState(value, tx) {
        this.viewModel.setState(this.baseRange, this.model
            .getState(this.baseRange)
            .get()
            .withInputValue(this.inputNumber, value), tx, this.inputNumber);
    }
    toggleBothSides() {
        transaction(tx => {
            /** @description Context Menu: toggle both sides */
            const state = this.model
                .getState(this.baseRange)
                .get();
            this.model.setState(this.baseRange, state
                .toggle(this.inputNumber)
                .toggle(this.inputNumber === 1 ? 2 : 1), true, tx);
        });
    }
    getContextMenuActions() {
        const state = this.model.getState(this.baseRange).get();
        const handled = this.model.isHandled(this.baseRange).get();
        const update = (newState) => {
            transaction(tx => {
                /** @description Context Menu: Update Base Range State */
                return this.viewModel.setState(this.baseRange, newState, tx, this.inputNumber);
            });
        };
        function action(id, label, targetState, checked) {
            const action = new Action(id, label, undefined, true, () => {
                update(targetState);
            });
            action.checked = checked;
            return action;
        }
        const both = state.includesInput1 && state.includesInput2;
        return [
            this.baseRange.input1Diffs.length > 0
                ? action('mergeEditor.acceptInput1', localize('mergeEditor.accept', 'Accept {0}', this.model.input1.title), state.toggle(1), state.includesInput1)
                : undefined,
            this.baseRange.input2Diffs.length > 0
                ? action('mergeEditor.acceptInput2', localize('mergeEditor.accept', 'Accept {0}', this.model.input2.title), state.toggle(2), state.includesInput2)
                : undefined,
            this.baseRange.isConflicting
                ? setFields(action('mergeEditor.acceptBoth', localize('mergeEditor.acceptBoth', 'Accept Both'), state.withInputValue(1, !both).withInputValue(2, !both), both), { enabled: this.baseRange.canBeCombined })
                : undefined,
            new Separator(),
            this.baseRange.isConflicting
                ? setFields(action('mergeEditor.swap', localize('mergeEditor.swap', 'Swap'), state.swap(), false), { enabled: !state.kind && (!both || this.baseRange.isOrderRelevant) })
                : undefined,
            setFields(new Action('mergeEditor.markAsHandled', localize('mergeEditor.markAsHandled', 'Mark as Handled'), undefined, true, () => {
                transaction((tx) => {
                    /** @description Context Menu: Mark as handled */
                    this.model.setHandled(this.baseRange, !handled, tx);
                });
            }), { checked: handled }),
        ].filter(isDefined);
    }
}
export class MergeConflictGutterItemView extends Disposable {
    constructor(item, target, contextMenuService) {
        super();
        this.isMultiLine = observableValue(this, false);
        this.item = observableValue(this, item);
        const checkBox = new Toggle({
            isChecked: false,
            title: '',
            icon: Codicon.check,
            ...defaultToggleStyles
        });
        checkBox.domNode.classList.add('accept-conflict-group');
        this._register(addDisposableListener(checkBox.domNode, EventType.MOUSE_DOWN, (e) => {
            const item = this.item.get();
            if (!item) {
                return;
            }
            if (e.button === /* Right */ 2) {
                e.stopPropagation();
                e.preventDefault();
                contextMenuService.showContextMenu({
                    getAnchor: () => checkBox.domNode,
                    getActions: () => item.getContextMenuActions(),
                });
            }
            else if (e.button === /* Middle */ 1) {
                e.stopPropagation();
                e.preventDefault();
                item.toggleBothSides();
            }
        }));
        this._register(autorun(reader => {
            /** @description Update Checkbox */
            const item = this.item.read(reader);
            const value = item.toggleState.read(reader);
            const iconMap = {
                [0 /* InputState.excluded */]: { icon: undefined, checked: false, title: localize('accept.excluded', "Accept") },
                [3 /* InputState.unrecognized */]: { icon: Codicon.circleFilled, checked: false, title: localize('accept.conflicting', "Accept (result is dirty)") },
                [1 /* InputState.first */]: { icon: Codicon.check, checked: true, title: localize('accept.first', "Undo accept") },
                [2 /* InputState.second */]: { icon: Codicon.checkAll, checked: true, title: localize('accept.second', "Undo accept (currently second)") },
            };
            const state = iconMap[value];
            checkBox.setIcon(state.icon);
            checkBox.checked = state.checked;
            checkBox.setTitle(state.title);
            if (!item.enabled.read(reader)) {
                checkBox.disable();
            }
            else {
                checkBox.enable();
            }
        }));
        this._register(autorun(reader => {
            /** @description Update Checkbox CSS ClassNames */
            const state = this.item.read(reader).state.read(reader);
            const classNames = [
                'merge-accept-gutter-marker',
                state.handled && 'handled',
                state.focused && 'focused',
                this.isMultiLine.read(reader) ? 'multi-line' : 'single-line',
            ];
            target.className = classNames.filter(c => typeof c === 'string').join(' ');
        }));
        this._register(checkBox.onChange(() => {
            transaction(tx => {
                /** @description Handle Checkbox Change */
                this.item.get().setState(checkBox.checked, tx);
            });
        }));
        target.appendChild(h('div.background', [noBreakWhitespace]).root);
        target.appendChild(this.checkboxDiv = h('div.checkbox', [h('div.checkbox-background', [checkBox.domNode])]).root);
    }
    layout(top, height, viewTop, viewHeight) {
        const checkboxHeight = this.checkboxDiv.clientHeight;
        const middleHeight = height / 2 - checkboxHeight / 2;
        const margin = checkboxHeight;
        let effectiveCheckboxTop = top + middleHeight;
        const preferredViewPortRange = [
            margin,
            viewTop + viewHeight - margin - checkboxHeight
        ];
        const preferredParentRange = [
            top + margin,
            top + height - checkboxHeight - margin
        ];
        if (preferredParentRange[0] < preferredParentRange[1]) {
            effectiveCheckboxTop = clamp(effectiveCheckboxTop, preferredViewPortRange[0], preferredViewPortRange[1]);
            effectiveCheckboxTop = clamp(effectiveCheckboxTop, preferredParentRange[0], preferredParentRange[1]);
        }
        this.checkboxDiv.style.top = `${effectiveCheckboxTop - top}px`;
        transaction((tx) => {
            /** @description MergeConflictGutterItemView: Update Is Multi Line */
            this.isMultiLine.set(height > 30, tx);
        });
    }
    update(baseRange) {
        transaction(tx => {
            /** @description MergeConflictGutterItemView: Updating new base range */
            this.item.set(baseRange, tx);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXRDb2RlRWRpdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3ZpZXcvZWRpdG9ycy9pbnB1dENvZGVFZGl0b3JWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsTUFBTSxFQUFXLFNBQVMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQWtELGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN2TCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUU3RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUEwQyxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDcEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFFaEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSx3Q0FBd0MsRUFBRSwwQ0FBMEMsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUVwSCxPQUFPLEVBQUUsWUFBWSxFQUFvQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsdUJBQXVCLEVBQUUsU0FBUyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFbEYsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxjQUFjO0lBR3RELFlBQ2lCLFdBQWtCLEVBQ2xDLFNBQXdELEVBQ2pDLG9CQUEyQyxFQUM3QyxrQkFBdUMsRUFDckMsb0JBQTJDO1FBRWxFLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQU43QyxnQkFBVyxHQUFYLFdBQVcsQ0FBTztRQUhuQixxQkFBZ0IsR0FBRyxJQUFJLENBQUMsV0FBVyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFxRWpELHFDQUFnQyxHQUFHLFdBQVcsQ0FBQyxFQUFFLFNBQVMsRUFBRSxRQUFRLElBQUksQ0FBQyxXQUFXLG1DQUFtQyxFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDcEosTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUFDLE9BQU8sRUFBRSxDQUFDO1lBQUMsQ0FBQztZQUM5QixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDO1lBQzlCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7WUFFckMsTUFBTSx5QkFBeUIsR0FBRyxTQUFTLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRW5GLE9BQU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7aUJBQzFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixJQUFJLENBQUMsQ0FBQyxhQUFhLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2lCQUNqSixHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGdDQUFnQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDcEgsQ0FBQyxDQUFDLENBQUM7UUFFYyxnQkFBVyxHQUFHLFdBQVcsQ0FBQyxFQUFFLFNBQVMsRUFBRSxRQUFRLElBQUksQ0FBQyxXQUFXLGNBQWMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQzFHLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEIsT0FBTyxFQUFFLENBQUM7WUFDWCxDQUFDO1lBQ0QsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQztZQUM5QixNQUFNLFNBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDO1lBRW5GLE1BQU0sdUJBQXVCLEdBQUcsU0FBUyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUUvRSxNQUFNLE1BQU0sR0FBRyxJQUFJLEtBQUssRUFBeUIsQ0FBQztZQUVsRCxNQUFNLHlCQUF5QixHQUFHLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkYsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssU0FBUyxJQUFJLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUNoSixNQUFNLHdCQUF3QixHQUFHLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFN0YsS0FBSyxNQUFNLGlCQUFpQixJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDdkUsTUFBTSxLQUFLLEdBQUcsaUJBQWlCLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDaEUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNaLFNBQVM7Z0JBQ1YsQ0FBQztnQkFFRCxNQUFNLGVBQWUsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQy9DLElBQUksWUFBWSxHQUErRCxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM1RixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3pGLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDakMsQ0FBQztnQkFDRCxJQUFJLGlCQUFpQixLQUFLLHVCQUF1QixFQUFFLENBQUM7b0JBQ25ELGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQ2hDLFlBQVksR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM3QixDQUFDO2dCQUNELElBQUksaUJBQWlCLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3JDLGVBQWUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ3JDLENBQUM7Z0JBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO2dCQUN4RSxlQUFlLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUVyQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsYUFBYSxJQUFJLENBQUMseUJBQXlCLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2pGLFNBQVM7Z0JBQ1YsQ0FBQztnQkFFRCxJQUFJLHdCQUF3QixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQzVDLGVBQWUsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQztnQkFDcEQsQ0FBQztnQkFFRCxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNYLEtBQUssRUFBRSxLQUFLLENBQUMsdUJBQXVCLEVBQUU7b0JBQ3RDLE9BQU8sRUFBRTt3QkFDUixlQUFlLEVBQUUsSUFBSTt3QkFDckIsY0FBYyxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO3dCQUN6QyxZQUFZO3dCQUNaLGVBQWUsRUFBRSxLQUFLLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUU7d0JBQ2pFLFdBQVcsRUFBRSxjQUFjO3dCQUMzQixPQUFPLEVBQUU7NEJBQ1IsUUFBUSxnQ0FBd0I7NEJBQ2hDLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLHdDQUF3QyxDQUFDLENBQUMsQ0FBQywwQ0FBMEMsRUFBRTt5QkFDaEg7d0JBQ0QsYUFBYSxFQUFFLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7NEJBQ2hELFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxNQUFNOzRCQUNsQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDLENBQUMsMENBQTBDLEVBQUU7eUJBQ2hILENBQUMsQ0FBQyxDQUFDLFNBQVM7cUJBQ2I7aUJBQ0QsQ0FBQyxDQUFDO2dCQUVILElBQUksQ0FBQyx3QkFBd0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN4SCxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUNyRSxLQUFLLE1BQU0sSUFBSSxJQUFJLFVBQVUsRUFBRSxDQUFDO3dCQUMvQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLENBQUM7d0JBQ2xELElBQUksS0FBSyxFQUFFLENBQUM7NEJBQ1gsTUFBTSxDQUFDLElBQUksQ0FBQztnQ0FDWCxLQUFLO2dDQUNMLE9BQU8sRUFBRTtvQ0FDUixTQUFTLEVBQUUscUJBQXFCLGNBQWMsRUFBRTtvQ0FDaEQsV0FBVyxFQUFFLGNBQWM7b0NBQzNCLFdBQVcsRUFBRSxJQUFJO2lDQUNqQjs2QkFDRCxDQUFDLENBQUM7d0JBQ0osQ0FBQzt3QkFFRCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQzs0QkFDeEIsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0NBQ3BDLElBQUksbUJBQW1CLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7b0NBQ3JELE1BQU0sQ0FBQyxJQUFJLENBQUM7d0NBQ1gsS0FBSyxFQUFFLENBQUMsQ0FBQyxXQUFXO3dDQUNwQixPQUFPLEVBQUU7NENBQ1IsU0FBUyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLGdDQUFnQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsMEJBQTBCLGNBQWMsRUFBRTs0Q0FDbEksV0FBVyxFQUFFLGNBQWM7NENBQzNCLGVBQWUsRUFBRSxJQUFJO3lDQUNyQjtxQ0FDRCxDQUFDLENBQUM7Z0NBQ0osQ0FBQzs0QkFDRixDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7UUExS0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU5QyxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUU7WUFDMUQsMEJBQTBCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQzdDLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUN6QyxPQUFPLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzNELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLEVBQUUsQ0FBQztnQkFDWCxDQUFDO1lBQ0YsQ0FBQztZQUNELFVBQVUsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLElBQUksMkJBQTJCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQztTQUMvRixDQUFDLENBQ0YsQ0FBQztRQUVGLElBQUksQ0FBQyxTQUFTLENBQ2IsdUJBQXVCLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQ3RELFNBQVMsQ0FBQyxLQUFLLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FDdEUsQ0FDRCxDQUFDO1FBRUYsSUFBSSxDQUFDLFNBQVMsQ0FDYixvQkFBb0IsQ0FBQyxjQUFjLENBQ2xDLFNBQVMsRUFDVCxXQUFXLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFDekUsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQ3pCLENBQ0QsQ0FBQztRQUVGLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUUsU0FBUyxFQUFFLFFBQVEsSUFBSSxDQUFDLFdBQVcsOEJBQThCLEVBQUUsRUFBRSxNQUFNLENBQUMsRUFBRTtZQUMxRyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2QyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ1QsT0FBTztZQUNSLENBQUM7WUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUVyRyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxLQUFLLENBQUM7Z0JBQ25DLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUM7Z0JBQ3hELENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUUxRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxLQUFLLENBQUM7Z0JBQ3pDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXO2dCQUM3QixDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDO1lBRS9CLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLEtBQUssQ0FBQztnQkFDcEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU07Z0JBQ3hCLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFFMUIsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLEdBQUcsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUMvRCxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEcsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFHSixJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDM0UsQ0FBQztDQW1IRCxDQUFBO0FBdkxZLG1CQUFtQjtJQU03QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtHQVJYLG1CQUFtQixDQXVML0I7O0FBRUQsTUFBTSxPQUFPLGdDQUFnQztJQUk1QyxZQUNpQixFQUFVLEVBQ1QsU0FBNEIsRUFDNUIsV0FBa0IsRUFDbEIsU0FBK0I7UUFIaEMsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUNULGNBQVMsR0FBVCxTQUFTLENBQW1CO1FBQzVCLGdCQUFXLEdBQVgsV0FBVyxDQUFPO1FBQ2xCLGNBQVMsR0FBVCxTQUFTLENBQXNCO1FBUGhDLFVBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQztRQUM5QixVQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBVXZELFlBQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztRQUVoQyxnQkFBVyxHQUE0QixPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQzdFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLO2lCQUN0QixRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztpQkFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQztpQkFDWixRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzdCLE9BQU8sS0FBSyw4QkFBc0IsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZTtnQkFDcEUsQ0FBQztnQkFDRCxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ1YsQ0FBQyxDQUFDLENBQUM7UUFFYSxVQUFLLEdBQXdELE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDbkcsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxxREFBcUQ7WUFDakcsQ0FBQztZQUNELE9BQU87Z0JBQ04sT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUMxRCxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsS0FBSyxNQUFNO2FBQ2xDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQXZCSCxDQUFDO0lBeUJNLFFBQVEsQ0FBQyxLQUFjLEVBQUUsRUFBZ0I7UUFDL0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQ3RCLElBQUksQ0FBQyxTQUFTLEVBQ2QsSUFBSSxDQUFDLEtBQUs7YUFDUixRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQzthQUN4QixHQUFHLEVBQUU7YUFDTCxjQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsRUFDekMsRUFBRSxFQUNGLElBQUksQ0FBQyxXQUFXLENBQ2hCLENBQUM7SUFDSCxDQUFDO0lBQ00sZUFBZTtRQUNyQixXQUFXLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDaEIsbURBQW1EO1lBQ25ELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLO2lCQUN0QixRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztpQkFDeEIsR0FBRyxFQUFFLENBQUM7WUFDUixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FDbEIsSUFBSSxDQUFDLFNBQVMsRUFDZCxLQUFLO2lCQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO2lCQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3hDLElBQUksRUFDSixFQUFFLENBQ0YsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVNLHFCQUFxQjtRQUMzQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDeEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRTNELE1BQU0sTUFBTSxHQUFHLENBQUMsUUFBZ0MsRUFBRSxFQUFFO1lBQ25ELFdBQVcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDaEIseURBQXlEO2dCQUN6RCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDaEYsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7UUFFRixTQUFTLE1BQU0sQ0FBQyxFQUFVLEVBQUUsS0FBYSxFQUFFLFdBQW1DLEVBQUUsT0FBZ0I7WUFDL0YsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtnQkFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3JCLENBQUMsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDekIsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO1FBQ0QsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGNBQWMsSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDO1FBRTFELE9BQU87WUFDTixJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDcEMsQ0FBQyxDQUFDLE1BQU0sQ0FDUCwwQkFBMEIsRUFDMUIsUUFBUSxDQUFDLG9CQUFvQixFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFDckUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFDZixLQUFLLENBQUMsY0FBYyxDQUNwQjtnQkFDRCxDQUFDLENBQUMsU0FBUztZQUNaLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDO2dCQUNwQyxDQUFDLENBQUMsTUFBTSxDQUNQLDBCQUEwQixFQUMxQixRQUFRLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUNyRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUNmLEtBQUssQ0FBQyxjQUFjLENBQ3BCO2dCQUNELENBQUMsQ0FBQyxTQUFTO1lBQ1osSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhO2dCQUMzQixDQUFDLENBQUMsU0FBUyxDQUNWLE1BQU0sQ0FDTCx3QkFBd0IsRUFDeEIsUUFBUSxDQUNQLHdCQUF3QixFQUN4QixhQUFhLENBQ2IsRUFDRCxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDdkQsSUFBSSxDQUNKLEVBQ0QsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FDekM7Z0JBQ0QsQ0FBQyxDQUFDLFNBQVM7WUFDWixJQUFJLFNBQVMsRUFBRTtZQUNmLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYTtnQkFDM0IsQ0FBQyxDQUFDLFNBQVMsQ0FDVixNQUFNLENBQ0wsa0JBQWtCLEVBQ2xCLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLENBQUMsRUFDcEMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUNaLEtBQUssQ0FDTCxFQUNELEVBQUUsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FDckU7Z0JBQ0QsQ0FBQyxDQUFDLFNBQVM7WUFFWixTQUFTLENBQ1IsSUFBSSxNQUFNLENBQ1QsMkJBQTJCLEVBQzNCLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxpQkFBaUIsQ0FBQyxFQUN4RCxTQUFTLEVBQ1QsSUFBSSxFQUNKLEdBQUcsRUFBRTtnQkFDSixXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtvQkFDbEIsaURBQWlEO29CQUNqRCxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNyRCxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FDRCxFQUNELEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUNwQjtTQUNELENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTywyQkFBNEIsU0FBUSxVQUFVO0lBTTFELFlBQ0MsSUFBc0MsRUFDdEMsTUFBbUIsRUFDbkIsa0JBQXVDO1FBRXZDLEtBQUssRUFBRSxDQUFDO1FBUFEsZ0JBQVcsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBUzNELElBQUksQ0FBQyxJQUFJLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV4QyxNQUFNLFFBQVEsR0FBRyxJQUFJLE1BQU0sQ0FBQztZQUMzQixTQUFTLEVBQUUsS0FBSztZQUNoQixLQUFLLEVBQUUsRUFBRTtZQUNULElBQUksRUFBRSxPQUFPLENBQUMsS0FBSztZQUNuQixHQUFHLG1CQUFtQjtTQUN0QixDQUFDLENBQUM7UUFDSCxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUV4RCxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ25FLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLE9BQU87WUFDUixDQUFDO1lBRUQsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDaEMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNwQixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBRW5CLGtCQUFrQixDQUFDLGVBQWUsQ0FBQztvQkFDbEMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPO29CQUNqQyxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFO2lCQUM5QyxDQUFDLENBQUM7WUFFSixDQUFDO2lCQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDcEIsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUVuQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDeEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUM7UUFFRixJQUFJLENBQUMsU0FBUyxDQUNiLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNoQixtQ0FBbUM7WUFDbkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFFLENBQUM7WUFDckMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDNUMsTUFBTSxPQUFPLEdBQXlGO2dCQUNyRyw2QkFBcUIsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxFQUFFO2dCQUN4RyxpQ0FBeUIsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSwwQkFBMEIsQ0FBQyxFQUFFO2dCQUM1SSwwQkFBa0IsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLEVBQUU7Z0JBQzFHLDJCQUFtQixFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxnQ0FBZ0MsQ0FBQyxFQUFFO2FBQ2xJLENBQUM7WUFDRixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDN0IsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0IsUUFBUSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO1lBQ2pDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRS9CLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDcEIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQztRQUVGLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQy9CLGtEQUFrRDtZQUNsRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hELE1BQU0sVUFBVSxHQUFHO2dCQUNsQiw0QkFBNEI7Z0JBQzVCLEtBQUssQ0FBQyxPQUFPLElBQUksU0FBUztnQkFDMUIsS0FBSyxDQUFDLE9BQU8sSUFBSSxTQUFTO2dCQUMxQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxhQUFhO2FBQzVELENBQUM7WUFDRixNQUFNLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDckMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUNoQiwwQ0FBMEM7Z0JBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDakQsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLHlCQUF5QixFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDN0YsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLENBQUMsR0FBVyxFQUFFLE1BQWMsRUFBRSxPQUFlLEVBQUUsVUFBa0I7UUFDdEUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUM7UUFDckQsTUFBTSxZQUFZLEdBQUcsTUFBTSxHQUFHLENBQUMsR0FBRyxjQUFjLEdBQUcsQ0FBQyxDQUFDO1FBRXJELE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQztRQUU5QixJQUFJLG9CQUFvQixHQUFHLEdBQUcsR0FBRyxZQUFZLENBQUM7UUFFOUMsTUFBTSxzQkFBc0IsR0FBRztZQUM5QixNQUFNO1lBQ04sT0FBTyxHQUFHLFVBQVUsR0FBRyxNQUFNLEdBQUcsY0FBYztTQUM5QyxDQUFDO1FBRUYsTUFBTSxvQkFBb0IsR0FBRztZQUM1QixHQUFHLEdBQUcsTUFBTTtZQUNaLEdBQUcsR0FBRyxNQUFNLEdBQUcsY0FBYyxHQUFHLE1BQU07U0FDdEMsQ0FBQztRQUVGLElBQUksb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEdBQUcsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUN2RCxvQkFBb0IsR0FBRyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6RyxvQkFBb0IsR0FBRyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RyxDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsb0JBQW9CLEdBQUcsR0FBRyxJQUFJLENBQUM7UUFFL0QsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7WUFDbEIscUVBQXFFO1lBQ3JFLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsTUFBTSxDQUFDLFNBQTJDO1FBQ2pELFdBQVcsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNoQix3RUFBd0U7WUFDeEUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEIn0=