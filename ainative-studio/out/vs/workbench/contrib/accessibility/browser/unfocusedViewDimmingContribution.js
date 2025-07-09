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
import { createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { clamp } from '../../../../base/common/numbers.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let UnfocusedViewDimmingContribution = class UnfocusedViewDimmingContribution extends Disposable {
    constructor(configurationService) {
        super();
        this._styleElementDisposables = undefined;
        this._register(toDisposable(() => this._removeStyleElement()));
        this._register(Event.runAndSubscribe(configurationService.onDidChangeConfiguration, e => {
            if (e && !e.affectsConfiguration("accessibility.dimUnfocused.enabled" /* AccessibilityWorkbenchSettingId.DimUnfocusedEnabled */) && !e.affectsConfiguration("accessibility.dimUnfocused.opacity" /* AccessibilityWorkbenchSettingId.DimUnfocusedOpacity */)) {
                return;
            }
            let cssTextContent = '';
            const enabled = ensureBoolean(configurationService.getValue("accessibility.dimUnfocused.enabled" /* AccessibilityWorkbenchSettingId.DimUnfocusedEnabled */), false);
            if (enabled) {
                const opacity = clamp(ensureNumber(configurationService.getValue("accessibility.dimUnfocused.opacity" /* AccessibilityWorkbenchSettingId.DimUnfocusedOpacity */), 0.75 /* ViewDimUnfocusedOpacityProperties.Default */), 0.2 /* ViewDimUnfocusedOpacityProperties.Minimum */, 1 /* ViewDimUnfocusedOpacityProperties.Maximum */);
                if (opacity !== 1) {
                    // These filter rules are more specific than may be expected as the `filter`
                    // rule can cause problems if it's used inside the element like on editor hovers
                    const rules = new Set();
                    const filterRule = `filter: opacity(${opacity});`;
                    // Terminal tabs
                    rules.add(`.monaco-workbench .pane-body.integrated-terminal:not(:focus-within) .tabs-container { ${filterRule} }`);
                    // Terminals
                    rules.add(`.monaco-workbench .pane-body.integrated-terminal .terminal-wrapper:not(:focus-within) { ${filterRule} }`);
                    // Text editors
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .monaco-editor { ${filterRule} }`);
                    // Breadcrumbs
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .breadcrumbs-below-tabs { ${filterRule} }`);
                    // Terminal editors
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .terminal-wrapper { ${filterRule} }`);
                    // Settings editor
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .settings-editor { ${filterRule} }`);
                    // Keybindings editor
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .keybindings-editor { ${filterRule} }`);
                    // Editor placeholder (error case)
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .monaco-editor-pane-placeholder { ${filterRule} }`);
                    // Welcome editor
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .gettingStartedContainer { ${filterRule} }`);
                    cssTextContent = [...rules].join('\n');
                }
            }
            if (cssTextContent.length === 0) {
                this._removeStyleElement();
            }
            else {
                this._getStyleElement().textContent = cssTextContent;
            }
        }));
    }
    _getStyleElement() {
        if (!this._styleElement) {
            this._styleElementDisposables = new DisposableStore();
            this._styleElement = createStyleSheet(undefined, undefined, this._styleElementDisposables);
            this._styleElement.className = 'accessibilityUnfocusedViewOpacity';
        }
        return this._styleElement;
    }
    _removeStyleElement() {
        this._styleElementDisposables?.dispose();
        this._styleElementDisposables = undefined;
        this._styleElement = undefined;
    }
};
UnfocusedViewDimmingContribution = __decorate([
    __param(0, IConfigurationService)
], UnfocusedViewDimmingContribution);
export { UnfocusedViewDimmingContribution };
function ensureBoolean(value, defaultValue) {
    return typeof value === 'boolean' ? value : defaultValue;
}
function ensureNumber(value, defaultValue) {
    return typeof value === 'number' ? value : defaultValue;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5mb2N1c2VkVmlld0RpbW1pbmdDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL3VuZm9jdXNlZFZpZXdEaW1taW5nQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFJNUYsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBaUMsU0FBUSxVQUFVO0lBSS9ELFlBQ3dCLG9CQUEyQztRQUVsRSxLQUFLLEVBQUUsQ0FBQztRQUxELDZCQUF3QixHQUFnQyxTQUFTLENBQUM7UUFPekUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRS9ELElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUN2RixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsZ0dBQXFELElBQUksQ0FBQyxDQUFDLENBQUMsb0JBQW9CLGdHQUFxRCxFQUFFLENBQUM7Z0JBQ3ZLLE9BQU87WUFDUixDQUFDO1lBRUQsSUFBSSxjQUFjLEdBQUcsRUFBRSxDQUFDO1lBRXhCLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLGdHQUFxRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3pILElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUNwQixZQUFZLENBQUMsb0JBQW9CLENBQUMsUUFBUSxnR0FBcUQsdURBQTRDLHlHQUczSSxDQUFDO2dCQUVGLElBQUksT0FBTyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNuQiw0RUFBNEU7b0JBQzVFLGdGQUFnRjtvQkFDaEYsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztvQkFDaEMsTUFBTSxVQUFVLEdBQUcsbUJBQW1CLE9BQU8sSUFBSSxDQUFDO29CQUNsRCxnQkFBZ0I7b0JBQ2hCLEtBQUssQ0FBQyxHQUFHLENBQUMseUZBQXlGLFVBQVUsSUFBSSxDQUFDLENBQUM7b0JBQ25ILFlBQVk7b0JBQ1osS0FBSyxDQUFDLEdBQUcsQ0FBQywyRkFBMkYsVUFBVSxJQUFJLENBQUMsQ0FBQztvQkFDckgsZUFBZTtvQkFDZixLQUFLLENBQUMsR0FBRyxDQUFDLDBFQUEwRSxVQUFVLElBQUksQ0FBQyxDQUFDO29CQUNwRyxjQUFjO29CQUNkLEtBQUssQ0FBQyxHQUFHLENBQUMsbUZBQW1GLFVBQVUsSUFBSSxDQUFDLENBQUM7b0JBQzdHLG1CQUFtQjtvQkFDbkIsS0FBSyxDQUFDLEdBQUcsQ0FBQyw2RUFBNkUsVUFBVSxJQUFJLENBQUMsQ0FBQztvQkFDdkcsa0JBQWtCO29CQUNsQixLQUFLLENBQUMsR0FBRyxDQUFDLDRFQUE0RSxVQUFVLElBQUksQ0FBQyxDQUFDO29CQUN0RyxxQkFBcUI7b0JBQ3JCLEtBQUssQ0FBQyxHQUFHLENBQUMsK0VBQStFLFVBQVUsSUFBSSxDQUFDLENBQUM7b0JBQ3pHLGtDQUFrQztvQkFDbEMsS0FBSyxDQUFDLEdBQUcsQ0FBQywyRkFBMkYsVUFBVSxJQUFJLENBQUMsQ0FBQztvQkFDckgsaUJBQWlCO29CQUNqQixLQUFLLENBQUMsR0FBRyxDQUFDLG9GQUFvRixVQUFVLElBQUksQ0FBQyxDQUFDO29CQUM5RyxjQUFjLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDeEMsQ0FBQztZQUVGLENBQUM7WUFFRCxJQUFJLGNBQWMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzVCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxXQUFXLEdBQUcsY0FBYyxDQUFDO1lBQ3RELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3RELElBQUksQ0FBQyxhQUFhLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUMzRixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsR0FBRyxtQ0FBbUMsQ0FBQztRQUNwRSxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzNCLENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsSUFBSSxDQUFDLHdCQUF3QixFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQ3pDLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxTQUFTLENBQUM7UUFDMUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUM7SUFDaEMsQ0FBQztDQUNELENBQUE7QUE1RVksZ0NBQWdDO0lBSzFDLFdBQUEscUJBQXFCLENBQUE7R0FMWCxnQ0FBZ0MsQ0E0RTVDOztBQUdELFNBQVMsYUFBYSxDQUFDLEtBQWMsRUFBRSxZQUFxQjtJQUMzRCxPQUFPLE9BQU8sS0FBSyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7QUFDMUQsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUFDLEtBQWMsRUFBRSxZQUFvQjtJQUN6RCxPQUFPLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7QUFDekQsQ0FBQyJ9