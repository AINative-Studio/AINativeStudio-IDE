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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { removeAnsiEscapeCodes } from '../../../../base/common/strings.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { ITestResultService } from './testResultService.js';
import { TEST_DATA_SCHEME, parseTestUri } from './testingUri.js';
/**
 * A content provider that returns various outputs for tests. This is used
 * in the inline peek view.
 */
let TestingContentProvider = class TestingContentProvider {
    constructor(textModelResolverService, languageService, modelService, resultService) {
        this.languageService = languageService;
        this.modelService = modelService;
        this.resultService = resultService;
        textModelResolverService.registerTextModelContentProvider(TEST_DATA_SCHEME, this);
    }
    /**
     * @inheritdoc
     */
    async provideTextContent(resource) {
        const existing = this.modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        const parsed = parseTestUri(resource);
        if (!parsed) {
            return null;
        }
        const result = this.resultService.getResult(parsed.resultId);
        if (!result) {
            return null;
        }
        if (parsed.type === 0 /* TestUriType.TaskOutput */) {
            const task = result.tasks[parsed.taskIndex];
            const model = this.modelService.createModel('', null, resource, false);
            const append = (text) => model.applyEdits([{
                    range: { startColumn: 1, endColumn: 1, startLineNumber: Infinity, endLineNumber: Infinity },
                    text,
                }]);
            const init = VSBuffer.concat(task.output.buffers, task.output.length).toString();
            append(removeAnsiEscapeCodes(init));
            let hadContent = init.length > 0;
            const dispose = new DisposableStore();
            dispose.add(task.output.onDidWriteData(d => {
                hadContent ||= d.byteLength > 0;
                append(removeAnsiEscapeCodes(d.toString()));
            }));
            task.output.endPromise.then(() => {
                if (dispose.isDisposed) {
                    return;
                }
                if (!hadContent) {
                    append(localize('runNoOutout', 'The test run did not record any output.'));
                    dispose.dispose();
                }
            });
            model.onWillDispose(() => dispose.dispose());
            return model;
        }
        const test = result?.getStateById(parsed.testExtId);
        if (!test) {
            return null;
        }
        let text;
        let language = null;
        switch (parsed.type) {
            case 3 /* TestUriType.ResultActualOutput */: {
                const message = test.tasks[parsed.taskIndex].messages[parsed.messageIndex];
                if (message?.type === 0 /* TestMessageType.Error */) {
                    text = message.actual;
                }
                break;
            }
            case 1 /* TestUriType.TestOutput */: {
                text = '';
                const output = result.tasks[parsed.taskIndex].output;
                for (const message of test.tasks[parsed.taskIndex].messages) {
                    if (message.type === 1 /* TestMessageType.Output */) {
                        text += removeAnsiEscapeCodes(output.getRange(message.offset, message.length).toString());
                    }
                }
                break;
            }
            case 4 /* TestUriType.ResultExpectedOutput */: {
                const message = test.tasks[parsed.taskIndex].messages[parsed.messageIndex];
                if (message?.type === 0 /* TestMessageType.Error */) {
                    text = message.expected;
                }
                break;
            }
            case 2 /* TestUriType.ResultMessage */: {
                const message = test.tasks[parsed.taskIndex].messages[parsed.messageIndex];
                if (!message) {
                    break;
                }
                if (message.type === 1 /* TestMessageType.Output */) {
                    const content = result.tasks[parsed.taskIndex].output.getRange(message.offset, message.length);
                    text = removeAnsiEscapeCodes(content.toString());
                }
                else if (typeof message.message === 'string') {
                    text = removeAnsiEscapeCodes(message.message);
                }
                else {
                    text = message.message.value;
                    language = this.languageService.createById('markdown');
                }
            }
        }
        if (text === undefined) {
            return null;
        }
        return this.modelService.createModel(text, language, resource, false);
    }
};
TestingContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, ILanguageService),
    __param(2, IModelService),
    __param(3, ITestResultService)
], TestingContentProvider);
export { TestingContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NvbnRlbnRQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RpbmdDb250ZW50UHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUUzRSxPQUFPLEVBQXNCLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFFdkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBNkIsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNySCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFNUQsT0FBTyxFQUFFLGdCQUFnQixFQUFlLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTlFOzs7R0FHRztBQUNJLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXNCO0lBQ2xDLFlBQ29CLHdCQUEyQyxFQUMzQixlQUFpQyxFQUNwQyxZQUEyQixFQUN0QixhQUFpQztRQUZuQyxvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDcEMsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDdEIsa0JBQWEsR0FBYixhQUFhLENBQW9CO1FBRXRFLHdCQUF3QixDQUFDLGdDQUFnQyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFD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