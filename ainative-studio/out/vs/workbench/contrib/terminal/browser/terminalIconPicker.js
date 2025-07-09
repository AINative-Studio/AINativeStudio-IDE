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
import { Dimension, getActiveDocument } from '../../../../base/browser/dom.js';
import { codiconsLibrary } from '../../../../base/common/codiconsLibrary.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
import { WorkbenchIconSelectBox } from '../../../services/userDataProfile/browser/iconSelectBox.js';
const icons = new Lazy(() => {
    const iconDefinitions = getIconRegistry().getIcons();
    const includedChars = new Set();
    const dedupedIcons = iconDefinitions.filter(e => {
        if (e.id === codiconsLibrary.blank.id) {
            return false;
        }
        if (!('fontCharacter' in e.defaults)) {
            return false;
        }
        if (includedChars.has(e.defaults.fontCharacter)) {
            return false;
        }
        includedChars.add(e.defaults.fontCharacter);
        return true;
    });
    return dedupedIcons;
});
let TerminalIconPicker = class TerminalIconPicker extends Disposable {
    constructor(instantiationService, _hoverService) {
        super();
        this._hoverService = _hoverService;
        this._iconSelectBox = instantiationService.createInstance(WorkbenchIconSelectBox, {
            icons: icons.value,
            inputBoxStyles: defaultInputBoxStyles,
            showIconInfo: true
        });
    }
    async pickIcons() {
        const dimension = new Dimension(486, 260);
        return new Promise(resolve => {
            this._register(this._iconSelectBox.onDidSelect(e => {
                resolve(e);
                this._iconSelectBox.dispose();
            }));
            this._iconSelectBox.clearInput();
            const hoverWidget = this._hoverService.showInstantHover({
                content: this._iconSelectBox.domNode,
                target: getActiveDocument().body,
                position: {
                    hoverPosition: 2 /* HoverPosition.BELOW */,
                },
                persistence: {
                    sticky: true,
                },
                appearance: {
                    showPointer: true
                }
            }, true);
            if (hoverWidget) {
                this._register(hoverWidget);
            }
            this._iconSelectBox.layout(dimension);
            this._iconSelectBox.focus();
        });
    }
};
TerminalIconPicker = __decorate([
    __param(0, IInstantiationService),
    __param(1, IHoverService)
], TerminalIconPicker);
export { TerminalIconPicker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJY29uUGlja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxJY29uUGlja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDN0UsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBb0IsTUFBTSxtREFBbUQsQ0FBQztBQUN0RyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVwRyxNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBcUIsR0FBRyxFQUFFO0lBQy9DLE1BQU0sZUFBZSxHQUFHLGVBQWUsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3JELE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFDeEMsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUMvQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssZUFBZSxDQUFDLEtBQUssQ0FBQyxFQUFF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