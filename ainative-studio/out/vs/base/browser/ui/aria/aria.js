/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import './aria.css';
// Use a max length since we are inserting the whole msg in the DOM and that can cause browsers to freeze for long messages #94233
const MAX_MESSAGE_LENGTH = 20000;
let ariaContainer;
let alertContainer;
let alertContainer2;
let statusContainer;
let statusContainer2;
export function setARIAContainer(parent) {
    ariaContainer = document.createElement('div');
    ariaContainer.className = 'monaco-aria-container';
    const createAlertContainer = () => {
        const element = document.createElement('div');
        element.className = 'monaco-alert';
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-atomic', 'true');
        ariaContainer.appendChild(element);
        return element;
    };
    alertContainer = createAlertContainer();
    alertContainer2 = createAlertContainer();
    const createStatusContainer = () => {
        const element = document.createElement('div');
        element.className = 'monaco-status';
        element.setAttribute('aria-live', 'polite');
        element.setAttribute('aria-atomic', 'true');
        ariaContainer.appendChild(element);
        return element;
    };
    statusContainer = createStatusContainer();
    statusContainer2 = createStatusContainer();
    parent.appendChild(ariaContainer);
}
/**
 * Given the provided message, will make sure that it is read as alert to screen readers.
 */
export function alert(msg) {
    if (!ariaContainer) {
        return;
    }
    // Use alternate containers such that duplicated messages get read out by screen readers #99466
    if (alertContainer.textContent !== msg) {
        dom.clearNode(alertContainer2);
        insertMessage(alertContainer, msg);
    }
    else {
        dom.clearNode(alertContainer);
        insertMessage(alertContainer2, msg);
    }
}
/**
 * Given the provided message, will make sure that it is read as status to screen readers.
 */
export function status(msg) {
    if (!ariaContainer) {
        return;
    }
    if (statusContainer.textContent !== msg) {
        dom.clearNode(statusContainer2);
        insertMessage(statusContainer, msg);
    }
    else {
        dom.clearNode(statusContainer);
        insertMessage(statusContainer2, msg);
    }
}
function insertMessage(target, msg) {
    dom.clearNode(target);
    if (msg.length > MAX_MESSAGE_LENGTH) {
        msg = msg.substr(0, MAX_MESSAGE_LENGTH);
    }
    target.textContent = msg;
    // See https://www.paciellogroup.com/blog/2012/06/html5-accessibility-chops-aria-rolealert-browser-support/
    target.style.visibility = 'hidden';
    target.style.visibility = 'visible';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJpYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvYXJpYS9hcmlhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBQ3BDLE9BQU8sWUFBWSxDQUFDO0FBRXBCLGtJQUFrSTtBQUNsSSxNQUFNLGtCQUFrQixHQUFHLEtBQUssQ0FBQztBQUNqQyxJQUFJLGFBQTBCLENBQUM7QUFDL0IsSUFBSSxjQUEyQixDQUFDO0FBQ2hDLElBQUksZUFBNEIsQ0FBQztBQUNqQyxJQUFJLGVBQTRCLENBQUM7QUFDakMsSUFBSSxnQkFBNkIsQ0FBQztBQUNsQyxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsTUFBbUI7SUFDbkQsYUFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUMsYUFBYSxDQUFDLFNBQVMsR0FBRyx1QkFBdUIsQ0FBQztJQUVsRCxNQUFNLG9CQUFvQixHQUFHLEdBQUcsRUFBRTtRQUNqQyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3RDLE9BQU8sQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkMsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQyxDQUFDO0lBQ0YsY0FBYyxHQUFHLG9CQUFvQixFQUFFLENBQUM7SUFDeEMsZUFBZSxHQUFHLG9CQUFvQixFQUFFLENBQUM7SUFFekMsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLEVBQUU7UUFDbEMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QyxPQUFPLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQztRQUNwQyxPQUFPLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM1QyxPQUFPLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM1QyxhQUFhLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25DLE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUMsQ0FBQztJQUNGLGVBQWUsR0FBRyxxQkFBcUIsRUFBRSxDQUFDO0lBQzFDLGdCQUFnQixHQUFHLHFCQUFxQixFQUFFLENBQUM7SUFFM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNuQyxDQUFDO0FBQ0Q7O0dBRUc7QUFDSCxNQUFNLFVBQVUsS0FBSyxDQUFDLEdBQVc7SUFDaEMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3BCLE9BQU87SUFDUixDQUFDO0lBRUQsK0ZBQStGO0lBQy9GLElBQUksY0FBYyxDQUFDLFdBQVcsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUN4QyxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQy9CLGFBQWEsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDcEMsQ0FBQztTQUFNLENBQUM7UUFDUCxHQUFHLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzlCLGFBQWEsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDckMsQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxNQUFNLENBQUMsR0FBVztJQUNqQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDcEIsT0FBTztJQUNSLENBQUM7SUFFRCxJQUFJLGVBQWUsQ0FBQyxXQUFXLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDekMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDckMsQ0FBQztTQUFNLENBQUM7UUFDUCxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQy9CLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLE1BQW1CLEVBQUUsR0FBVztJQUN0RCxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RCLElBQUksR0FBRyxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3JDLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFDRCxNQUFNLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQztJQUV6QiwyR0FBMkc7SUFDM0csTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDO0lBQ25DLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztBQUNyQyxDQUFDIn0=