/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestInstantiationService } from '../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { TreeSitterTextModelService } from '../../../editor/common/services/treeSitter/treeSitterParserService.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { Event } from '../../../base/common/event.js';
import { URI } from '../../../base/common/uri.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { ILogService, NullLogService } from '../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { ModelService } from '../../../editor/common/services/modelService.js';
// eslint-disable-next-line local/code-layering, local/code-import-patterns
import { TreeSitterTokenizationFeature } from '../../services/treeSitter/browser/treeSitterTokenizationFeature.js';
import { ITreeSitterImporter, ITreeSitterParserService, TreeSitterImporter } from '../../../editor/common/services/treeSitterParserService.js';
import { TreeSitterTokenizationRegistry } from '../../../editor/common/languages.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { Schemas } from '../../../base/common/network.js';
import { DiskFileSystemProvider } from '../../../platform/files/node/diskFileSystemProvider.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { LanguageService } from '../../../editor/common/services/languageService.js';
import { TestColorTheme, TestThemeService } from '../../../platform/theme/test/common/testThemeService.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { ITextResourcePropertiesService } from '../../../editor/common/services/textResourceConfiguration.js';
import { TestTextResourcePropertiesService } from '../common/workbenchTestServices.js';
import { TestLanguageConfigurationService } from '../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { ILanguageConfigurationService } from '../../../editor/common/languages/languageConfigurationRegistry.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from '../../../platform/undoRedo/common/undoRedoService.js';
import { TestDialogService } from '../../../platform/dialogs/test/common/testDialogService.js';
import { TestNotificationService } from '../../../platform/notification/test/common/testNotificationService.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { TokenStyle } from '../../../platform/theme/common/tokenClassificationRegistry.js';
import { Color } from '../../../base/common/color.js';
import { ITreeSitterTokenizationStoreService } from '../../../editor/common/model/treeSitterTokenStoreService.js';
import { Range } from '../../../editor/common/core/range.js';
// eslint-disable-next-line local/code-layering, local/code-import-patterns
import { ICodeEditorService } from '../../../editor/browser/services/codeEditorService.js';
// eslint-disable-next-line local/code-layering, local/code-import-patterns
import { TestCodeEditorService } from '../../../editor/test/browser/editorTestServices.js';
class MockTelemetryService {
    constructor() {
        this.telemetryLevel = 0 /* TelemetryLevel.NONE */;
        this.sessionId = '';
        this.machineId = '';
        this.sqmId = '';
        this.devDeviceId = '';
        this.firstSessionDate = '';
        this.sendErrorTelemetry = false;
    }
    publicLog(eventName, data) {
    }
    publicLog2(eventName, data) {
    }
    publicLogError(errorEventName, data) {
    }
    publicLogError2(eventName, data) {
    }
    setExperimentProperty(name, value) {
    }
}
class MockTokenStoreService {
    delete(model) {
        throw new Error('Method not implemented.');
    }
    handleContentChanged(model, e) {
    }
    rangeHasTokens(model, range, minimumTokenQuality) {
        return true;
    }
    rangHasAnyTokens(model) {
        return true;
    }
    getNeedsRefresh(model) {
        return [];
    }
    setTokens(model, tokens) {
    }
    getTokens(model, line) {
        return undefined;
    }
    updateTokens(model, version, updates) {
    }
    markForRefresh(model, range) {
    }
    hasTokens(model, accurateForRange) {
        return true;
    }
}
class TestTreeSitterColorTheme extends TestColorTheme {
    resolveScopes(scopes, definitions) {
        return new TokenStyle(Color.red, undefined, undefined, undefined, undefined);
    }
    getTokenColorIndex() {
        return { get: () => 10 };
    }
}
suite('Tree Sitter TokenizationFeature', function () {
    let instantiationService;
    let modelService;
    let fileService;
    let textResourcePropertiesService;
    let languageConfigurationService;
    let telemetryService;
    let logService;
    let configurationService;
    let themeService;
    let languageService;
    let environmentService;
    let tokenStoreService;
    let treeSitterParserService;
    let treeSitterTokenizationSupport;
    let disposables;
    setup(async () => {
        disposables = new DisposableStore();
        instantiationService = disposables.add(new TestInstantiationService());
        telemetryService = new MockTelemetryService();
        logService = new NullLogService();
        configurationService = new TestConfigurationService({ 'editor.experimental.preferTreeSitter.typescript': true });
        themeService = new TestThemeService(new TestTreeSitterColorTheme());
        environmentService = {};
        tokenStoreService = new MockTokenStoreService();
        instantiationService.set(IEnvironmentService, environmentService);
        instantiationService.set(IConfigurationService, configurationService);
        instantiationService.set(ILogService, logService);
        instantiationService.set(ITelemetryService, telemetryService);
        instantiationService.set(ITreeSitterTokenizationStoreService, tokenStoreService);
        languageService = disposables.add(instantiationService.createInstance(LanguageService));
        instantiationService.set(ILanguageService, languageService);
        instantiationService.set(IThemeService, themeService);
        textResourcePropertiesService = instantiationService.createInstance(TestTextResourcePropertiesService);
        instantiationService.set(ITextResourcePropertiesService, textResourcePropertiesService);
        languageConfigurationService = disposables.add(instantiationService.createInstance(TestLanguageConfigurationService));
        instantiationService.set(ILanguageConfigurationService, languageConfigurationService);
        instantiationService.set(ITreeSitterImporter, instantiationService.createInstance(TreeSitterImporter));
        instantiationService.set(ICodeEditorService, instantiationService.createInstance(TestCodeEditorService));
        fileService = disposables.add(instantiationService.createInstance(FileService));
        const diskFileSystemProvider = disposables.add(new DiskFileSystemProvider(logService));
        disposables.add(fileService.registerProvider(Schemas.file, diskFileSystemProvider));
        instantiationService.set(IFileService, fileService);
        const dialogService = new TestDialogService();
        const notificationService = new TestNotificationService();
        const undoRedoService = new UndoRedoService(dialogService, notificationService);
        instantiationService.set(IUndoRedoService, undoRedoService);
        modelService = new ModelService(configurationService, textResourcePropertiesService, undoRedoService, instantiationService);
        instantiationService.set(IModelService, modelService);
        treeSitterParserService = disposables.add(instantiationService.createInstance(TreeSitterTextModelService));
        treeSitterParserService.isTest = true;
        instantiationService.set(ITreeSitterParserService, treeSitterParserService);
        disposables.add(instantiationService.createInstance(TreeSitterTokenizationFeature));
        treeSitterTokenizationSupport = disposables.add(await TreeSitterTokenizationRegistry.getOrCreate('typescript'));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function tokensContentSize(tokens) {
        return tokens[tokens.length - 1].startOffsetInclusive + tokens[tokens.length - 1].length;
    }
    let nameNumber = 1;
    async function getModelAndPrepTree(content) {
        const model = disposables.add(modelService.createModel(content, { languageId: 'typescript', onDidChange: Event.None }, URI.file(`file${nameNumber++}.ts`)));
        const tree = disposables.add(await treeSitterParserService.getTextModelTreeSitter(model));
        const treeParseResult = new Promise(resolve => {
            const disposable = treeSitterParserService.onDidUpdateTree(e => {
                if (e.textModel === model) {
                    disposable.dispose();
                    resolve();
                }
            });
        });
        await tree.parse();
        await treeParseResult;
        assert.ok(tree);
        return model;
    }
    function verifyTokens(tokens) {
        assert.ok(tokens);
        for (let i = 1; i < tokens.length; i++) {
            const previousToken = tokens[i - 1];
            const token = tokens[i];
            assert.deepStrictEqual(previousToken.startOffsetInclusive + previousToken.length, token.startOffsetInclusive);
        }
    }
    test('Three changes come back to back ', async () => {
        const content = `/**
**/
class x {
}




class y {
}`;
        const model = await getModelAndPrepTree(content);
        let updateListener;
        let change;
        const updatePromise = new Promise(resolve => {
            updateListener = treeSitterParserService.onDidUpdateTree(async (e) => {
                if (e.textModel === model) {
                    change = e;
                    resolve();
                }
            });
        });
        const edit1 = new Promise(resolve => {
            model.applyEdits([{ range: new Range(7, 1, 8, 1), text: '' }]);
            resolve();
        });
        const edit2 = new Promise(resolve => {
            model.applyEdits([{ range: new Range(6, 1, 7, 1), text: '' }]);
            resolve();
        });
        const edit3 = new Promise(resolve => {
            model.applyEdits([{ range: new Range(5, 1, 6, 1), text: '' }]);
            resolve();
        });
        const edits = Promise.all([edit1, edit2, edit3]);
        await updatePromise;
        await edits;
        assert.ok(change);
        assert.strictEqual(change.versionId, 4);
        assert.strictEqual(change.ranges[0].newRangeStartOffset, 0);
        assert.strictEqual(change.ranges[0].newRangeEndOffset, 32);
        assert.strictEqual(change.ranges[0].newRange.startLineNumber, 1);
        assert.strictEqual(change.ranges[0].newRange.endLineNumber, 7);
        updateListener?.dispose();
        modelService.destroyModel(model.uri);
    });
    test('File single line file', async () => {
        const content = `console.log('x');`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 1, 18), 0, 17);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 9);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with new lines at beginning and end', async () => {
        const content = `
console.log('x');
`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 3, 1), 0, 19);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 11);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with new lines at beginning and end \\r\\n', async () => {
        const content = '\r\nconsole.log(\'x\');\r\n';
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 3, 1), 0, 21);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 11);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with empty lines in the middle', async () => {
        const content = `
console.log('x');

console.log('7');
`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 5, 1), 0, 38);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 21);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with empty lines in the middle \\r\\n', async () => {
        const content = '\r\nconsole.log(\'x\');\r\n\r\nconsole.log(\'7\');\r\n';
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 5, 1), 0, 42);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 21);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with non-empty lines that match no scopes', async () => {
        const content = `console.log('x');
;
{
}
`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 5, 1), 0, 24);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 16);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with non-empty lines that match no scopes \\r\\n', async () => {
        const content = 'console.log(\'x\');\r\n;\r\n{\r\n}\r\n';
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 5, 1), 0, 28);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 16);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with tree-sitter token that spans multiple lines', async () => {
        const content = `/**
**/

console.log('x');

`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 6, 1), 0, 28);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 12);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with tree-sitter token that spans multiple lines \\r\\n', async () => {
        const content = '/**\r\n**/\r\n\r\nconsole.log(\'x\');\r\n\r\n';
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 6, 1), 0, 33);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 12);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with tabs', async () => {
        const content = `function x() {
	return true;
}

class Y {
	private z = false;
}`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 7, 1), 0, 63);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 30);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with tabs \\r\\n', async () => {
        const content = 'function x() {\r\n\treturn true;\r\n}\r\n\r\nclass Y {\r\n\tprivate z = false;\r\n}';
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 7, 1), 0, 69);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 30);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('Template string', async () => {
        const content = '`t ${6}`';
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 1, 8), 0, 8);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 6);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('Many nested scopes', async () => {
        const content = `y = new x(ttt({
	message: '{0} i\\n\\n [commandName]({1}).',
	args: ['Test', \`command:\${openSettingsCommand}?\${encodeURIComponent('["SettingName"]')}\`],
	// To make sure the translators don't break the link
	comment: ["{Locked=']({'}"]
}));`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 6, 5), 0, 238);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 65);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2VsZWN0cm9uLW1haW4vdHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDbkgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0YsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sdUVBQXVFLENBQUM7QUFDbkgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEYsT0FBTyxFQUFrQixpQkFBaUIsRUFBa0IsTUFBTSxpREFBaUQsQ0FBQztBQUVwSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNuSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDL0UsMkVBQTJFO0FBQzNFLE9BQU8s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