/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../base/browser/domStylesheets.js';
import * as cssJs from '../../../base/browser/cssValue.js';
import { DomEmitter } from '../../../base/browser/event.js';
import { Event } from '../../../base/common/event.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { Gesture, EventType as GestureEventType } from '../../../base/browser/touch.js';
import { renderLabelWithIcons } from '../../../base/browser/ui/iconLabel/iconLabels.js';
import { IdGenerator } from '../../../base/common/idGenerator.js';
import { parseLinkedText } from '../../../base/common/linkedText.js';
import './media/quickInput.css';
import { localize } from '../../../nls.js';
const iconPathToClass = {};
const iconClassGenerator = new IdGenerator('quick-input-button-icon-');
function getIconClass(iconPath) {
    if (!iconPath) {
        return undefined;
    }
    let iconClass;
    const key = iconPath.dark.toString();
    if (iconPathToClass[key]) {
        iconClass = iconPathToClass[key];
    }
    else {
        iconClass = iconClassGenerator.nextId();
        domStylesheetsJs.createCSSRule(`.${iconClass}, .hc-light .${iconClass}`, `background-image: ${cssJs.asCSSUrl(iconPath.light || iconPath.dark)}`);
        domStylesheetsJs.createCSSRule(`.vs-dark .${iconClass}, .hc-black .${iconClass}`, `background-image: ${cssJs.asCSSUrl(iconPath.dark)}`);
        iconPathToClass[key] = iconClass;
    }
    return iconClass;
}
export function quickInputButtonToAction(button, id, run) {
    let cssClasses = button.iconClass || getIconClass(button.iconPath);
    if (button.alwaysVisible) {
        cssClasses = cssClasses ? `${cssClasses} always-visible` : 'always-visible';
    }
    return {
        id,
        label: '',
        tooltip: button.tooltip || '',
        class: cssClasses,
        enabled: true,
        run
    };
}
export function renderQuickInputDescription(description, container, actionHandler) {
    dom.reset(container);
    const parsed = parseLinkedText(description);
    let tabIndex = 0;
    for (const node of parsed.nodes) {
        if (typeof node === 'string') {
            container.append(...renderLabelWithIcons(node));
        }
        else {
            let title = node.title;
            if (!title && node.href.startsWith('command:')) {
                title = localize('executeCommand', "Click to execute command '{0}'", node.href.substring('command:'.length));
            }
            else if (!title) {
                title = node.href;
            }
            const anchor = dom.$('a', { href: node.href, title, tabIndex: tabIndex++ }, node.label);
            anchor.style.textDecoration = 'underline';
            const handleOpen = (e) => {
                if (dom.isEventLike(e)) {
                    dom.EventHelper.stop(e, true);
                }
                actionHandler.callback(node.href);
            };
            const onClick = actionHandler.disposables.add(new DomEmitter(anchor, dom.EventType.CLICK)).event;
            const onKeydown = actionHandler.disposables.add(new DomEmitter(anchor, dom.EventType.KEY_DOWN)).event;
            const onSpaceOrEnter = Event.chain(onKeydown, $ => $.filter(e => {
                const event = new StandardKeyboardEvent(e);
                return event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */);
            }));
            actionHandler.disposables.add(Gesture.addTarget(anchor));
            const onTap = actionHandler.disposables.add(new DomEmitter(anchor, GestureEventType.Tap)).event;
            Event.any(onClick, onTap, onSpaceOrEnter)(handleOpen, null, actionHandler.disposables);
            container.appendChild(anchor);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci9xdWlja0lucHV0VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEtBQUssZ0JBQWdCLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxLQUFLLEtBQUssTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxJQUFJLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVyRSxPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUszQyxNQUFNLGVBQWUsR0FBMkIsRUFBRSxDQUFDO0FBQ25ELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxXQUFXLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUV2RSxTQUFTLFlBQVksQ0FBQyxRQUFnRDtJQUNyRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDZixPQUFPLFNBQVMsQ0FBQztJQUNs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