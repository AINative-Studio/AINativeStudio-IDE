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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmxpY3RBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvdmlldy9jb25mbGljdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQWUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFdEcsT0FBTyxFQUFnQixvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQXFCLHNCQUFzQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBR3ZELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxVQUFVO0lBSXJELFlBQTZCLE9BQW9CO1FBQ2hELEtBQUssRUFBRSxDQUFDO1FBRG9CLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFHaEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDMUQsSUFBSSxDQUFDLENBQUMsVUFBVSxnQ0FBdUIsSUFBSSxDQUFDLENBQUMsVUFBVSx3Q0FBK0IsSUFBSSxDQUFDLENBQUMsVUFBVSwwQ0FBaUMsRUFBRSxDQUFDO2dCQUN6SSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN6QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxlQUFlLEdBQUcsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLGFBQWEsR0FBRyxnQkFBZ0IsQ0FDcEMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUNoRCxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRTtZQUNwQyxDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUNwQyxDQUFDO1FBRUYsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixNQUFNLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUMzRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsMENBQWlDLENBQUM7UUFDM0UsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGdDQUF1QixDQUFDO1FBRXJFLE1BQU0sYUFBYSxHQUFHLHlCQUF5QixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDdEUsTUFBTSxlQUFlLEdBQUcsMkJBQTJCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUUxRSxJQUFJLFFBQVEsR0FBRztLQUNaLElBQUksQ0FBQyxlQUFlLG1CQUFtQixjQUFjLGtCQUFrQixRQUFRLHNCQUFzQixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsa0NBQWtDLGVBQWU7dUJBQzlKLElBQUksQ0FBQyxlQUFlLGdDQUFnQyxjQUFjLGtCQUFrQixRQUFRO0dBQ2hILENBQUM7UUFDRixJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLFFBQVEsSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLHVCQUF1QixhQUFhLE1BQU0sb0JBQW9CLENBQUMsVUFBVSxHQUFHLENBQUM7UUFDakgsQ0FBQztRQUNELElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQztRQUMxQyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixFQUFFLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxhQUFhLEVBQUUsVUFBVSxJQUFJLFNBQVMsQ0FBQyxDQUFDO1FBQzlGLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUM1RyxDQUFDO0lBRU8sY0FBYztRQUNyQixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxrQ0FBeUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsZ0NBQXVCLENBQUMsQ0FBQztRQUN4SSxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsd0NBQStCLENBQUM7UUFDckUsSUFBSSxDQUFDLFFBQVEsSUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDL0IsUUFBUSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGdDQUF1QixHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBQ0QsT0FBTztZQUNOLFFBQVE7WUFDUixjQUFjLEVBQUUsQ0FBQyxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDO1NBQ2pELENBQUM7SUFDSCxDQUFDO0lBRU0sWUFBWSxDQUFDLHNCQUErQyxFQUFFLFVBQWtCLEVBQUUsS0FBMEMsRUFBRSxvQkFBOEI7UUFDbEssTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3pDLE9BQU8sSUFBSSxvQkFBb0IsQ0FDOUIsSUFBSSxDQUFDLE9BQU8sRUFDWixzQkFBc0IsRUFDdEIsVUFBVSxFQUNWLFVBQVUsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxFQUM3QixJQUFJLENBQUMsZUFBZSxFQUNwQixLQUFLLEVBQ0wsb0JBQW9CLENBQ3BCLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sYUFBYTtJQUN6QixZQUNrQixTQUErQixFQUMvQixpQkFBb0M7UUFEcEMsY0FBUyxHQUFULFNBQVMsQ0FBc0I7UUFDL0Isc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQXFIdEMsZ0JBQVcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLGdCQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVwQyxnQkFBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDcEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNqQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztZQUVqRCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2RSxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDO1lBRTlCLE1BQU0sTUFBTSxHQUEyQixFQUFFLENBQUM7WUFFMUMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLDBCQUEwQixDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUM1RCxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNYLElBQUksRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsbUJBQW1CLENBQUM7b0JBQ3ZELE9BQU8sRUFBRSxRQUFRLENBQUMseUJBQXlCLEVBQUUsMkNBQTJDLENBQUM7aUJBQ3pGLENBQUMsQ0FBQztZQUNKLENBQUM7aUJBQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLDBCQUEwQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUMzRCxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNYLElBQUksRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUscUJBQXFCLENBQUM7b0JBQzFELE9BQU8sRUFBRSxRQUFRLENBQ2hCLDBCQUEwQixFQUMxQix3R0FBd0csQ0FDeEc7aUJBQ0QsQ0FBQyxDQUFDO1lBRUosQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQztnQkFDbEIsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQzFCLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDakMsQ0FBQztnQkFDRCxJQUFJLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDMUIsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNqQyxDQUFDO2dCQUNELElBQUksS0FBSyxDQUFDLElBQUksS0FBSywwQkFBMEIsQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDOUUsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNsQixDQUFDO2dCQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsSUFBSSxFQUFFLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtpQkFDN0IsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUVELE1BQU0sWUFBWSxHQUEyQixFQUFFLENBQUM7WUFDaEQsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzFCLFlBQVksQ0FBQyxJQUFJLENBQ2hCLE9BQU8sQ0FDTixRQUFRLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUNwRCxLQUFLLElBQUksRUFBRTtvQkFDVixXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTt3QkFDbEIsS0FBSyxDQUFDLFFBQVEsQ0FDYixpQkFBaUIsRUFDakIsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQzlCLElBQUksRUFDSixFQUFFLENBQ0YsQ0FBQzt3QkFDRixLQUFLLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2hFLENBQUMsQ0FBQyxDQUFDO2dCQUNKLENBQUMsRUFDRCxRQUFRLENBQUMsZUFBZSxFQUFFLHNDQUFzQyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQ3JGLENBQ0QsQ0FBQztZQUNILENBQUM7WUFDRCxJQUFJLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDMUIsWUFBWSxDQUFDLElBQUksQ0FDaEIsT0FBTyxDQUNOLFFBQVEsQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQ3BELEtBQUssSUFBSSxFQUFFO29CQUNWLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO3dCQUNsQixLQUFLLENBQUMsUUFBUSxDQUNiLGlCQUFpQixFQUNqQixLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsRUFDOUIsSUFBSSxFQUNKLEVBQUUsQ0FDRixDQUFDO3dCQUNGLEtBQUssQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDaEUsQ0FBQyxDQUFDLENBQUM7Z0JBQ0osQ0FBQyxFQUNELFFBQVEsQ0FBQyxlQUFlLEVBQUUsc0NBQXNDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FDckYsQ0FDRCxDQUFDO1lBQ0gsQ0FBQztZQUNELElBQ0MsS0FBSyxDQUFDLElBQUksS0FBSywwQkFBMEIsQ0FBQyxJQUFJO2dCQUM5QyxLQUFLLENBQUMsVUFBVSxLQUFLLENBQUMsRUFDckIsQ0FBQztnQkFDRixZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDeEIsQ0FBQztZQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxZQUFZLENBQUMsQ0FBQztZQUU3QixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssMEJBQTBCLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQzVELE1BQU0sQ0FBQyxJQUFJLENBQ1YsT0FBTyxDQUNOLFFBQVEsQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLEVBQ3hDLEtBQUssSUFBSSxFQUFFO29CQUNWLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO3dCQUNsQixLQUFLLENBQUMsUUFBUSxDQUNiLGlCQUFpQixFQUNqQixzQkFBc0IsQ0FBQyxJQUFJLEVBQzNCLElBQUksRUFDSixFQUFFLENBQ0YsQ0FBQzt3QkFDRixLQUFLLENBQUMsU0FBUyxDQUFDLHdCQUF3QixFQUFFLENBQUM7b0JBQzVDLENBQUMsQ0FBQyxDQUFDO2dCQUNKLENBQUMsRUFDRCxRQUFRLENBQUMsb0JBQW9CLEVBQUUsZ0ZBQWdGLENBQUMsQ0FDaEgsQ0FDRCxDQUFDO1lBQ0gsQ0FBQztZQUVELE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7UUFFYSxZQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUNoRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztRQUNqSSxDQUFDLENBQUMsQ0FBQztRQUVhLGlCQUFZLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUNyRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDO1FBQzFGLENBQUMsQ0FBQyxDQUFDO0lBek9ILENBQUM7SUFFTyxhQUFhLENBQUMsV0FBa0I7UUFDdkMsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDdkIseUJBQXlCO1lBQ3pCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDakMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7WUFFakQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztnQkFDdEQsT0FBTyxFQUFFLENBQUM7WUFDWCxDQUFDO1lBRUQsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkUsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDMUUsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQztZQUU5QixNQUFNLE1BQU0sR0FBMkIsRUFBRSxDQUFDO1lBRTFDLE1BQU0sU0FBUyxHQUFHLFdBQVcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUN0RixNQUFNLHlCQUF5QixHQUFHLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFbkYsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsSUFBSSxPQUFPLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO2dCQUMvRSxPQUFPLEVBQUUsQ0FBQztZQUNYLENBQUM7WUFFRCxNQUFNLGdCQUFnQixHQUFHLFdBQVcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRW5ELElBQUksS0FBSyxDQUFDLElBQUksS0FBSywwQkFBMEIsQ0FBQyxZQUFZLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ25HLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUM3RyxNQUFNLENBQUMsSUFBSSxDQUNWLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxJQUFJLEVBQUU7d0JBQ3JFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFOzRCQUNsQixLQUFLLENBQUMsUUFBUSxDQUNiLGlCQUFpQixFQUNqQixLQUFLLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQzlDLFdBQVcsRUFDWCxFQUFFLENBQ0YsQ0FBQzs0QkFDRixLQUFLLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQzt3QkFDekYsQ0FBQyxDQUFDLENBQUM7b0JBQ0osQ0FBQyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsb0NBQW9DLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQ3BGLENBQUM7b0JBRUYsSUFBSSxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsQ0FBQzt3QkFDckMsTUFBTSxXQUFXLEdBQUcsaUJBQWlCLENBQUMsZUFBZTs0QkFDcEQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxnQ0FBZ0MsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDOzRCQUNqRixDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO3dCQUVoRCxNQUFNLENBQUMsSUFBSSxDQUNWLE9BQU8sQ0FBQyxXQUFXLEVBQUUsS0FBSyxJQUFJLEVBQUU7NEJBQy9CLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO2dDQUNsQixLQUFLLENBQUMsUUFBUSxDQUNiLGlCQUFpQixFQUNqQixzQkFBc0IsQ0FBQyxJQUFJO3FDQUN6QixjQUFjLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQztxQ0FDakMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFDOUMsSUFBSSxFQUNKLEVBQUUsQ0FDRixDQUFDO2dDQUNGLEtBQUssQ0FBQyxTQUFTLENBQUMsNkJBQTZCLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7NEJBQ3RGLENBQUMsQ0FBQyxDQUFDO3dCQUNKLENBQUMsRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsdUVBQXVFLENBQUMsQ0FBQyxDQUMxRyxDQUFDO29CQUNILENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sQ0FBQyxJQUFJLENBQ1YsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLElBQUksRUFBRTt3QkFDckUsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7NEJBQ2xCLEtBQUssQ0FBQyxRQUFRLENBQ2IsaUJBQWlCLEVBQ2pCLEtBQUssQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsRUFDOUMsV0FBVyxFQUNYLEVBQUUsQ0FDRixDQUFDOzRCQUNGLEtBQUssQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO3dCQUN6RixDQUFDLENBQUMsQ0FBQztvQkFDSixDQUFDLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxvQ0FBb0MsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FDcEYsQ0FBQztvQkFFRixJQUFJLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxDQUFDO3dCQUNyQyxNQUFNLENBQUMsSUFBSSxDQUNWLE9BQU8sQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLElBQUksRUFBRTs0QkFDOUUsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7Z0NBQ2xCLEtBQUssQ0FBQyxRQUFRLENBQ2IsaUJBQWlCLEVBQ2pCLEtBQUssQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFDN0MsV0FBVyxFQUNYLEVBQUUsQ0FDRixDQUFDO2dDQUNGLEtBQUssQ0FBQyxTQUFTLENBQUMsNkJBQTZCLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7NEJBQ3RGLENBQUMsQ0FBQyxDQUFDO3dCQUNKLENBQUMsRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsdUVBQXVFLENBQUMsQ0FBQyxDQUMxRyxDQUFDO29CQUNILENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDeEUsTUFBTSxDQUFDLElBQUksQ0FDVixPQUFPLENBQ04sUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFDNUIsS0FBSyxJQUFJLEVBQUU7d0JBQ1YsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7NEJBQ2xCLEtBQUssQ0FBQyxlQUFlLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQzt3QkFDakUsQ0FBQyxDQUFDLENBQUM7b0JBQ0osQ0FBQyxFQUNELFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSx1Q0FBdUMsQ0FBQyxDQUN6RSxDQUNELENBQUM7Z0JBQ0gsQ0FBQztZQUVGLENBQUM7WUFDRCxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQXlIRDtBQUVELFNBQVMsT0FBTyxDQUFDLEtBQWEsRUFBRSxNQUEyQixFQUFFLE9BQWdCO0lBQzVFLE9BQU87UUFDTixJQUFJLEVBQUUsS0FBSztRQUNYLE1BQU07UUFDTixPQUFPO0tBQ1AsQ0FBQztBQUNILENBQUM7QUFRRCxNQUFNLG9CQUFxQixTQUFRLGVBQWU7SUFHakQsWUFDQyxNQUFtQixFQUNuQixnQkFBeUMsRUFDekMsZUFBdUIsRUFDdkIsTUFBYyxFQUVkLFNBQWlCLEVBQ2pCLEtBQTBDLEVBQzFDLG9CQUE4QjtRQUU5QixLQUFLLENBQUMsTUFBTSxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQVovRCxhQUFRLEdBQUcsQ0FBQyxDQUFDLG1DQUFtQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBY3ZFLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU5QyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFdkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDL0IsbUNBQW1DO1lBQ25DLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLFFBQVEsQ0FBQyxLQUE2QjtRQUM3QyxNQUFNLFFBQVEsR0FBa0IsRUFBRSxDQUFDO1FBQ25DLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQztRQUNuQixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxHQUFHLEtBQUssQ0FBQztZQUNqQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO1lBQ3RELENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFOUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2pCLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFPLEVBQUUsRUFBRSxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN6RyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDN0QsQ0FBQztRQUNGLENBQUM7UUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLFFBQVEsQ0FBQyxDQUFDO0lBQ25DLENBQUM7Q0FDRCJ9