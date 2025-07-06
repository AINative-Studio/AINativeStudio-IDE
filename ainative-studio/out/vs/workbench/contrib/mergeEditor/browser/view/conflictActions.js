/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, h, isInShadowDOM, reset } from '../../../../../base/browser/dom.js';
import { createStyleSheet } from '../../../../../base/browser/domStylesheets.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { hash } from '../../../../../base/common/hash.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, derived, transaction } from '../../../../../base/common/observable.js';
import { EDITOR_FONT_DEFAULTS } from '../../../../../editor/common/config/editorOptions.js';
import { localize } from '../../../../../nls.js';
import { ModifiedBaseRangeState, ModifiedBaseRangeStateKind } from '../model/modifiedBaseRange.js';
import { FixedZoneWidget } from './fixedZoneWidget.js';
export class ConflictActionsFactory extends Disposable {
    constructor(_editor) {
        super();
        this._editor = _editor;
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(52 /* EditorOption.fontInfo */) || e.hasChanged(19 /* EditorOption.codeLensFontSize */) || e.hasChanged(18 /* EditorOption.codeLensFontFamily */)) {
                this._updateLensStyle();
            }
        }));
        this._styleClassName = '_conflictActionsFactory_' + hash(this._editor.getId()).toString(16);
        this._styleElement = createStyleSheet(isInShadowDOM(this._editor.getContainerDomNode())
            ? this._editor.getContainerDomNode()
            : undefined, undefined, this._store);
        this._updateLensStyle();
    }
    _updateLensStyle() {
        const { codeLensHeight, fontSize } = this._getLayoutInfo();
        const fontFamily = this._editor.getOption(18 /* EditorOption.codeLensFontFamily */);
        const editorFontInfo = this._editor.getOption(52 /* EditorOption.fontInfo */);
        const fontFamilyVar = `--codelens-font-family${this._styleClassName}`;
        const fontFeaturesVar = `--codelens-font-features${this._styleClassName}`;
        let newStyle = `
		.${this._styleClassName} { line-height: ${codeLensHeight}px; font-size: ${fontSize}px; padding-right: ${Math.round(fontSize * 0.5)}px; font-feature-settings: var(${fontFeaturesVar}) }
		.monaco-workbench .${this._styleClassName} span.codicon { line-height: ${codeLensHeight}px; font-size: ${fontSize}px; }
		`;
        if (fontFamily) {
            newStyle += `${this._styleClassName} { font-family: var(${fontFamilyVar}), ${EDITOR_FONT_DEFAULTS.fontFamily}}`;
        }
        this._styleElement.textContent = newStyle;
        this._editor.getContainerDomNode().style?.setProperty(fontFamilyVar, fontFamily ?? 'inherit');
        this._editor.getContainerDomNode().style?.setProperty(fontFeaturesVar, editorFontInfo.fontFeatureSettings);
    }
    _getLayoutInfo() {
        const lineHeightFactor = Math.max(1.3, this._editor.getOption(68 /* EditorOption.lineHeight */) / this._editor.getOption(54 /* EditorOption.fontSize */));
        let fontSize = this._editor.getOption(19 /* EditorOption.codeLensFontSize */);
        if (!fontSize || fontSize < 5) {
            fontSize = (this._editor.getOption(54 /* EditorOption.fontSize */) * .9) | 0;
        }
        return {
            fontSize,
            codeLensHeight: (fontSize * lineHeightFactor) | 0,
        };
    }
    createWidget(viewZoneChangeAccessor, lineNumber, items, viewZoneIdsToCleanUp) {
        const layoutInfo = this._getLayoutInfo();
        return new ActionsContentWidget(this._editor, viewZoneChangeAccessor, lineNumber, layoutInfo.codeLensHeight + 2, this._styleClassName, items, viewZoneIdsToCleanUp);
    }
}
export class ActionsSource {
    constructor(viewModel, modifiedBaseRange) {
        this.viewModel = viewModel;
        this.modifiedBaseRange = modifiedBaseRange;
        this.itemsInput1 = this.getItemsInput(1);
        this.itemsInput2 = this.getItemsInput(2);
        this.resultItems = derived(this, reader => {
            const viewModel = this.viewModel;
            const modifiedBaseRange = this.modifiedBaseRange;
            const state = viewModel.model.getState(modifiedBaseRange).read(reader);
            const model = viewModel.model;
            const result = [];
            if (state.kind === ModifiedBaseRangeStateKind.unrecognized) {
                result.push({
                    text: localize('manualResolution', "Manual Resolution"),
                    tooltip: localize('manualResolutionTooltip', "This conflict has been resolved manually."),
                });
            }
            else if (state.kind === ModifiedBaseRangeStateKind.base) {
                result.push({
                    text: localize('noChangesAccepted', 'No Changes Accepted'),
                    tooltip: localize('noChangesAcceptedTooltip', 'The current resolution of this conflict equals the common ancestor of both the right and left changes.'),
                });
            }
            else {
                const labels = [];
                if (state.includesInput1) {
                    labels.push(model.input1.title);
                }
                if (state.includesInput2) {
                    labels.push(model.input2.title);
                }
                if (state.kind === ModifiedBaseRangeStateKind.both && state.firstInput === 2) {
                    labels.reverse();
                }
                result.push({
                    text: `${labels.join(' + ')}`
                });
            }
            const stateToggles = [];
            if (state.includesInput1) {
                stateToggles.push(command(localize('remove', 'Remove {0}', model.input1.title), async () => {
                    transaction((tx) => {
                        model.setState(modifiedBaseRange, state.withInputValue(1, false), true, tx);
                        model.telemetry.reportRemoveInvoked(1, state.includesInput(2));
                    });
                }, localize('removeTooltip', 'Remove {0} from the result document.', model.input1.title)));
            }
            if (state.includesInput2) {
                stateToggles.push(command(localize('remove', 'Remove {0}', model.input2.title), async () => {
                    transaction((tx) => {
                        model.setState(modifiedBaseRange, state.withInputValue(2, false), true, tx);
                        model.telemetry.reportRemoveInvoked(2, state.includesInput(1));
                    });
                }, localize('removeTooltip', 'Remove {0} from the result document.', model.input2.title)));
            }
            if (state.kind === ModifiedBaseRangeStateKind.both &&
                state.firstInput === 2) {
                stateToggles.reverse();
            }
            result.push(...stateToggles);
            if (state.kind === ModifiedBaseRangeStateKind.unrecognized) {
                result.push(command(localize('resetToBase', 'Reset to base'), async () => {
                    transaction((tx) => {
                        model.setState(modifiedBaseRange, ModifiedBaseRangeState.base, true, tx);
                        model.telemetry.reportResetToBaseInvoked();
                    });
                }, localize('resetToBaseTooltip', 'Reset this conflict to the common ancestor of both the right and left changes.')));
            }
            return result;
        });
        this.isEmpty = derived(this, reader => {
            return this.itemsInput1.read(reader).length + this.itemsInput2.read(reader).length + this.resultItems.read(reader).length === 0;
        });
        this.inputIsEmpty = derived(this, reader => {
            return this.itemsInput1.read(reader).length + this.itemsInput2.read(reader).length === 0;
        });
    }
    getItemsInput(inputNumber) {
        return derived(reader => {
            /** @description items */
            const viewModel = this.viewModel;
            const modifiedBaseRange = this.modifiedBaseRange;
            if (!viewModel.model.hasBaseRange(modifiedBaseRange)) {
                return [];
            }
            const state = viewModel.model.getState(modifiedBaseRange).read(reader);
            const handled = viewModel.model.isHandled(modifiedBaseRange).read(reader);
            const model = viewModel.model;
            const result = [];
            const inputData = inputNumber === 1 ? viewModel.model.input1 : viewModel.model.input2;
            const showNonConflictingChanges = viewModel.showNonConflictingChanges.read(reader);
            if (!modifiedBaseRange.isConflicting && handled && !showNonConflictingChanges) {
                return [];
            }
            const otherInputNumber = inputNumber === 1 ? 2 : 1;
            if (state.kind !== ModifiedBaseRangeStateKind.unrecognized && !state.isInputIncluded(inputNumber)) {
                if (!state.isInputIncluded(otherInputNumber) || !this.viewModel.shouldUseAppendInsteadOfAccept.read(reader)) {
                    result.push(command(localize('accept', "Accept {0}", inputData.title), async () => {
                        transaction((tx) => {
                            model.setState(modifiedBaseRange, state.withInputValue(inputNumber, true, false), inputNumber, tx);
                            model.telemetry.reportAcceptInvoked(inputNumber, state.includesInput(otherInputNumber));
                        });
                    }, localize('acceptTooltip', "Accept {0} in the result document.", inputData.title)));
                    if (modifiedBaseRange.canBeCombined) {
                        const commandName = modifiedBaseRange.isOrderRelevant
                            ? localize('acceptBoth0First', "Accept Combination ({0} First)", inputData.title)
                            : localize('acceptBoth', "Accept Combination");
                        result.push(command(commandName, async () => {
                            transaction((tx) => {
                                model.setState(modifiedBaseRange, ModifiedBaseRangeState.base
                                    .withInputValue(inputNumber, true)
                                    .withInputValue(otherInputNumber, true, true), true, tx);
                                model.telemetry.reportSmartCombinationInvoked(state.includesInput(otherInputNumber));
                            });
                        }, localize('acceptBothTooltip', "Accept an automatic combination of both sides in the result document.")));
                    }
                }
                else {
                    result.push(command(localize('append', "Append {0}", inputData.title), async () => {
                        transaction((tx) => {
                            model.setState(modifiedBaseRange, state.withInputValue(inputNumber, true, false), inputNumber, tx);
                            model.telemetry.reportAcceptInvoked(inputNumber, state.includesInput(otherInputNumber));
                        });
                    }, localize('appendTooltip', "Append {0} to the result document.", inputData.title)));
                    if (modifiedBaseRange.canBeCombined) {
                        result.push(command(localize('combine', "Accept Combination", inputData.title), async () => {
                            transaction((tx) => {
                                model.setState(modifiedBaseRange, state.withInputValue(inputNumber, true, true), inputNumber, tx);
                                model.telemetry.reportSmartCombinationInvoked(state.includesInput(otherInputNumber));
                            });
                        }, localize('acceptBothTooltip', "Accept an automatic combination of both sides in the result document.")));
                    }
                }
                if (!model.isInputHandled(modifiedBaseRange, inputNumber).read(reader)) {
                    result.push(command(localize('ignore', 'Ignore'), async () => {
                        transaction((tx) => {
                            model.setInputHandled(modifiedBaseRange, inputNumber, true, tx);
                        });
                    }, localize('markAsHandledTooltip', "Don't take this side of the conflict.")));
                }
            }
            return result;
        });
    }
}
function command(title, action, tooltip) {
    return {
        text: title,
        action,
        tooltip,
    };
}
class ActionsContentWidget extends FixedZoneWidget {
    constructor(editor, viewZoneAccessor, afterLineNumber, height, className, items, viewZoneIdsToCleanUp) {
        super(editor, viewZoneAccessor, afterLineNumber, height, viewZoneIdsToCleanUp);
        this._domNode = h('div.merge-editor-conflict-actions').root;
        this.widgetDomNode.appendChild(this._domNode);
        this._domNode.classList.add(className);
        this._register(autorun(reader => {
            /** @description update commands */
            const i = items.read(reader);
            this.setState(i);
        }));
    }
    setState(items) {
        const children = [];
        let isFirst = true;
        for (const item of items) {
            if (isFirst) {
                isFirst = false;
            }
            else {
                children.push($('span', undefined, '\u00a0|\u00a0'));
            }
            const title = renderLabelWithIcons(item.text);
            if (item.action) {
                children.push($('a', { title: item.tooltip, role: 'button', onclick: () => item.action() }, ...title));
            }
            else {
                children.push($('span', { title: item.tooltip }, ...title));
            }
        }
        reset(this._domNode, ...children);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmxpY3RBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L2NvbmZsaWN0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDOUYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBZSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUV0RyxPQUFPLEVBQWdCLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBcUIsc0JBQXNCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0SCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFHdkQsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFVBQVU7SUFJckQsWUFBNkIsT0FBb0I7UUFDaEQsS0FBSyxFQUFFLENBQUM7UUFEb0IsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUdoRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxD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