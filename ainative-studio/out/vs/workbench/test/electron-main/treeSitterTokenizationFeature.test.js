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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9lbGVjdHJvbi1tYWluL3RyZWVTaXR0ZXJUb2tlbml6YXRpb25GZWF0dXJlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ25ILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQ25ILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xGLE9BQU8sRUFBa0IsaUJBQWlCLEVBQWtCLE1BQU0saURBQWlELENBQUM7QUFFcEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDbkgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQy9FLDJFQUEyRTtBQUMzRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUNuSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQW1CLE1BQU0sNERBQTRELENBQUM7QUFDaEssT0FBTyxFQUFrQyw4QkFBOEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMzRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDOUcsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sdUVBQXVFLENBQUM7QUFDekgsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDbEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQy9GLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQ2hILE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQWMsVUFBVSxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdkcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUc3RCwyRUFBMkU7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDM0YsMkVBQTJFO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRzNGLE1BQU0sb0JBQW9CO0lBQTFCO1FBRUMsbUJBQWMsK0JBQXVDO1FBQ3JELGNBQVMsR0FBVyxFQUFFLENBQUM7UUFDdkIsY0FBUyxHQUFXLEVBQUUsQ0FBQztRQUN2QixVQUFLLEdBQVcsRUFBRSxDQUFDO1FBQ25CLGdCQUFXLEdBQVcsRUFBRSxDQUFDO1FBQ3pCLHFCQUFnQixHQUFXLEVBQUUsQ0FBQztRQUM5Qix1QkFBa0IsR0FBWSxLQUFLLENBQUM7SUFXckMsQ0FBQztJQVZBLFNBQVMsQ0FBQyxTQUFpQixFQUFFLElBQXFCO0lBQ2xELENBQUM7SUFDRCxVQUFVLENBQXNGLFNBQWlCLEVBQUUsSUFBZ0M7SUFDbkosQ0FBQztJQUNELGNBQWMsQ0FBQyxjQUFzQixFQUFFLElBQXFCO0lBQzVELENBQUM7SUFDRCxlQUFlLENBQXNGLFNBQWlCLEVBQUUsSUFBZ0M7SUFDeEosQ0FBQztJQUNELHFCQUFxQixDQUFDLElBQVksRUFBRSxLQUFhO0lBQ2pELENBQUM7Q0FDRDtBQUVELE1BQU0scUJBQXFCO0lBQzFCLE1BQU0sQ0FBQyxLQUFpQjtRQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELG9CQUFvQixDQUFDLEtBQWlCLEVBQUUsQ0FBNEI7SUFDcEUsQ0FBQztJQUNELGNBQWMsQ0FBQyxLQUFpQixFQUFFLEtBQVksRUFBRSxtQkFBaUM7UUFDaEYsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsZ0JBQWdCLENBQUMsS0FBaUI7UUFDakMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsZUFBZSxDQUFDLEtBQWlCO1FBQ2hDLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUdELFNBQVMsQ0FBQyxLQUFpQixFQUFFLE1BQXFCO0lBQ2xELENBQUM7SUFDRCxTQUFTLENBQUMsS0FBaUIsRUFBRSxJQUFZO1FBQ3hDLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFDRCxZQUFZLENBQUMsS0FBaUIsRUFBRSxPQUFlLEVBQUUsT0FBK0Q7SUFDaEgsQ0FBQztJQUNELGNBQWMsQ0FBQyxLQUFpQixFQUFFLEtBQVk7SUFDOUMsQ0FBQztJQUNELFNBQVMsQ0FBQyxLQUFpQixFQUFFLGdCQUF3QjtRQUNwRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FFRDtBQUVELE1BQU0sd0JBQXlCLFNBQVEsY0FBYztJQUM3QyxhQUFhLENBQUMsTUFBb0IsRUFBRSxXQUE0QztRQUN0RixPQUFPLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDOUUsQ0FBQztJQUNNLGtCQUFrQjtRQUN4QixPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO0lBQzFCLENBQUM7Q0FDRDtBQUVELEtBQUssQ0FBQyxpQ0FBaUMsRUFBRTtJQUV4QyxJQUFJLG9CQUE4QyxDQUFDO0lBQ25ELElBQUksWUFBMkIsQ0FBQztJQUNoQyxJQUFJLFdBQXlCLENBQUM7SUFDOUIsSUFBSSw2QkFBNkQsQ0FBQztJQUNsRSxJQUFJLDRCQUEyRCxDQUFDO0lBQ2hFLElBQUksZ0JBQW1DLENBQUM7SUFDeEMsSUFBSSxVQUF1QixDQUFDO0lBQzVCLElBQUksb0JBQTJDLENBQUM7SUFDaEQsSUFBSSxZQUEyQixDQUFDO0lBQ2hDLElBQUksZUFBaUMsQ0FBQztJQUN0QyxJQUFJLGtCQUF1QyxDQUFDO0lBQzVDLElBQUksaUJBQXNELENBQUM7SUFDM0QsSUFBSSx1QkFBbUQsQ0FBQztJQUN4RCxJQUFJLDZCQUE2RCxDQUFDO0lBRWxFLElBQUksV0FBNEIsQ0FBQztJQUVqQyxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDcEMsb0JBQW9CLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixFQUFFLENBQUMsQ0FBQztRQUV2RSxnQkFBZ0IsR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUM7UUFDOUMsVUFBVSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7UUFDbEMsb0JBQW9CLEdBQUcsSUFBSSx3QkFBd0IsQ0FBQyxFQUFFLGlEQUFpRCxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDakgsWUFBWSxHQUFHLElBQUksZ0JBQWdCLENBQUMsSUFBSSx3QkFBd0IsRUFBRSxDQUFDLENBQUM7UUFDcEUsa0JBQWtCLEdBQUcsRUFBeUIsQ0FBQztRQUMvQyxpQkFBaUIsR0FBRyxJQUFJLHFCQUFxQixFQUFFLENBQUM7UUFFaEQsb0JBQW9CLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDbEUsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDdEUsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNsRCxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUM5RCxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsbUNBQW1DLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNqRixlQUFlLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUN4RixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDNUQsb0JBQW9CLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN0RCw2QkFBNkIsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUN2RyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsOEJBQThCLEVBQUUsNkJBQTZCLENBQUMsQ0FBQztRQUN4Riw0QkFBNEIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUM7UUFDdEgsb0JBQW9CLENBQUMsR0FBRyxDQUFDLDZCQUE2QixFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDdEYsb0JBQW9CLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7UUFDdkcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFFekcsV0FBVyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDaEYsTUFBTSxzQkFBc0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUN2RixXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDLENBQUMsQ0FBQztRQUVwRixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRXBELE1BQU0sYUFBYSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztRQUM5QyxNQUFNLG1CQUFtQixHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUMxRCxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsQ0FBQyxhQUFhLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUNoRixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDNUQsWUFBWSxHQUFHLElBQUksWUFBWSxDQUM5QixvQkFBb0IsRUFDcEIsNkJBQTZCLEVBQzdCLGVBQWUsRUFDZixvQkFBb0IsQ0FDcEIsQ0FBQztRQUNGLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdEQsdUJBQXVCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDO1FBQzNHLHVCQUF1QixDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDdEMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFDNUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLDZCQUE2QixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSw4QkFBOEIsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFtRCxDQUFDLENBQUM7SUFDbkssQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxTQUFTLGlCQUFpQixDQUFDLE1BQXFCO1FBQy9DLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQzFGLENBQUM7SUFFRCxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7SUFDbkIsS0FBSyxVQUFVLG1CQUFtQixDQUFDLE9BQWU7UUFDakQsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1SixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sdUJBQXVCLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMxRixNQUFNLGVBQWUsR0FBRyxJQUFJLE9BQU8sQ0FBTyxPQUFPLENBQUMsRUFBRTtZQUNuRCxNQUFNLFVBQVUsR0FBRyx1QkFBdUIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQzlELElBQUksQ0FBQyxDQUFDLFNBQVMsS0FBSyxLQUFLLEVBQUUsQ0FBQztvQkFDM0IsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNyQixPQUFPLEVBQUUsQ0FBQztnQkFDWCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ25CLE1BQU0sZUFBZSxDQUFDO1FBRXRCLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsU0FBUyxZQUFZLENBQUMsTUFBaUM7UUFDdEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sYUFBYSxHQUFnQixNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2pELE1BQU0sS0FBSyxHQUFnQixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUMvRyxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRCxNQUFNLE9BQU8sR0FBRzs7Ozs7Ozs7O0VBU2hCLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWpELElBQUksY0FBdUMsQ0FBQztRQUM1QyxJQUFJLE1BQW1DLENBQUM7UUFFeEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxPQUFPLENBQU8sT0FBTyxDQUFDLEVBQUU7WUFDakQsY0FBYyxHQUFHLHVCQUF1QixDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLEVBQUU7Z0JBQ2xFLElBQUksQ0FBQyxDQUFDLFNBQVMsS0FBSyxLQUFLLEVBQUUsQ0FBQztvQkFDM0IsTUFBTSxHQUFHLENBQUMsQ0FBQztvQkFDWCxPQUFPLEVBQUUsQ0FBQztnQkFDWCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sS0FBSyxHQUFHLElBQUksT0FBTyxDQUFPLE9BQU8sQ0FBQyxFQUFFO1lBQ3pDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9ELE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLEtBQUssR0FBRyxJQUFJLE9BQU8sQ0FBTyxPQUFPLENBQUMsRUFBRTtZQUN6QyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvRCxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxLQUFLLEdBQUcsSUFBSSxPQUFPLENBQU8sT0FBTyxDQUFDLEVBQUU7WUFDekMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDL0QsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDakQsTUFBTSxhQUFhLENBQUM7UUFDcEIsTUFBTSxLQUFLLENBQUM7UUFDWixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRWxCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRS9ELGNBQWMsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUMxQixZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4QyxNQUFNLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQztRQUNwQyxNQUFNLEtBQUssR0FBRyxNQUFNLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRSxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywwQ0FBMEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzRCxNQUFNLE9BQU8sR0FBRzs7Q0FFakIsQ0FBQztRQUNBLE1BQU0sS0FBSyxHQUFHLE1BQU0sbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakQsTUFBTSxNQUFNLEdBQUcsNkJBQTZCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuRyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xFLFlBQVksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2xFLE1BQU0sT0FBTyxHQUFHLDZCQUE2QixDQUFDO1FBQzlDLE1BQU0sS0FBSyxHQUFHLE1BQU0sbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakQsTUFBTSxNQUFNLEdBQUcsNkJBQTZCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuRyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xFLFlBQVksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RELE1BQU0sT0FBTyxHQUFHOzs7O0NBSWpCLENBQUM7UUFDQSxNQUFNLEtBQUssR0FBRyxNQUFNLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRSxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3RCxNQUFNLE9BQU8sR0FBRyx3REFBd0QsQ0FBQztRQUN6RSxNQUFNLEtBQUssR0FBRyxNQUFNLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRSxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnREFBZ0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqRSxNQUFNLE9BQU8sR0FBRzs7OztDQUlqQixDQUFDO1FBQ0EsTUFBTSxLQUFLLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNqRCxNQUFNLE1BQU0sR0FBRyw2QkFBNkIsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25HLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEUsWUFBWSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdURBQXVELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEUsTUFBTSxPQUFPLEdBQUcsd0NBQXdDLENBQUM7UUFDekQsTUFBTSxLQUFLLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNqRCxNQUFNLE1BQU0sR0FBRyw2QkFBNkIsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25HLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEUsWUFBWSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdURBQXVELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEUsTUFBTSxPQUFPLEdBQUc7Ozs7O0NBS2pCLENBQUM7UUFDQSxNQUFNLEtBQUssR0FBRyxNQUFNLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRSxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw4REFBOEQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvRSxNQUFNLE9BQU8sR0FBRywrQ0FBK0MsQ0FBQztRQUNoRSxNQUFNLEtBQUssR0FBRyxNQUFNLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRSxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqQyxNQUFNLE9BQU8sR0FBRzs7Ozs7O0VBTWhCLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRSxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4QyxNQUFNLE9BQU8sR0FBRyxxRkFBcUYsQ0FBQztRQUN0RyxNQUFNLEtBQUssR0FBRyxNQUFNLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRSxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsQyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUM7UUFDM0IsTUFBTSxLQUFLLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNqRCxNQUFNLE1BQU0sR0FBRyw2QkFBNkIsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEUsWUFBWSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDckMsTUFBTSxPQUFPLEdBQUc7Ozs7O0tBS2IsQ0FBQztRQUNKLE1BQU0sS0FBSyxHQUFHLE1BQU0sbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakQsTUFBTSxNQUFNLEdBQUcsNkJBQTZCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNwRyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xFLFlBQVksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDO0FBRUosQ0FBQyxDQUFDLENBQUMifQ==