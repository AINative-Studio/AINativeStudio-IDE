/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
export class ColorPickerModel {
    get color() {
        return this._color;
    }
    set color(color) {
        if (this._color.equals(color)) {
            return;
        }
        this._color = color;
        this._onDidChangeColor.fire(color);
    }
    get presentation() { return this.colorPresentations[this.presentationIndex]; }
    get colorPresentations() {
        return this._colorPresentations;
    }
    set colorPresentations(colorPresentations) {
        this._colorPresentations = colorPresentations;
        if (this.presentationIndex > colorPresentations.length - 1) {
            this.presentationIndex = 0;
        }
        this._onDidChangePresentation.fire(this.presentation);
    }
    constructor(color, availableColorPresentations, presentationIndex) {
        this.presentationIndex = presentationIndex;
        this._onColorFlushed = new Emitter();
        this.onColorFlushed = this._onColorFlushed.event;
        this._onDidChangeColor = new Emitter();
        this.onDidChangeColor = this._onDidChangeColor.event;
        this._onDidChangePresentation = new Emitter();
        this.onDidChangePresentation = this._onDidChangePresentation.event;
        this.originalColor = color;
        this._color = color;
        this._colorPresentations = availableColorPresentations;
    }
    selectNextColorPresentation() {
        this.presentationIndex = (this.presentationIndex + 1) % this.colorPresentations.length;
        this.flushColor();
        this._onDidChangePresentation.fire(this.presentation);
    }
    guessColorPresentation(color, originalText) {
        let presentationIndex = -1;
        for (let i = 0; i < this.colorPresentations.length; i++) {
            if (originalText.toLowerCase() === this.colorPresentations[i].label) {
                presentationIndex = i;
                break;
            }
        }
        if (presentationIndex === -1) {
            // check which color presentation text has same prefix as original text's prefix
            const originalTextPrefix = originalText.split('(')[0].toLowerCase();
            for (let i = 0; i < this.colorPresentations.length; i++) {
                if (this.colorPresentations[i].label.toLowerCase().startsWith(originalTextPrefix)) {
                    presentationIndex = i;
                    break;
                }
            }
        }
        if (presentationIndex !== -1 && presentationIndex !== this.presentationIndex) {
            this.presentationIndex = presentationIndex;
            this._onDidChangePresentation.fire(this.presentation);
        }
    }
    flushColor() {
        this._onColorFlushed.fire(this._color);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvY29sb3JQaWNrZXJNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFHbEUsTUFBTSxPQUFPLGdCQUFnQjtJQUs1QixJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLEtBQVk7UUFDckIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQy9CLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxZQUFZLEtBQXlCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUlsRyxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztJQUNqQyxDQUFDO0lBRUQsSUFBSSxrQkFBa0IsQ0FBQyxrQkFBd0M7UUFDOUQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGtCQUFrQixDQUFDO1FBQzlDLElBQUksSUFBSSxDQUFDLGlCQUFpQixHQUFHLGtCQUFrQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM1RCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFDRCxJ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