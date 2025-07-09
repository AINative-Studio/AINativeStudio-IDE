/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../colorPicker.css';
import * as dom from '../../../../../base/browser/dom.js';
import { Color } from '../../../../../base/common/color.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { editorHoverBackground } from '../../../../../platform/theme/common/colorRegistry.js';
import { CloseButton } from './colorPickerCloseButton.js';
const $ = dom.$;
export class ColorPickerHeader extends Disposable {
    constructor(container, model, themeService, type) {
        super();
        this.model = model;
        this.type = type;
        this._closeButton = null;
        this._domNode = $('.colorpicker-header');
        dom.append(container, this._domNode);
        this._pickedColorNode = dom.append(this._domNode, $('.picked-color'));
        dom.append(this._pickedColorNode, $('span.codicon.codicon-color-mode'));
        this._pickedColorPresentation = dom.append(this._pickedColorNode, document.createElement('span'));
        this._pickedColorPresentation.classList.add('picked-color-presentation');
        const tooltip = localize('clickToToggleColorOptions', "Click to toggle color options (rgb/hsl/hex)");
        this._pickedColorNode.setAttribute('title', tooltip);
        this._originalColorNode = dom.append(this._domNode, $('.original-color'));
        this._originalColorNode.style.backgroundColor = Color.Format.CSS.format(this.model.originalColor) || '';
        this.backgroundColor = themeService.getColorTheme().getColor(editorHoverBackground) || Color.white;
        this._register(themeService.onDidColorThemeChange(theme => {
            this.backgroundColor = theme.getColor(editorHoverBackground) || Color.white;
        }));
        this._register(dom.addDisposableListener(this._pickedColorNode, dom.EventType.CLICK, () => this.model.selectNextColorPresentation()));
        this._register(dom.addDisposableListener(this._originalColorNode, dom.EventType.CLICK, () => {
            this.model.color = this.model.originalColor;
            this.model.flushColor();
        }));
        this._register(model.onDidChangeColor(this.onDidChangeColor, this));
        this._register(model.onDidChangePresentation(this.onDidChangePresentation, this));
        this._pickedColorNode.style.backgroundColor = Color.Format.CSS.format(model.color) || '';
        this._pickedColorNode.classList.toggle('light', model.color.rgba.a < 0.5 ? this.backgroundColor.isLighter() : model.color.isLighter());
        this.onDidChangeColor(this.model.color);
        // When the color picker widget is a standalone color picker widget, then add a close button
        if (this.type === "standalone" /* ColorPickerWidgetType.Standalone */) {
            this._domNode.classList.add('standalone-colorpicker');
            this._closeButton = this._register(new CloseButton(this._domNode));
        }
    }
    get domNode() {
        return this._domNode;
    }
    get closeButton() {
        return this._closeButton;
    }
    get pickedColorNode() {
        return this._pickedColorNode;
    }
    get originalColorNode() {
        return this._originalColorNode;
    }
    onDidChangeColor(color) {
        this._pickedColorNode.style.backgroundColor = Color.Format.CSS.format(color) || '';
        this._pickedColorNode.classList.toggle('light', color.rgba.a < 0.5 ? this.backgroundColor.isLighter() : color.isLighter());
        this.onDidChangePresentation();
    }
    onDidChangePresentation() {
        this._pickedColorPresentation.textContent = this.model.presentation ? this.model.presentation.label : '';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJIZWFkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29sb3JQaWNrZXIvYnJvd3Nlci9jb2xvclBpY2tlclBhcnRzL2NvbG9yUGlja2VySGVhZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sb0JBQW9CLENBQUM7QUFDNUIsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUU5RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFHMUQsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUVoQixNQUFNLE9BQU8saUJBQWtCLFNBQVEsVUFBVTtJQVNoRCxZQUFZLFNBQXNCLEVBQW1CLEtBQXVCLEVBQUUsWUFBMkIsRUFBVSxJQUEyQjtRQUM3SSxLQUFLLEVBQUUsQ0FBQztRQUQ0QyxVQUFLLEdBQUwsS0FBSyxDQUFrQjtRQUF1QyxTQUFJLEdBQUosSUFBSSxDQUF1QjtRQUg3SCxpQkFBWSxHQUF1QixJQUFJLENBQUM7UUFNeEQsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUN6QyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFckMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEdB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