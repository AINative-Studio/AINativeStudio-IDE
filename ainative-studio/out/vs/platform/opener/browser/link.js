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
import { $, append, EventHelper, clearNode } from '../../../base/browser/dom.js';
import { DomEmitter } from '../../../base/browser/event.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { EventType as TouchEventType, Gesture } from '../../../base/browser/touch.js';
import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IOpenerService } from '../common/opener.js';
import './link.css';
import { getDefaultHoverDelegate } from '../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../hover/browser/hover.js';
let Link = class Link extends Disposable {
    get enabled() {
        return this._enabled;
    }
    set enabled(enabled) {
        if (enabled) {
            this.el.setAttribute('aria-disabled', 'false');
            this.el.tabIndex = 0;
            this.el.style.pointerEvents = 'auto';
            this.el.style.opacity = '1';
            this.el.style.cursor = 'pointer';
            this._enabled = false;
        }
        else {
            this.el.setAttribute('aria-disabled', 'true');
            this.el.tabIndex = -1;
            this.el.style.pointerEvents = 'none';
            this.el.style.opacity = '0.4';
            this.el.style.cursor = 'default';
            this._enabled = true;
        }
        this._enabled = enabled;
    }
    set link(link) {
        if (typeof link.label === 'string') {
            this.el.textContent = link.label;
        }
        else {
            clearNode(this.el);
            this.el.appendChild(link.label);
        }
        this.el.href = link.href;
        if (typeof link.tabIndex !== 'undefined') {
            this.el.tabIndex = link.tabIndex;
        }
        this.setTooltip(link.title);
        this._link = link;
    }
    constructor(container, _link, options = {}, _hoverService, openerService) {
        super();
        this._link = _link;
        this._hoverService = _hoverService;
        this._enabled = true;
        this.el = append(container, $('a.monaco-link', {
            tabIndex: _link.tabIndex ?? 0,
            href: _link.href,
        }, _link.label));
        this.hoverDelegate = options.hoverDelegate ?? getDefaultHoverDelegate('mouse');
        this.setTooltip(_link.title);
        this.el.setAttribute('role', 'button');
        const onClickEmitter = this._register(new DomEmitter(this.el, 'click'));
        const onKeyPress = this._register(new DomEmitter(this.el, 'keypress'));
        const onEnterPress = Event.chain(onKeyPress.event, $ => $.map(e => new StandardKeyboardEvent(e))
            .filter(e => e.keyCode === 3 /* KeyCode.Enter */));
        const onTap = this._register(new DomEmitter(this.el, TouchEventType.Tap)).event;
        this._register(Gesture.addTarget(this.el));
        const onOpen = Event.any(onClickEmitter.event, onEnterPress, onTap);
        this._register(onOpen(e => {
            if (!this.enabled) {
                return;
            }
            EventHelper.stop(e, true);
            if (options?.opener) {
                options.opener(this._link.href);
            }
            else {
                openerService.open(this._link.href, { allowCommands: true });
            }
        }));
        this.enabled = true;
    }
    setTooltip(title) {
        if (this.hoverDelegate.showNativeHover) {
            this.el.title = title ?? '';
        }
        else if (!this.hover && title) {
            this.hover = this._register(this._hoverService.setupManagedHover(this.hoverDelegate, this.el, title));
        }
        else if (this.hover) {
            this.hover.update(title);
        }
    }
};
Link = __decorate([
    __param(3, IHoverService),
    __param(4, IOpenerService)
], Link);
export { Link };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9vcGVuZXIvYnJvd3Nlci9saW5rLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBYSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM1RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFNBQVMsSUFBSSxjQUFjLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDdEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDckQsT0FBTyxZQUFZLENBQUM7QUFDcEIsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFHakcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBZXRELElBQU0sSUFBSSxHQUFWLE1BQU0sSUFBSyxTQUFRLFVBQVU7SUFRbkMsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFnQjtRQUMzQixJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxFQUFFLENB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