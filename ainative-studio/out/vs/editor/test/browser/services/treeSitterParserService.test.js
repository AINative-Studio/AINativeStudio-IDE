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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclBhcnNlclNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL3NlcnZpY2VzL3RyZWVTaXR0ZXJQYXJzZXJTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFlLE1BQU0sd0NBQXdDLENBQUM7QUFFeEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUU1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVqRyxNQUFNLFVBQVU7SUFBaEI7UUFDQyxhQUFRLEdBQTJCLElBQUksQ0FBQztJQWtCekMsQ0FBQztJQWpCQSxNQUFNLEtBQVcsQ0FBQztJQUNsQixXQUFXLENBQUMsUUFBZ0MsSUFBSSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDOUQsS0FBSyxDQUFDLFFBQXVDLEVBQUUsT0FBNEIsRUFBRSxPQUE2QjtRQUN6RyxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUNELEtBQUssS0FBVyxDQUFDO0lBQ2pCLGlCQUFpQjtRQUNoQixPQUFPLEVBQUUs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