/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { applyFontInfo } from './domFontInfo.js';
export var CharWidthRequestType;
(function (CharWidthRequestType) {
    CharWidthRequestType[CharWidthRequestType["Regular"] = 0] = "Regular";
    CharWidthRequestType[CharWidthRequestType["Italic"] = 1] = "Italic";
    CharWidthRequestType[CharWidthRequestType["Bold"] = 2] = "Bold";
})(CharWidthRequestType || (CharWidthRequestType = {}));
export class CharWidthRequest {
    constructor(chr, type) {
        this.chr = chr;
        this.type = type;
        this.width = 0;
    }
    fulfill(width) {
        this.width = width;
    }
}
class DomCharWidthReader {
    constructor(bareFontInfo, requests) {
        this._bareFontInfo = bareFontInfo;
        this._requests = requests;
        this._container = null;
        this._testElements = null;
    }
    read(targetWindow) {
        // Create a test container with all these test elements
        this._createDomElements();
        // Add the container to the DOM
        targetWindow.document.body.appendChild(this._container);
        // Read character widths
        this._readFromDomElements();
        // Remove the container from the DOM
        this._container?.remove();
        this._container = null;
        this._testElements = null;
    }
    _createDomElements() {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '-50000px';
        container.style.width = '50000px';
        const regularDomNode = document.createElement('div');
        applyFontInfo(regularDomNode, this._bareFontInfo);
        container.appendChild(regularDomNode);
        const boldDomNode = document.createElement('div');
        applyFontInfo(boldDomNode, this._bareFontInfo);
        boldDomNode.style.fontWeight = 'bold';
        container.appendChild(boldDomNode);
        const italicDomNode = document.createElement('div');
        applyFontInfo(italicDomNode, this._bareFontInfo);
        italicDomNode.style.fontStyle = 'italic';
        container.appendChild(italicDomNode);
        const testElements = [];
        for (const request of this._requests) {
            let parent;
            if (request.type === 0 /* CharWidthRequestType.Regular */) {
                parent = regularDomNode;
            }
            if (request.type === 2 /* CharWidthRequestType.Bold */) {
                parent = boldDomNode;
            }
            if (request.type === 1 /* CharWidthRequestType.Italic */) {
                parent = italicDomNode;
            }
            parent.appendChild(document.createElement('br'));
            const testElement = document.createElement('span');
            DomCharWidthReader._render(testElement, request);
            parent.appendChild(testElement);
            testElements.push(testElement);
        }
        this._container = container;
        this._testElements = testElements;
    }
    static _render(testElement, request) {
        if (request.chr === ' ') {
            let htmlString = '\u00a0';
            // Repeat character 256 (2^8) times
            for (let i = 0; i < 8; i++) {
                htmlString += htmlString;
            }
            testElement.innerText = htmlString;
        }
        else {
            let testString = request.chr;
            // Repeat character 256 (2^8) times
            for (let i = 0; i < 8; i++) {
                testString += testString;
            }
            testElement.textContent = testString;
        }
    }
    _readFromDomElements() {
        for (let i = 0, len = this._requests.length; i < len; i++) {
            const request = this._requests[i];
            const testElement = this._testElements[i];
            request.fulfill(testElement.offsetWidth / 256);
        }
    }
}
export function readCharWidths(targetWindow, bareFontInfo, requests) {
    const reader = new DomCharWidthReader(bareFontInfo, requests);
    reader.read(targetWindow);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcldpZHRoUmVhZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbmZpZy9jaGFyV2lkdGhSZWFkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBR2pELE1BQU0sQ0FBTixJQUFrQixvQkFJakI7QUFKRCxXQUFrQixvQkFBb0I7SUFDckMscUVBQVcsQ0FBQTtJQUNYLG1FQUFVLENBQUE7SUFDViwrREFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUppQixvQkFBb0IsS0FBcEIsb0JBQW9CLFFBSXJDO0FBRUQsTUFBTSxPQUFPLGdCQUFnQjtJQU01QixZQUFZLEdBQVcsRUFBRSxJQUEwQjtRQUNsRCxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztRQUNmLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0lBQ2hCLENBQUM7SUFFTSxPQUFPLENBQUMsS0FBYTtRQUMzQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNwQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLGtCQUFrQjtJQVF2QixZQUFZLFlBQTBCLEVBQUUsUUFBNEI7UUFDbkUsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUM7UUFDbEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7UUFFMUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdkIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7SUFDM0IsQ0FBQztJQUVNLElBQUksQ0FBQyxZQUFvQjtRQUMvQix1REFBdUQ7UUFDdkQsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENB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