/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Widget } from '../widget.js';
import { Emitter } from '../../../common/event.js';
import './radio.css';
import { $ } from '../../dom.js';
import { Button } from '../button/button.js';
import { DisposableMap, DisposableStore } from '../../../common/lifecycle.js';
import { createInstantHoverDelegate } from '../hover/hoverDelegateFactory.js';
export class Radio extends Widget {
    constructor(opts) {
        super();
        this._onDidSelect = this._register(new Emitter());
        this.onDidSelect = this._onDidSelect.event;
        this.items = [];
        this.buttons = this._register(new DisposableMap());
        this.hoverDelegate = opts.hoverDelegate ?? this._register(createInstantHoverDelegate());
        this.domNode = $('.monaco-custom-radio');
        this.domNode.setAttribute('role', 'radio');
        this.setItems(opts.items);
    }
    setItems(items) {
        this.buttons.clearAndDisposeAll();
        this.items = items;
        this.activeItem = this.items.find(item => item.isActive) ?? this.items[0];
        for (let index = 0; index < this.items.length; index++) {
            const item = this.items[index];
            const disposables = new DisposableStore();
            const button = disposables.add(new Button(this.domNode, {
                hoverDelegate: this.hoverDelegate,
                title: item.tooltip,
                supportIcons: true,
            }));
            button.enabled = !item.disabled;
            disposables.add(button.onDidClick(() => {
                if (this.activeItem !== item) {
                    this.activeItem = item;
                    this.updateButtons();
                    this._onDidSelect.fire(index);
                }
            }));
            this.buttons.set(button, { item, dispose: () => disposables.dispose() });
        }
        this.updateButtons();
    }
    setActiveItem(index) {
        if (index < 0 || index >= this.items.length) {
            throw new Error('Invalid Index');
        }
        this.activeItem = this.items[index];
        this.updateButtons();
    }
    setEnabled(enabled) {
        for (const [button] of this.buttons) {
            button.enabled = enabled;
        }
    }
    updateButtons() {
        let isActive = false;
        for (const [button, { item }] of this.buttons) {
            const isPreviousActive = isActive;
            isActive = item === this.activeItem;
            button.element.classList.toggle('active', isActive);
            button.element.classList.toggle('previous-active', isPreviousActive);
            button.label = item.text;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFkaW8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3JhZGlvL3JhZGlvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFdEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ25ELE9BQU8sYUFBYSxDQUFDO0FBQ3JCLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFakMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDOUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUF5QjlFLE1BQU0sT0FBTyxLQUFNLFNBQVEsTUFBTTtJQWNoQyxZQUFZLElBQW1CO1FBQzlCLEtBQUssRUFBRSxDQUFDO1FBYlEsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQztRQUM3RCxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1FBTXZDLFVBQUssR0FBb0MsRUFBRSxDQUFDO1FBR25DLFlBQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUF1RCxDQUFDLENBQUM7UUFLbkgsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDO1FBRXhGLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRTNDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNCLENBQUM7SUFFRCxRQUFRLENBQUMsS0FBc0M7UUFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRSxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUN4RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9CLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7WUFDMUMsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUN2RCxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7Z0JBQ2pDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDbkIsWUFBWSxFQUFFLElBQUk7YUFDbEIsQ0FBQyxDQUFDLENBQUM7WUFDSixNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUNoQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUN0QyxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQzlCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO29CQUN2QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3JCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMvQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQ0QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxhQUFhLENBQUMsS0FBYTtRQUMxQixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRUQsVUFBVSxDQUFDLE9BQWdCO1FBQzFCLEtBQUssTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNyQyxNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUMxQixDQUFDO0lBQ0YsQ0FBQztJQUVPLGFBQWE7UUFDcEIsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLEtBQUssTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQy9DLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDO1lBQ2xDLFFBQVEsR0FBRyxJQUFJLEtBQUssSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNwQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3JFLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUMxQixDQUFDO0lBQ0YsQ0FBQztDQUVEIn0=