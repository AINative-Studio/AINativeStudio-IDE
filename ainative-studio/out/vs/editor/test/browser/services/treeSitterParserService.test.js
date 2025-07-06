/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { createTextModel } from '../../common/testTextModel.js';
import { timeout } from '../../../../base/common/async.js';
import { ConsoleMainLogger } from '../../../../platform/log/common/log.js';
import { LogService } from '../../../../platform/log/common/logService.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TextModelTreeSitter } from '../../../common/services/treeSitter/textModelTreeSitter.js';
import { TreeSitterLanguages } from '../../../common/services/treeSitter/treeSitterLanguages.js';
class MockParser {
    constructor() {
        this.language = null;
    }
    delete() { }
    setLanguage(language) { return this; }
    parse(callback, oldTree, options) {
        return new MockTree();
    }
    reset() { }
    getIncludedRanges() {
        return [];
    }
    getTimeoutMicros() { return 0; }
    setTimeoutMicros(timeout) { }
    setLogger(callback) {
        throw new Error('Method not implemented.');
    }
    getLogger() {
        throw new Error('Method not implemented.');
    }
}
class MockTreeSitterImporter {
    constructor() {
        this.parserClass = MockParser;
    }
    async getParserClass() {
        return MockParser;
    }
    async getLanguageClass() {
        return MockLanguage;
    }
    async getQueryClass() {
        throw new Error('Method not implemented.');
    }
}
class MockTree {
    constructor() {
        this.language = new MockLanguage();
        this.editorLanguage = '';
        this.editorContents = '';
        this.rootNode = {};
    }
    rootNodeWithOffset(offsetBytes, offsetExtent) {
        throw new Error('Method not implemented.');
    }
    copy() {
        throw new Error('Method not implemented.');
    }
    delete() { }
    edit(edit) {
        return this;
    }
    walk() {
        throw new Error('Method not implemented.');
    }
    getChangedRanges(other) {
        throw new Error('Method not implemented.');
    }
    getIncludedRanges() {
        throw new Error('Method not implemented.');
    }
    getEditedRange(other) {
        throw new Error('Method not implemented.');
    }
    getLanguage() {
        throw new Error('Method not implemented.');
    }
}
class MockLanguage {
    constructor() {
        this.types = [];
        this.fields = [];
        this.version = 0;
        this.fieldCount = 0;
        this.stateCount = 0;
        this.nodeTypeCount = 0;
        this.languageId = '';
    }
    get name() {
        throw new Error('Method not implemented.');
    }
    get abiVersion() {
        throw new Error('Method not implemented.');
    }
    get metadata() {
        throw new Error('Method not implemented.');
    }
    get supertypes() {
        throw new Error('Method not implemented.');
    }
    subtypes(supertype) {
        throw new Error('Method not implemented.');
    }
    fieldNameForId(fieldId) {
        throw new Error('Method not implemented.');
    }
    fieldIdForName(fieldName) {
        throw new Error('Method not implemented.');
    }
    idForNodeType(type, named) {
        throw new Error('Method not implemented.');
    }
    nodeTypeForId(typeId) {
        throw new Error('Method not implemented.');
    }
    nodeTypeIsNamed(typeId) {
        throw new Error('Method not implemented.');
    }
    nodeTypeIsVisible(typeId) {
        throw new Error('Method not implemented.');
    }
    nextState(stateId, typeId) {
        throw new Error('Method not implemented.');
    }
    query(source) {
        throw new Error('Method not implemented.');
    }
    lookaheadIterator(stateId) {
        throw new Error('Method not implemented.');
    }
}
suite('TreeSitterParserService', function () {
    const treeSitterImporter = new MockTreeSitterImporter();
    let logService;
    let telemetryService;
    setup(function () {
        logService = new LogService(new ConsoleMainLogger());
        telemetryService = new class extends mock() {
            async publicLog2() {
                //
            }
        };
    });
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('TextModelTreeSitter race condition: first language is slow to load', async function () {
        class MockTreeSitterLanguages extends TreeSitterLanguages {
            async _fetchJavascript() {
                await timeout(200);
                const language = new MockLanguage();
                language.languageId = 'javascript';
                this._onDidAddLanguage.fire({ id: 'javascript', language });
            }
            getOrInitLanguage(languageId) {
                if (languageId === 'javascript') {
                    this._fetchJavascript();
                    return undefined;
                }
                const language = new MockLanguage();
                language.languageId = languageId;
                return language;
            }
        }
        const treeSitterLanguages = store.add(new MockTreeSitterLanguages(treeSitterImporter, {}, { isBuilt: false }, new Map()));
        const textModel = store.add(createTextModel('console.log("Hello, world!");', 'javascript'));
        const textModelTreeSitter = store.add(new TextModelTreeSitter(textModel, treeSitterLanguages, false, treeSitterImporter, logService, telemetryService, { exists: async () => false }));
        textModel.setLanguage('typescript');
        await timeout(300);
        assert.strictEqual((textModelTreeSitter.parseResult?.language).languageId, 'typescript');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclBhcnNlclNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvc2VydmljZXMvdHJlZVNpdHRlclBhcnNlclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQWUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV4RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0UsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRWpHLE1BQU0sVUFBVTtJQUFoQjtRQUNDLGFBQVEsR0FBMkIsSUFBSSxDQUFDO0lBa0J6QyxDQUFDO0lBakJBLE1BQU0sS0FBVyxDQUFDO0lBQ2xCLFdBQVcsQ0FBQyxRQUFnQyxJQUFJLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM5RCxLQUFLLENBQUMsUUFBdUMsRUFBRSxPQUE0QixFQUFFLE9BQTZCO1FBQ3pHLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBQ0QsS0FBSyxLQUFXLENBQUM7SUFDakIsaUJBQWlCO1FBQ2hCLE9BQU8sRUFBRSxD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