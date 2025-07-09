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
import { getClientArea, getTopLeftOffset, isHTMLDivElement, isHTMLTextAreaElement } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { language, locale } from '../../../../base/common/platform.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import localizedStrings from '../../../../platform/languagePacks/common/localizedStrings.js';
import { getLogs } from '../../../../platform/log/browser/log.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
let BrowserWindowDriver = class BrowserWindowDriver {
    constructor(fileService, environmentService, lifecycleService, logService) {
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.lifecycleService = lifecycleService;
        this.logService = logService;
    }
    async getLogs() {
        return getLogs(this.fileService, this.environmentService);
    }
    async whenWorkbenchRestored() {
        this.logService.info('[driver] Waiting for restored lifecycle phase...');
        await this.lifecycleService.when(3 /* LifecyclePhase.Restored */);
        this.logService.info('[driver] Restored lifecycle phase reached. Waiting for contributions...');
        await Registry.as(WorkbenchExtensions.Workbench).whenRestored;
        this.logService.info('[driver] Workbench contributions created.');
    }
    async setValue(selector, text) {
        const element = mainWindow.document.querySelector(selector);
        if (!element) {
            return Promise.reject(new Error(`Element not found: ${selector}`));
        }
        const inputElement = element;
        inputElement.value = text;
        const event = new Event('input', { bubbles: true, cancelable: true });
        inputElement.dispatchEvent(event);
    }
    async isActiveElement(selector) {
        const element = mainWindow.document.querySelector(selector);
        if (element !== mainWindow.document.activeElement) {
            const chain = [];
            let el = mainWindow.document.activeElement;
            while (el) {
                const tagName = el.tagName;
                const id = el.id ? `#${el.id}` : '';
                const classes = coalesce(el.className.split(/\s+/g).map(c => c.trim())).map(c => `.${c}`).join('');
                chain.unshift(`${tagName}${id}${classes}`);
                el = el.parentElement;
            }
            throw new Error(`Active element not found. Current active element is '${chain.join(' > ')}'. Looking for ${selector}`);
        }
        return true;
    }
    async getElements(selector, recursive) {
        const query = mainWindow.document.querySelectorAll(selector);
        const result = [];
        for (let i = 0; i < query.length; i++) {
            const element = query.item(i);
            result.push(this.serializeElement(element, recursive));
        }
        return result;
    }
    serializeElement(element, recursive) {
        const attributes = Object.create(null);
        for (let j = 0; j < element.attributes.length; j++) {
            const attr = element.attributes.item(j);
            if (attr) {
                attributes[attr.name] = attr.value;
            }
        }
        const children = [];
        if (recursive) {
            for (let i = 0; i < element.children.length; i++) {
                const child = element.children.item(i);
                if (child) {
                    children.push(this.serializeElement(child, true));
                }
            }
        }
        const { left, top } = getTopLeftOffset(element);
        return {
            tagName: element.tagName,
            className: element.className,
            textContent: element.textContent || '',
            attributes,
            children,
            left,
            top
        };
    }
    async getElementXY(selector, xoffset, yoffset) {
        const offset = typeof xoffset === 'number' && typeof yoffset === 'number' ? { x: xoffset, y: yoffset } : undefined;
        return this._getElementXY(selector, offset);
    }
    async typeInEditor(selector, text) {
        const element = mainWindow.document.querySelector(selector);
        if (!element) {
            throw new Error(`Editor not found: ${selector}`);
        }
        if (isHTMLDivElement(element)) {
            // Edit context is enabled
            const editContext = element.editContext;
            if (!editContext) {
                throw new Error(`Edit context not found: ${selector}`);
            }
            const selectionStart = editContext.selectionStart;
            const selectionEnd = editContext.selectionEnd;
            const event = new TextUpdateEvent('textupdate', {
                updateRangeStart: selectionStart,
                updateRangeEnd: selectionEnd,
                text,
                selectionStart: selectionStart + text.length,
                selectionEnd: selectionStart + text.length,
                compositionStart: 0,
                compositionEnd: 0
            });
            editContext.dispatchEvent(event);
        }
        else if (isHTMLTextAreaElement(element)) {
            const start = element.selectionStart;
            const newStart = start + text.length;
            const value = element.value;
            const newValue = value.substr(0, start) + text + value.substr(start);
            element.value = newValue;
            element.setSelectionRange(newStart, newStart);
            const event = new Event('input', { 'bubbles': true, 'cancelable': true });
            element.dispatchEvent(event);
        }
    }
    async getEditorSelection(selector) {
        const element = mainWindow.document.querySelector(selector);
        if (!element) {
            throw new Error(`Editor not found: ${selector}`);
        }
        if (isHTMLDivElement(element)) {
            const editContext = element.editContext;
            if (!editContext) {
                throw new Error(`Edit context not found: ${selector}`);
            }
            return { selectionStart: editContext.selectionStart, selectionEnd: editContext.selectionEnd };
        }
        else if (isHTMLTextAreaElement(element)) {
            return { selectionStart: element.selectionStart, selectionEnd: element.selectionEnd };
        }
        else {
            throw new Error(`Unknown type of element: ${selector}`);
        }
    }
    async getTerminalBuffer(selector) {
        const element = mainWindow.document.querySelector(selector);
        if (!element) {
            throw new Error(`Terminal not found: ${selector}`);
        }
        const xterm = element.xterm;
        if (!xterm) {
            throw new Error(`Xterm not found: ${selector}`);
        }
        const lines = [];
        for (let i = 0; i < xterm.buffer.active.length; i++) {
            lines.push(xterm.buffer.active.getLine(i).translateToString(true));
        }
        return lines;
    }
    async writeInTerminal(selector, text) {
        const element = mainWindow.document.querySelector(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }
        const xterm = element.xterm;
        if (!xterm) {
            throw new Error(`Xterm not found: ${selector}`);
        }
        xterm.input(text);
    }
    getLocaleInfo() {
        return Promise.resolve({
            language: language,
            locale: locale
        });
    }
    getLocalizedStrings() {
        return Promise.resolve({
            open: localizedStrings.open,
            close: localizedStrings.close,
            find: localizedStrings.find
        });
    }
    async _getElementXY(selector, offset) {
        const element = mainWindow.document.querySelector(selector);
        if (!element) {
            return Promise.reject(new Error(`Element not found: ${selector}`));
        }
        const { left, top } = getTopLeftOffset(element);
        const { width, height } = getClientArea(element);
        let x, y;
        if (offset) {
            x = left + offset.x;
            y = top + offset.y;
        }
        else {
            x = left + (width / 2);
            y = top + (height / 2);
        }
        x = Math.round(x);
        y = Math.round(y);
        return { x, y };
    }
    async exitApplication() {
        // No-op in web
    }
};
BrowserWindowDriver = __decorate([
    __param(0, IFileService),
    __param(1, IEnvironmentService),
    __param(2, ILifecycleService),
    __param(3, ILogService)
], BrowserWindowDriver);
export { BrowserWindowDriver };
export function registerWindowDriver(instantiationService) {
    Object.assign(mainWindow, { driver: instantiationService.createInstance(BrowserWindowDriver) });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJpdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9kcml2ZXIvYnJvd3Nlci9kcml2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzNILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFMUUsT0FBTyxnQkFBZ0IsTUFBTSwrREFBK0QsQ0FBQztBQUM3RixPQUFPLEVBQVksT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQW1DLFVBQVUsSUFBSSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXRILE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxxQ0FBcUMsQ0FBQztBQUdqRixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjtJQUUvQixZQUNnQyxXQUF5QixFQUNsQixrQkFBdUMsRUFDekMsZ0JBQW1DLEVBQ3pDLFVBQXVCO1FBSHRCLGdCQUFXLEdBQVgs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