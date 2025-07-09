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
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { extractCodeblockUrisFromText, extractVulnerabilitiesFromText } from './annotations.js';
import { isResponseVM } from './chatViewModel.js';
let CodeBlockModelCollection = class CodeBlockModelCollection extends Disposable {
    constructor(tag, languageService, textModelService) {
        super();
        this.tag = tag;
        this.languageService = languageService;
        this.textModelService = textModelService;
        this._models = new Map();
        /**
         * Max number of models to keep in memory.
         *
         * Currently always maintains the most recently created models.
         */
        this.maxModelCount = 100;
    }
    dispose() {
        super.dispose();
        this.clear();
    }
    get(sessionId, chat, codeBlockIndex) {
        const entry = this._models.get(this.getKey(sessionId, chat, codeBlockIndex));
        if (!entry) {
            return;
        }
        return {
            model: entry.model.then(ref => ref.object.textEditorModel),
            vulns: entry.vulns,
            codemapperUri: entry.codemapperUri,
            isEdit: entry.isEdit,
        };
    }
    getOrCreate(sessionId, chat, codeBlockIndex) {
        const existing = this.get(sessionId, chat, codeBlockIndex);
        if (existing) {
            return existing;
        }
        const uri = this.getCodeBlockUri(sessionId, chat, codeBlockIndex);
        const model = this.textModelService.createModelReference(uri);
        this._models.set(this.getKey(sessionId, chat, codeBlockIndex), {
            model: model,
            vulns: [],
            codemapperUri: undefined,
        });
        while (this._models.size > this.maxModelCount) {
            const first = Iterable.first(this._models.keys());
            if (!first) {
                break;
            }
            this.delete(first);
        }
        return { model: model.then(x => x.object.textEditorModel), vulns: [], codemapperUri: undefined };
    }
    delete(key) {
        const entry = this._models.get(key);
        if (!entry) {
            return;
        }
        entry.model.then(ref => ref.object.dispose());
        this._models.delete(key);
    }
    clear() {
        this._models.forEach(async (entry) => (await entry.model).dispose());
        this._models.clear();
    }
    updateSync(sessionId, chat, codeBlockIndex, content) {
        const entry = this.getOrCreate(sessionId, chat, codeBlockIndex);
        const extractedVulns = extractVulnerabilitiesFromText(content.text);
        const newText = fixCodeText(extractedVulns.newText, content.languageId);
        this.setVulns(sessionId, chat, codeBlockIndex, extractedVulns.vulnerabilities);
        const codeblockUri = extractCodeblockUrisFromText(newText);
        if (codeblockUri) {
            this.setCodemapperUri(sessionId, chat, codeBlockIndex, codeblockUri.uri, codeblockUri.isEdit);
        }
        if (content.isComplete) {
            this.markCodeBlockCompleted(sessionId, chat, codeBlockIndex);
        }
        return this.get(sessionId, chat, codeBlockIndex) ?? entry;
    }
    markCodeBlockCompleted(sessionId, chat, codeBlockIndex) {
        const entry = this._models.get(this.getKey(sessionId, chat, codeBlockIndex));
        if (!entry) {
            return;
        }
        // TODO: fill this in once we've implemented https://github.com/microsoft/vscode/issues/232538
    }
    async update(sessionId, chat, codeBlockIndex, content) {
        const entry = this.getOrCreate(sessionId, chat, codeBlockIndex);
        const extractedVulns = extractVulnerabilitiesFromText(content.text);
        let newText = fixCodeText(extractedVulns.newText, content.languageId);
        this.setVulns(sessionId, chat, codeBlockIndex, extractedVulns.vulnerabilities);
        const codeblockUri = extractCodeblockUrisFromText(newText);
        if (codeblockUri) {
            this.setCodemapperUri(sessionId, chat, codeBlockIndex, codeblockUri.uri, codeblockUri.isEdit);
            newText = codeblockUri.textWithoutResult;
        }
        if (content.isComplete) {
            this.markCodeBlockCompleted(sessionId, chat, codeBlockIndex);
        }
        const textModel = await entry.model;
        if (textModel.isDisposed()) {
            return entry;
        }
        if (content.languageId) {
            const vscodeLanguageId = this.languageService.getLanguageIdByLanguageName(content.languageId);
            if (vscodeLanguageId && vscodeLanguageId !== textModel.getLanguageId()) {
                textModel.setLanguage(vscodeLanguageId);
            }
        }
        const currentText = textModel.getValue(1 /* EndOfLinePreference.LF */);
        if (newText === currentText) {
            return entry;
        }
        if (newText.startsWith(currentText)) {
            const text = newText.slice(currentText.length);
            const lastLine = textModel.getLineCount();
            const lastCol = textModel.getLineMaxColumn(lastLine);
            textModel.applyEdits([{ range: new Range(lastLine, lastCol, lastLine, lastCol), text }]);
        }
        else {
            // console.log(`Failed to optimize setText`);
            textModel.setValue(newText);
        }
        return entry;
    }
    setCodemapperUri(sessionId, chat, codeBlockIndex, codemapperUri, isEdit) {
        const entry = this._models.get(this.getKey(sessionId, chat, codeBlockIndex));
        if (entry) {
            entry.codemapperUri = codemapperUri;
            entry.isEdit = isEdit;
        }
    }
    setVulns(sessionId, chat, codeBlockIndex, vulnerabilities) {
        const entry = this._models.get(this.getKey(sessionId, chat, codeBlockIndex));
        if (entry) {
            entry.vulns = vulnerabilities;
        }
    }
    getKey(sessionId, chat, index) {
        return `${sessionId}/${chat.id}/${index}`;
    }
    getCodeBlockUri(sessionId, chat, index) {
        const metadata = this.getUriMetaData(chat);
        const indexPart = this.tag ? `${this.tag}-${index}` : `${index}`;
        return URI.from({
            scheme: Schemas.vscodeChatCodeBlock,
            authority: sessionId,
            path: `/${chat.id}/${indexPart}`,
            fragment: metadata ? JSON.stringify(metadata) : undefined,
        });
    }
    getUriMetaData(chat) {
        if (!isResponseVM(chat)) {
            return undefined;
        }
        return {
            references: chat.contentReferences.map(ref => {
                if (typeof ref.reference === 'string') {
                    return;
                }
                const uriOrLocation = 'variableName' in ref.reference ?
                    ref.reference.value :
                    ref.reference;
                if (!uriOrLocation) {
                    return;
                }
                if (URI.isUri(uriOrLocation)) {
                    return {
                        uri: uriOrLocation.toJSON()
                    };
                }
                return {
                    uri: uriOrLocation.uri.toJSON(),
                    range: uriOrLocation.range,
                };
            })
        };
    }
};
CodeBlockModelCollection = __decorate([
    __param(1, ILanguageService),
    __param(2, ITextModelService)
], CodeBlockModelCollection);
export { CodeBlockModelCollection };
function fixCodeText(text, languageId) {
    if (languageId === 'php') {
        if (!text.trim().startsWith('<')) {
            return `<?php\n${text}`;
        }
    }
    return text;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUJsb2NrTW9kZWxDb2xsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NvZGVCbG9ja01vZGVsQ29sbGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBYyxNQUFNLHNDQUFzQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRW5GLE9BQU8sRUFBNEIsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNwSCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsOEJBQThCLEVBQTBCLE1BQU0sa0JBQWtCLENBQUM7QUFDeEgsT0FBTyxFQUFpRCxZQUFZLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQWdCMUYsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO0lBZ0J2RCxZQUNrQixHQUF1QixFQUN0QixlQUFrRCxFQUNqRCxnQkFBb0Q7UUFFdkUsS0FBSyxFQUFFLENBQUM7UUFKUyxRQUFHLEdBQUgsR0FBRyxDQUFvQjtRQUNMLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUNoQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBakJ2RCxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBSzlCLENBQUM7UUFFTDs7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