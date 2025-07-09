/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Range } from '../../core/range.js';
import { editorBracketHighlightingForeground1, editorBracketHighlightingForeground2, editorBracketHighlightingForeground3, editorBracketHighlightingForeground4, editorBracketHighlightingForeground5, editorBracketHighlightingForeground6, editorBracketHighlightingUnexpectedBracketForeground } from '../../core/editorColorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
export class ColorizedBracketPairsDecorationProvider extends Disposable {
    constructor(textModel) {
        super();
        this.textModel = textModel;
        this.colorProvider = new ColorProvider();
        this.onDidChangeEmitter = new Emitter();
        this.onDidChange = this.onDidChangeEmitter.event;
        this.colorizationOptions = textModel.getOptions().bracketPairColorizationOptions;
        this._register(textModel.bracketPairs.onDidChange(e => {
            this.onDidChangeEmitter.fire();
        }));
    }
    //#region TextModel events
    handleDidChangeOptions(e) {
        this.colorizationOptions = this.textModel.getOptions().bracketPairColorizationOptions;
    }
    //#endregion
    getDecorationsInRange(range, ownerId, filterOutValidation, onlyMinimapDecorations) {
        if (onlyMinimapDecorations) {
            // Bracket pair colorization decorations are not rendered in the minimap
            return [];
        }
        if (ownerId === undefined) {
            return [];
        }
        if (!this.colorizationOptions.enabled) {
            return [];
        }
        const result = this.textModel.bracketPairs.getBracketsInRange(range, true).map(bracket => ({
            id: `bracket${bracket.range.toString()}-${bracket.nestingLevel}`,
            options: {
                description: 'BracketPairColorization',
                inlineClassName: this.colorProvider.getInlineClassName(bracket, this.colorizationOptions.independentColorPoolPerBracketType),
            },
            ownerId: 0,
            range: bracket.range,
        })).toArray();
        return result;
    }
    getAllDecorations(ownerId, filterOutValidation) {
        if (ownerId === undefined) {
            return [];
        }
        if (!this.colorizationOptions.enabled) {
            return [];
        }
        return this.getDecorationsInRange(new Range(1, 1, this.textModel.getLineCount(), 1), ownerId, filterOutValidation);
    }
}
class ColorProvider {
    constructor() {
        this.unexpectedClosingBracketClassName = 'unexpected-closing-bracket';
    }
    getInlineClassName(bracket, independentColorPoolPerBracketType) {
        if (bracket.isInvalid) {
            return this.unexpectedClosingBracketClassName;
        }
        return this.getInlineClassNameOfLevel(independentColorPoolPerBracketType ? bracket.nestingLevelOfEqualBracketType : bracket.nestingLevel);
    }
    getInlineClassNameOfLevel(level) {
        // To support a dynamic amount of colors up to 6 colors,
        // we use a number that is a lcm of all numbers from 1 to 6.
        return `bracket-highlighting-${level % 30}`;
    }
}
registerThemingParticipant((theme, collector) => {
    const colors = [
        editorBracketHighlightingForeground1,
        editorBracketHighlightingForeground2,
        editorBracketHighlightingForeground3,
        editorBracketHighlightingForeground4,
        editorBracketHighlightingForeground5,
        editorBracketHighlightingForeground6
    ];
    const colorProvider = new ColorProvider();
    collector.addRule(`.monaco-editor .${colorProvider.unexpectedClosingBracketClassName} { color: ${theme.getColor(editorBracketHighlightingUnexpectedBracketForeground)}; }`);
    const colorValues = colors
        .map(c => theme.getColor(c))
        .filter((c) => !!c)
        .filter(c => !c.isTransparent());
    for (let level = 0; level < 30; level++) {
        const color = colorValues[level % colorValues.length];
        collector.addRule(`.monaco-editor .${colorProvider.getInlineClassNameOfLevel(level)} { color: ${color}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JpemVkQnJhY2tldFBhaXJzRGVjb3JhdGlvblByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJzVGV4dE1vZGVsUGFydC9jb2xvcml6ZWRCcmFja2V0UGFpcnNEZWNvcmF0aW9uUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFLNUMsT0FBTyxFQUNOLG9DQUFvQyxFQUFFLG9DQUFvQyxFQUFFLG9DQUFvQyxFQUFFLG9DQUFvQyxFQUFFLG9DQUFvQyxFQUFFLG9DQUFvQyxFQUFFLG9EQUFvRCxFQUN4UixNQUFNLG1DQUFtQyxDQUFDO0FBQzNDLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRy9GLE1BQU0sT0FBTyx1Q0FBd0MsU0FBUSxVQUFVO0lBT3RFLFlBQTZCLFNBQW9CO1FBQ2hELEtBQUssRUFBRSxDQUFDO1FBRG9CLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFMaEMsa0JBQWEsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO1FBRXBDLHVCQUFrQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDMUMsZ0JBQVcsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1FBSzNELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsOEJBQThCLENBQUM7UUFFakYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENB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