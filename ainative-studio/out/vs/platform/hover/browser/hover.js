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
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { addStandardDisposableListener, isHTMLElement } from '../../../base/browser/dom.js';
export const IHoverService = createDecorator('hoverService');
let WorkbenchHoverDelegate = class WorkbenchHoverDelegate extends Disposable {
    get delay() {
        if (this.isInstantlyHovering()) {
            return 0; // show instantly when a hover was recently shown
        }
        if (this.hoverOptions?.dynamicDelay) {
            return content => this.hoverOptions?.dynamicDelay?.(content) ?? this._delay;
        }
        return this._delay;
    }
    constructor(placement, hoverOptions, overrideOptions = {}, configurationService, hoverService) {
        super();
        this.placement = placement;
        this.hoverOptions = hoverOptions;
        this.overrideOptions = overrideOptions;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.lastHoverHideTime = 0;
        this.timeLimit = 200;
        this.hoverDisposables = this._register(new DisposableStore());
        this._delay = this.configurationService.getValue('workbench.hover.delay');
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('workbench.hover.delay')) {
                this._delay = this.configurationService.getValue('workbench.hover.delay');
            }
        }));
    }
    showHover(options, focus) {
        const overrideOptions = typeof this.overrideOptions === 'function' ? this.overrideOptions(options, focus) : this.overrideOptions;
        // close hover on escape
        this.hoverDisposables.clear();
        const targets = isHTMLElement(options.target) ? [options.target] : options.target.targetElements;
        for (const target of targets) {
            this.hoverDisposables.add(addStandardDisposableListener(target, 'keydown', (e) => {
                if (e.equals(9 /* KeyCode.Escape */)) {
                    this.hoverService.hideHover();
                }
            }));
        }
        const id = isHTMLElement(options.content)
            ? undefined
            : typeof options.content === 'string'
                ? options.content.toString()
                : options.content.value;
        return this.hoverService.showInstantHover({
            ...options,
            ...overrideOptions,
            persistence: {
                hideOnKeyDown: true,
                ...overrideOptions.persistence
            },
            id,
            appearance: {
                ...options.appearance,
                compact: true,
                skipFadeInAnimation: this.isInstantlyHovering(),
                ...overrideOptions.appearance
            }
        }, focus);
    }
    isInstantlyHovering() {
        return !!this.hoverOptions?.instantHover && Date.now() - this.lastHoverHideTime < this.timeLimit;
    }
    setInstantHoverTimeLimit(timeLimit) {
        if (!this.hoverOptions?.instantHover) {
            throw new Error('Instant hover is not enabled');
        }
        this.timeLimit = timeLimit;
    }
    onDidHideHover() {
        this.hoverDisposables.clear();
        if (this.hoverOptions?.instantHover) {
            this.lastHoverHideTime = Date.now();
        }
    }
};
WorkbenchHoverDelegate = __decorate([
    __param(3, IConfigurationService),
    __param(4, IHoverService)
], WorkbenchHoverDelegate);
export { WorkbenchHoverDelegate };
// TODO@benibenj remove this, only temp fix for contextviews
export const nativeHoverDelegate = {
    showHover: function () {
        throw new Error('Native hover function not implemented.');
    },
    delay: 0,
    showNativeHover: true
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vaG92ZXIvYnJvd3Nlci9ob3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFJNUYsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBZ0IsY0FBYyxDQUFDLENBQUM7QUFXckUsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVO0lBTXJELElBQUksS0FBSztRQUNSLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQztZQUNoQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGlEQUFpRDtRQUM1RCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxDQUFDO1lBQ3JDLE9BQU8sT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDN0UsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBSUQsWUFDaUIsU0FBOEIsRUFDN0IsWUFBNEMsRUFDckQsa0JBQTBILEVBQUUsRUFDN0csb0JBQTRELEVBQ3BFLFlBQTRDO1FBRTNELEtBQUssRUFBRSxDQUFDO1FB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