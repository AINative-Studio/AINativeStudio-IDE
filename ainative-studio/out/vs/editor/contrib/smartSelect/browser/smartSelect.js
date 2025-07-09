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
var SmartSelectController_1;
import * as arrays from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { EditorAction, registerEditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { BracketSelectionRangeProvider } from './bracketSelections.js';
import { WordSelectionRangeProvider } from './wordSelections.js';
import * as nls from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
class SelectionRanges {
    constructor(index, ranges) {
        this.index = index;
        this.ranges = ranges;
    }
    mov(fwd) {
        const index = this.index + (fwd ? 1 : -1);
        if (index < 0 || index >= this.ranges.length) {
            return this;
        }
        const res = new SelectionRanges(index, this.ranges);
        if (res.ranges[index].equalsRange(this.ranges[this.index])) {
            // next range equals this range, retry with next-next
            return res.mov(fwd);
        }
        return res;
    }
}
let SmartSelectController = class SmartSelectController {
    static { SmartSelectController_1 = this; }
    static { this.ID = 'editor.contrib.smartSelectController'; }
    static get(editor) {
        return editor.getContribution(SmartSelectController_1.ID);
    }
    constructor(_editor, _languageFeaturesService) {
        this._editor = _editor;
        this._languageFeaturesService = _languageFeaturesService;
        this._ignoreSelection = false;
    }
    dispose() {
        this._selectionListener?.dispose();
    }
    async run(forward) {
        if (!this._editor.hasModel()) {
            return;
        }
        const selections = this._editor.getSelections();
        const model = this._editor.getModel();
        if (!this._state) {
            await provideSelectionRanges(this._languageFeaturesService.selectionRangeProvider, model, selections.map(s => s.getPosition()), this._editor.getOption(118 /* EditorOption.smartSelect */), CancellationToken.None).then(ranges => {
                if (!arrays.isNonEmptyArray(ranges) || ranges.length !== selections.length) {
                    // invalid result
                    return;
                }
                if (!this._editor.hasModel() || !arrays.equals(this._editor.getSelections(), selections, (a, b) => a.equalsSelection(b))) {
                    // invalid editor state
                    return;
                }
                for (let i = 0; i < ranges.length; i++) {
                    ranges[i] = ranges[i].filter(range => {
                        // filter ranges inside the selection
                        return range.containsPosition(selections[i].getStartPosition()) && range.containsPosition(selections[i].getEndPosition());
                    });
                    // prepend current selection
                    ranges[i].unshift(selections[i]);
                }
                this._state = ranges.map(ranges => new SelectionRanges(0, ranges));
                // listen to caret move and forget about state
                this._selectionListener?.dispose();
                this._selectionListener = this._editor.onDidChangeCursorPosition(() => {
                    if (!this._ignoreSelection) {
                        this._selectionListener?.dispose();
                        this._state = undefined;
                    }
                });
            });
        }
        if (!this._state) {
            // no state
            return;
        }
        this._state = this._state.map(state => state.mov(forward));
        const newSelections = this._state.map(state => Selection.fromPositions(state.ranges[state.index].getStartPosition(), state.ranges[state.index].getEndPosition()));
        // Void changed this to skip over added whitespace when using smartSelect
        // // Store the original selections for comparison
        // const originalSelections = selections;
        // // Keep skipping while we're only adding/removing whitespace
        // let keepSkipping = true;
        // let skipCount = 0;
        // const MAX_SKIPS = 5; // Avoid infinite loops by setting a reasonable limit
        // while (keepSkipping && skipCount < MAX_SKIPS) {
        // 	keepSkipping = false; // Reset for each iteration
        // 	// Check if all selections only added/removed whitespace
        // 	if (originalSelections.length === newSelections.length) {
        // 		for (let i = 0; i < originalSelections.length; i++) {
        // 			const oldSel = originalSelections[i];
        // 			const newSel = newSelections[i];
        // 			if (forward) { // For expanding (^+Shift+Right)
        // 				// Skip if only whitespace was added
        // 				const oldText = model.getValueInRange(oldSel).trim();
        // 				const newText = model.getValueInRange(newSel).trim();
        // 				const onlyWhitespaceAdded = oldText === newText && oldText.length > 0;
        // 				if (onlyWhitespaceAdded) {
        // 					console.log(`SMART SELECT - SKIPPING (EXPAND) [${skipCount + 1}]:`, {
        // 						reason: 'only whitespace added',
        // 						oldText: model.getValueInRange(oldSel),
        // 						newText: model.getValueInRange(newSel)
        // 					});
        // 					keepSkipping = true;
        // 					break;
        // 				}
        // 			} else { // For shrinking (^+Shift+Left)
        // 				// Skip if only whitespace was removed
        // 				const oldText = model.getValueInRange(oldSel).trim();
        // 				const newText = model.getValueInRange(newSel).trim();
        // 				const onlyWhitespaceRemoved = oldText === newText && newText.length > 0;
        // 				if (onlyWhitespaceRemoved) {
        // 					console.log(`SMART SELECT - SKIPPING (SHRINK) [${skipCount + 1}]:`, {
        // 						reason: 'only whitespace removed',
        // 						oldText: model.getValueInRange(oldSel),
        // 						newText: model.getValueInRange(newSel)
        // 					});
        // 					keepSkipping = true;
        // 					break;
        // 				}
        // 			}
        // 		}
        // 	}
        // 	// If we need to skip, move one more time
        // 	if (keepSkipping) {
        // 		skipCount++;
        // 		// Try to move to the next range
        // 		const prevState = this._state;
        // 		this._state = this._state.map(state => state.mov(forward));
        // 		// Check if we've reached the end of available ranges
        // 		const stateUnchanged = this._state.every((state, idx) =>
        // 			state.index === prevState[idx].index
        // 		);
        // 		if (stateUnchanged) {
        // 			// We can't move any further, so stop skipping
        // 			keepSkipping = false;
        // 		} else {
        // 			// Update selections for the next iteration
        // 			newSelections = this._state.map(state => Selection.fromPositions(
        // 				state.ranges[state.index].getStartPosition(),
        // 				state.ranges[state.index].getEndPosition()
        // 			));
        // 		}
        // 	}
        // }
        // // Print AFTER selection (before actually setting it)
        // console.log('SMART SELECT - AFTER:', newSelections.map(s => {
        // 	return {
        // 		range: `(${s.startLineNumber},${s.startColumn}) -> (${s.endLineNumber},${s.endColumn})`,
        // 		text: model.getValueInRange(s)
        // 	};
        // }));
        this._ignoreSelection = true;
        try {
            this._editor.setSelections(newSelections);
        }
        finally {
            this._ignoreSelection = false;
        }
    }
};
SmartSelectController = SmartSelectController_1 = __decorate([
    __param(1, ILanguageFeaturesService)
], SmartSelectController);
export { SmartSelectController };
class AbstractSmartSelect extends EditorAction {
    constructor(forward, opts) {
        super(opts);
        this._forward = forward;
    }
    async run(_accessor, editor) {
        const controller = SmartSelectController.get(editor);
        if (controller) {
            await controller.run(this._forward);
        }
    }
}
class GrowSelectionAction extends AbstractSmartSelect {
    constructor() {
        super(true, {
            id: 'editor.action.smartSelect.expand',
            label: nls.localize2('smartSelect.expand', "Expand Selection"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */,
                    secondary: [256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */],
                },
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '1_basic',
                title: nls.localize({ key: 'miSmartSelectGrow', comment: ['&& denotes a mnemonic'] }, "&&Expand Selection"),
                order: 2
            }
        });
    }
}
// renamed command id
CommandsRegistry.registerCommandAlias('editor.action.smartSelect.grow', 'editor.action.smartSelect.expand');
class ShrinkSelectionAction extends AbstractSmartSelect {
    constructor() {
        super(false, {
            id: 'editor.action.smartSelect.shrink',
            label: nls.localize2('smartSelect.shrink', "Shrink Selection"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */,
                    secondary: [256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */],
                },
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '1_basic',
                title: nls.localize({ key: 'miSmartSelectShrink', comment: ['&& denotes a mnemonic'] }, "&&Shrink Selection"),
                order: 3
            }
        });
    }
}
registerEditorContribution(SmartSelectController.ID, SmartSelectController, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorAction(GrowSelectionAction);
registerEditorAction(ShrinkSelectionAction);
export async function provideSelectionRanges(registry, model, positions, options, token) {
    const providers = registry.all(model)
        .concat(new WordSelectionRangeProvider(options.selectSubwords)); // ALWAYS have word based selection range
    if (providers.length === 1) {
        // add word selection and bracket selection when no provider exists
        providers.unshift(new BracketSelectionRangeProvider());
    }
    const work = [];
    const allRawRanges = [];
    for (const provider of providers) {
        work.push(Promise.resolve(provider.provideSelectionRanges(model, positions, token)).then(allProviderRanges => {
            if (arrays.isNonEmptyArray(allProviderRanges) && allProviderRanges.length === positions.length) {
                for (let i = 0; i < positions.length; i++) {
                    if (!allRawRanges[i]) {
                        allRawRanges[i] = [];
                    }
                    for (const oneProviderRanges of allProviderRanges[i]) {
                        if (Range.isIRange(oneProviderRanges.range) && Range.containsPosition(oneProviderRanges.range, positions[i])) {
                            allRawRanges[i].push(Range.lift(oneProviderRanges.range));
                        }
                    }
                }
            }
        }, onUnexpectedExternalError));
    }
    await Promise.all(work);
    return allRawRanges.map(oneRawRanges => {
        if (oneRawRanges.length === 0) {
            return [];
        }
        // sort all by start/end position
        oneRawRanges.sort((a, b) => {
            if (Position.isBefore(a.getStartPosition(), b.getStartPosition())) {
                return 1;
            }
            else if (Position.isBefore(b.getStartPosition(), a.getStartPosition())) {
                return -1;
            }
            else if (Position.isBefore(a.getEndPosition(), b.getEndPosition())) {
                return -1;
            }
            else if (Position.isBefore(b.getEndPosition(), a.getEndPosition())) {
                return 1;
            }
            else {
                return 0;
            }
        });
        // remove ranges that don't contain the former range or that are equal to the
        // former range
        const oneRanges = [];
        let last;
        for (const range of oneRawRanges) {
            if (!last || (Range.containsRange(range, last) && !Range.equalsRange(range, last))) {
                oneRanges.push(range);
                last = range;
            }
        }
        if (!options.selectLeadingAndTrailingWhitespace) {
            return oneRanges;
        }
        // add ranges that expand trivia at line starts and ends whenever a range
        // wraps onto the a new line
        const oneRangesWithTrivia = [oneRanges[0]];
        for (let i = 1; i < oneRanges.length; i++) {
            const prev = oneRanges[i - 1];
            const cur = oneRanges[i];
            if (cur.startLineNumber !== prev.startLineNumber || cur.endLineNumber !== prev.endLineNumber) {
                // add line/block range without leading/failing whitespace
                const rangeNoWhitespace = new Range(prev.startLineNumber, model.getLineFirstNonWhitespaceColumn(prev.startLineNumber), prev.endLineNumber, model.getLineLastNonWhitespaceColumn(prev.endLineNumber));
                if (rangeNoWhitespace.containsRange(prev) && !rangeNoWhitespace.equalsRange(prev) && cur.containsRange(rangeNoWhitespace) && !cur.equalsRange(rangeNoWhitespace)) {
                    oneRangesWithTrivia.push(rangeNoWhitespace);
                }
                // add line/block range
                const rangeFull = new Range(prev.startLineNumber, 1, prev.endLineNumber, model.getLineMaxColumn(prev.endLineNumber));
                if (rangeFull.containsRange(prev) && !rangeFull.equalsRange(rangeNoWhitespace) && cur.containsRange(rangeFull) && !cur.equalsRange(rangeFull)) {
                    oneRangesWithTrivia.push(rangeFull);
                }
            }
            oneRangesWithTrivia.push(cur);
        }
        return oneRangesWithTrivia;
    });
}
CommandsRegistry.registerCommand('_executeSelectionRangeProvider', async function (accessor, ...args) {
    const [resource, positions] = args;
    assertType(URI.isUri(resource));
    const registry = accessor.get(ILanguageFeaturesService).selectionRangeProvider;
    const reference = await accessor.get(ITextModelService).createModelReference(resource);
    try {
        return provideSelectionRanges(registry, reference.object.textEditorModel, positions, { selectLeadingAndTrailingWhitespace: true, selectSubwords: true }, CancellationToken.None);
    }
    finally {
        reference.dispose();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic21hcnRTZWxlY3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc21hcnRTZWxlY3QvYnJvd3Nlci9zbWFydFNlbGVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUk5RSxPQUFPLEVBQUUsWUFBWSxFQUFtRCxvQkFBb0IsRUFBRSwwQkFBMEIsRUFBb0IsTUFBTSxzQ0FBc0MsQ0FBQztBQUV6TCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUd6RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN2RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNqRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVwRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUV4RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FB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