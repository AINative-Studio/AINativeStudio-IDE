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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic21hcnRTZWxlY3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zbWFydFNlbGVjdC9icm93c2VyL3NtYXJ0U2VsZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSTlFLE9BQU8sRUFBRSxZQUFZLEVBQW1ELG9CQUFvQixFQUFFLDBCQUEwQixFQUFvQixNQUFNLHNDQUFzQyxDQUFDO0FBRXpMLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR3pFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ2pFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRXBGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXhGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2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