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
import { $, append, clearNode } from '../../../base/browser/dom.js';
import { Widget } from '../../../base/browser/ui/widget.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { getFlatActionBarActions } from './menuEntryActionViewItem.js';
import { IMenuService } from '../common/actions.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { asCssVariable, asCssVariableWithDefault, buttonBackground, buttonForeground, contrastBorder, editorBackground, editorForeground } from '../../theme/common/colorRegistry.js';
export class FloatingClickWidget extends Widget {
    constructor(label) {
        super();
        this.label = label;
        this._onClick = this._register(new Emitter());
        this.onClick = this._onClick.event;
        this._domNode = $('.floating-click-widget');
        this._domNode.style.padding = '6px 11px';
        this._domNode.style.borderRadius = '2px';
        this._domNode.style.cursor = 'pointer';
        this._domNode.style.zIndex = '1';
    }
    getDomNode() {
        return this._domNode;
    }
    render() {
        clearNode(this._domNode);
        this._domNode.style.backgroundColor = asCssVariableWithDefault(buttonBackground, asCssVariable(editorBackground));
        this._domNode.style.color = asCssVariableWithDefault(buttonForeground, asCssVariable(editorForeground));
        this._domNode.style.border = `1px solid ${asCssVariable(contrastBorder)}`;
        append(this._domNode, $('')).textContent = this.label;
        this.onclick(this._domNode, () => this._onClick.fire());
    }
}
let AbstractFloatingClickMenu = class AbstractFloatingClickMenu extends Disposable {
    constructor(menuId, menuService, contextKeyService) {
        super();
        this.renderEmitter = new Emitter();
        this.onDidRender = this.renderEmitter.event;
        this.menu = this._register(menuService.createMenu(menuId, contextKeyService));
    }
    /** Should be called in implementation constructors after they initialized */
    render() {
        const menuDisposables = this._register(new DisposableStore());
        const renderMenuAsFloatingClickBtn = () => {
            menuDisposables.clear();
            if (!this.isVisible()) {
                return;
            }
            const actions = getFlatActionBarActions(this.menu.getActions({ renderShortTitle: true, shouldForwardArgs: true }));
            if (actions.length === 0) {
                return;
            }
            // todo@jrieken find a way to handle N actions, like showing a context menu
            const [first] = actions;
            const widget = this.createWidget(first, menuDisposables);
            menuDisposables.add(widget);
            menuDisposables.add(widget.onClick(() => first.run(this.getActionArg())));
            widget.render();
        };
        this._register(this.menu.onDidChange(renderMenuAsFloatingClickBtn));
        renderMenuAsFloatingClickBtn();
    }
    getActionArg() {
        return undefined;
    }
    isVisible() {
        return true;
    }
};
AbstractFloatingClickMenu = __decorate([
    __param(1, IMenuService),
    __param(2, IContextKeyService)
], AbstractFloatingClickMenu);
export { AbstractFloatingClickMenu };
let FloatingClickMenu = class FloatingClickMenu extends AbstractFloatingClickMenu {
    constructor(options, instantiationService, menuService, contextKeyService) {
        super(options.menuId, menuService, contextKeyService);
        this.options = options;
        this.instantiationService = instantiationService;
        this.render();
    }
    createWidget(action, disposable) {
        const w = this.instantiationService.createInstance(FloatingClickWidget, action.label);
        const node = w.getDomNode();
        this.options.container.appendChild(node);
        disposable.add(toDisposable(() => node.remove()));
        return w;
    }
    getActionArg() {
        return this.options.getActionArg();
    }
};
FloatingClickMenu = __decorate([
    __param(1, IInstantiationService),
    __param(2, IMenuService),
    __param(3, IContextKeyService)
], FloatingClickMenu);
export { FloatingClickMenu };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxvYXRpbmdNZW51LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbnMvYnJvd3Nlci9mbG9hdGluZ01lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RSxPQUFPLEVBQVMsWUFBWSxFQUFVLE1BQU0sc0JBQXNCLENBQUM7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGFBQWEsRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV0TCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsTUFBTTtJQU85QyxZQUFvQixLQUFhO1FBQ2hDLEtBQUssRUFBRSxDQUFDO1FBRFcsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUxoQixhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDdkQsWUFBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1FBT3RDLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQztRQUN6QyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFDdkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztJQUNsQyxDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRUQsTUFBTTtRQUNMLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLHdCQUF3QixDQUFDLGdCQUFnQixFQUFFLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDbEgsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLHdCQUF3QixDQUFDLGdCQUFnQixFQUFFLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDeEcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLGFBQWEsYUFBYSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7UUFFMUUsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7UUFFdEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN6RCxDQUFDO0NBQ0Q7QUFFTSxJQUFlLHlCQUF5QixHQUF4QyxNQUFlLHlCQUEwQixTQUFRLFVBQVU7SUFLakUsWUFDQyxNQUFjLEVBQ0EsV0FBeUIsRUFDbkIsaUJBQXFDO1FBRXpELEtBQUssRUFBRSxDQUFDO1FBVFEsa0JBQWEsR0FBRyxJQUFJLE9BQU8sRUFBdUIsQ0FBQztRQUNqRCxnQkFBVyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO1FBU3pELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUVELDZFQUE2RTtJQUNuRSxNQUFNO1FBQ2YsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDOUQsTUFBTSw0QkFBNEIsR0FBRyxHQUFHLEVBQUU7WUFDekMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztnQkFDdkIsT0FBTztZQUNSLENBQUM7WUFDRCxNQUFNLE9BQU8sR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbkgsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMxQixPQUFPO1lBQ1IsQ0FBQztZQUNELDJFQUEyRTtZQUMzRSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsT0FBTyxDQUFDO1lBQ3hCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQ3pELGVBQWUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDNUIsZUFBZSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNqQixDQUFDLENBQUM7UUFDRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQztRQUNwRSw0QkFBNEIsRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFJUyxZQUFZO1FBQ3JCLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFUyxTQUFTO1FBQ2xCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNELENBQUE7QUE5Q3FCLHlCQUF5QjtJQU81QyxXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsa0JBQWtCLENBQUE7R0FSQyx5QkFBeUIsQ0E4QzlDOztBQUVNLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEseUJBQXlCO0lBRS9ELFlBQ2tCLE9BT2hCLEVBQ3VDLG9CQUEyQyxFQUNyRSxXQUF5QixFQUNuQixpQkFBcUM7UUFFekQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFackMsWUFBTyxHQUFQLE9BQU8sQ0FPdkI7UUFDdUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUtuRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDZixDQUFDO0lBRWtCLFlBQVksQ0FBQyxNQUFlLEVBQUUsVUFBMkI7UUFDM0UsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEYsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVrQixZQUFZO1FBQzlCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0NBQ0QsQ0FBQTtBQTlCWSxpQkFBaUI7SUFXM0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsa0JBQWtCLENBQUE7R0FiUixpQkFBaUIsQ0E4QjdCIn0=