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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { escapeRegExpCharacters } from '../../../../../base/common/strings.js';
import { URI } from '../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { matchesScheme } from '../../../../../base/common/network.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { convertLinkRangeToBuffer, getXtermLineContent } from './terminalLinkHelpers.js';
import { TERMINAL_CONFIG_SECTION } from '../../../terminal/common/terminal.js';
var Constants;
(function (Constants) {
    /**
     * The max line length to try extract word links from.
     */
    Constants[Constants["MaxLineLength"] = 2000] = "MaxLineLength";
})(Constants || (Constants = {}));
let TerminalWordLinkDetector = class TerminalWordLinkDetector extends Disposable {
    static { this.id = 'word'; }
    constructor(xterm, _configurationService, _productService) {
        super();
        this.xterm = xterm;
        this._configurationService = _configurationService;
        this._productService = _productService;
        // Word links typically search the workspace so it makes sense that their maximum link length is
        // quite small.
        this.maxLinkLength = 100;
        this._refreshSeparatorCodes();
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.wordSeparators" /* TerminalSettingId.WordSeparators */)) {
                this._refreshSeparatorCodes();
            }
        }));
    }
    detect(lines, startLine, endLine) {
        const links = [];
        // Get the text representation of the wrapped line
        const text = getXtermLineContent(this.xterm.buffer.active, startLine, endLine, this.xterm.cols);
        if (text === '' || text.length > 2000 /* Constants.MaxLineLength */) {
            return [];
        }
        // Parse out all words from the wrapped line
        const words = this._parseWords(text);
        // Map the words to ITerminalLink objects
        for (const word of words) {
            if (word.text === '') {
                continue;
            }
            if (word.text.length > 0 && word.text.charAt(word.text.length - 1) === ':') {
                word.text = word.text.slice(0, -1);
                word.endIndex--;
            }
            const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, {
                startColumn: word.startIndex + 1,
                startLineNumber: 1,
                endColumn: word.endIndex + 1,
                endLineNumber: 1
            }, startLine);
            // Support this product's URL protocol
            if (matchesScheme(word.text, this._productService.urlProtocol)) {
                const uri = URI.parse(word.text);
                if (uri) {
                    links.push({
                        text: word.text,
                        uri,
                        bufferRange,
                        type: "Url" /* TerminalBuiltinLinkType.Url */
                    });
                }
                continue;
            }
            // Search links
            links.push({
                text: word.text,
                bufferRange,
                type: "Search" /* TerminalBuiltinLinkType.Search */,
                contextLine: text
            });
        }
        return links;
    }
    _parseWords(text) {
        const words = [];
        const splitWords = text.split(this._separatorRegex);
        let runningIndex = 0;
        for (let i = 0; i < splitWords.length; i++) {
            words.push({
                text: splitWords[i],
                startIndex: runningIndex,
                endIndex: runningIndex + splitWords[i].length
            });
            runningIndex += splitWords[i].length + 1;
        }
        return words;
    }
    _refreshSeparatorCodes() {
        const separators = this._configurationService.getValue(TERMINAL_CONFIG_SECTION).wordSeparators;
        let powerlineSymbols = '';
        for (let i = 0xe0b0; i <= 0xe0bf; i++) {
            powerlineSymbols += String.fromCharCode(i);
        }
        this._separatorRegex = new RegExp(`[${escapeRegExpCharacters(separators)}${powerlineSymbols}]`, 'g');
    }
};
TerminalWordLinkDetector = __decorate([
    __param(1, IConfigurationService),
    __param(2, IProductService)
], TerminalWordLinkDetector);
export { TerminalWordLinkDetector };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxXb3JkTGlua0RldGVjdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy9icm93c2VyL3Rlcm1pbmFsV29yZExpbmtEZXRlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDL0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFHM0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDekYsT0FBTyxFQUEwQix1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR3ZHLElBQVcsU0FLVjtBQUxELFdBQVcsU0FBUztJQUNuQjs7T0FFRztJQUNILDhEQUFvQixDQUFBO0FBQ3JCLENBQUMsRUFMVSxTQUFTLEtBQVQsU0FBUyxRQUtuQjtBQVFNLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTthQUNoRCxPQUFFLEdBQUcsTUFBTSxBQUFULENBQVU7SUFRbkIsWUFDVSxLQUFlLEVBQ0QscUJBQTZELEVBQ25FLGVBQWlEO1FBRWxFLEtBQUssRUFBRSxDQUFDO1FBSkMsVUFBSyxHQUFMLEtBQUssQ0FBVTtRQUNnQiww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