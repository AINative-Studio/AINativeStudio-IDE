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
import { addDisposableListener } from '../../../base/browser/dom.js';
import { alert, status } from '../../../base/browser/ui/aria/aria.js';
import { mainWindow } from '../../../base/browser/window.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../common/accessibility.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { ILayoutService } from '../../layout/browser/layoutService.js';
let AccessibilityService = class AccessibilityService extends Disposable {
    constructor(_contextKeyService, _layoutService, _configurationService) {
        super();
        this._contextKeyService = _contextKeyService;
        this._layoutService = _layoutService;
        this._configurationService = _configurationService;
        this._accessibilitySupport = 0 /* AccessibilitySupport.Unknown */;
        this._onDidChangeScreenReaderOptimized = new Emitter();
        this._onDidChangeReducedMotion = new Emitter();
        this._onDidChangeLinkUnderline = new Emitter();
        this._accessibilityModeEnabledContext = CONTEXT_ACCESSIBILITY_MODE_ENABLED.bindTo(this._contextKeyService);
        const updateContextKey = () => this._accessibilityModeEnabledContext.set(this.isScreenReaderOptimized());
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('editor.accessibilitySupport')) {
                updateContextKey();
                this._onDidChangeScreenReaderOptimized.fire();
            }
            if (e.affectsConfiguration('workbench.reduceMotion')) {
                this._configMotionReduced = this._configurationService.getValue('workbench.reduceMotion');
                this._onDidChangeReducedMotion.fire();
            }
        }));
        updateContextKey();
        this._register(this.onDidChangeScreenReaderOptimized(() => updateContextKey()));
        const reduceMotionMatcher = mainWindow.matchMedia(`(prefers-reduced-motion: reduce)`);
        this._systemMotionReduced = reduceMotionMatcher.matches;
        this._configMotionReduced = this._configurationService.getValue('workbench.reduceMotion');
        this._linkUnderlinesEnabled = this._configurationService.getValue('accessibility.underlineLinks');
        this.initReducedMotionListeners(reduceMotionMatcher);
        this.initLinkUnderlineListeners();
    }
    initReducedMotionListeners(reduceMotionMatcher) {
        this._register(addDisposableListener(reduceMotionMatcher, 'change', () => {
            this._systemMotionReduced = reduceMotionMatcher.matches;
            if (this._configMotionReduced === 'auto') {
                this._onDidChangeReducedMotion.fire();
            }
        }));
        const updateRootClasses = () => {
            const reduce = this.isMotionReduced();
            this._layoutService.mainContainer.classList.toggle('reduce-motion', reduce);
            this._layoutService.mainContainer.classList.toggle('enable-motion', !reduce);
        };
        updateRootClasses();
        this._register(this.onDidChangeReducedMotion(() => updateRootClasses()));
    }
    initLinkUnderlineListeners() {
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('accessibility.underlineLinks')) {
                const linkUnderlinesEnabled = this._configurationService.getValue('accessibility.underlineLinks');
                this._linkUnderlinesEnabled = linkUnderlinesEnabled;
                this._onDidChangeLinkUnderline.fire();
            }
        }));
        const updateLinkUnderlineClasses = () => {
            const underlineLinks = this._linkUnderlinesEnabled;
            this._layoutService.mainContainer.classList.toggle('underline-links', underlineLinks);
        };
        updateLinkUnderlineClasses();
        this._register(this.onDidChangeLinkUnderlines(() => updateLinkUnderlineClasses()));
    }
    onDidChangeLinkUnderlines(listener) {
        return this._onDidChangeLinkUnderline.event(listener);
    }
    get onDidChangeScreenReaderOptimized() {
        return this._onDidChangeScreenReaderOptimized.event;
    }
    isScreenReaderOptimized() {
        const config = this._configurationService.getValue('editor.accessibilitySupport');
        return config === 'on' || (config === 'auto' && this._accessibilitySupport === 2 /* AccessibilitySupport.Enabled */);
    }
    get onDidChangeReducedMotion() {
        return this._onDidChangeReducedMotion.event;
    }
    isMotionReduced() {
        const config = this._configMotionReduced;
        return config === 'on' || (config === 'auto' && this._systemMotionReduced);
    }
    alwaysUnderlineAccessKeys() {
        return Promise.resolve(false);
    }
    getAccessibilitySupport() {
        return this._accessibilitySupport;
    }
    setAccessibilitySupport(accessibilitySupport) {
        if (this._accessibilitySupport === accessibilitySupport) {
            return;
        }
        this._accessibilitySupport = accessibilitySupport;
        this._onDidChangeScreenReaderOptimized.fire();
    }
    alert(message) {
        alert(message);
    }
    status(message) {
        status(message);
    }
};
AccessibilityService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ILayoutService),
    __param(2, IConfigurationService)
], AccessibilityService);
export { AccessibilityService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWNjZXNzaWJpbGl0eS9icm93c2VyL2FjY2Vzc2liaWxpdHlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUF3QixrQ0FBa0MsRUFBeUIsTUFBTSw0QkFBNEIsQ0FBQztBQUM3SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEUsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBY25ELFlBQ3FCLGtCQUF1RCxFQUMzRCxjQUErQyxFQUN4QyxxQkFBK0Q7UUFFdEYsS0FBSyxFQUFFLENBQUM7UUFKNkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUMxQyxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFDckIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQWI3RSwwQkFBcUIsd0NBQWdDO1FBQzVDLHNDQUFpQyxHQUFHLElBQUksT0FB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