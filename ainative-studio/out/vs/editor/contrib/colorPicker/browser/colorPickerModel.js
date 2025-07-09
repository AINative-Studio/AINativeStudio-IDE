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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL2NvbG9yUGlja2VyTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBR2xFLE1BQU0sT0FBTyxnQkFBZ0I7SUFLNUIsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxJQUFJLEtBQUssQ0FBQyxLQUFZO1FBQ3JCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMvQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELElBQUksWUFBWSxLQUF5QixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFJbEcsSUFBSSxrQkFBa0I7UUFDckIsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUM7SUFDakMsQ0FBQztJQUVELElBQUksa0JBQWtCLENBQUMsa0JBQXdDO1FBQzlELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxrQkFBa0IsQ0FBQztRQUM5QyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQ0Qs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