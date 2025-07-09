/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestConfigurationService } from '../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IModelService } from '../../../common/services/model.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TextResourceConfigurationService } from '../../../common/services/textResourceConfigurationService.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('TextResourceConfigurationService - Update', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationValue = {};
    let updateArgs;
    const configurationService = new class extends TestConfigurationService {
        inspect() {
            return configurationValue;
        }
        updateValue() {
            updateArgs = [...arguments];
            return Promise.resolve();
        }
    }();
    let language = null;
    let testObject;
    setup(() => {
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(IModelService, { getModel() { return null; } });
        instantiationService.stub(ILanguageService, { guessLanguageIdByFilepathOrFirstLine() { return language; } });
        instantiationService.stub(IConfigurationService, configurationService);
        testObject = disposables.add(instantiationService.createInstance(TextResourceConfigurationService));
    });
    test('updateValue writes without target and overrides when no language is defined', async () => {
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: undefined }, 3 /* ConfigurationTarget.USER_LOCAL */]);
    });
    test('updateValue writes with target and without overrides when no language is defined', async () => {
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b', 3 /* ConfigurationTarget.USER_LOCAL */);
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: undefined }, 3 /* ConfigurationTarget.USER_LOCAL */]);
    });
    test('updateValue writes into given memory target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspaceFolder: { value: '1' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b', 8 /* ConfigurationTarget.MEMORY */);
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: undefined }, 8 /* ConfigurationTarget.MEMORY */]);
    });
    test('updateValue writes into given workspace target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspaceFolder: { value: '2' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b', 5 /* ConfigurationTarget.WORKSPACE */);
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: undefined }, 5 /* ConfigurationTarget.WORKSPACE */]);
    });
    test('updateValue writes into given user target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspaceFolder: { value: '2' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b', 2 /* ConfigurationTarget.USER */);
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: undefined }, 2 /* ConfigurationTarget.USER */]);
    });
    test('updateValue writes into given workspace folder target with overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspaceFolder: { value: '2', override: '1' },
            overrideIdentifiers: [language]
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b', 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: language }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */]);
    });
    test('updateValue writes into derived workspace folder target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspaceFolder: { value: '2' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: undefined }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */]);
    });
    test('updateValue writes into derived workspace folder target with overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspace: { value: '2', override: '1' },
            workspaceFolder: { value: '2', override: '2' },
            overrideIdentifiers: [language]
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: language }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */]);
    });
    test('updateValue writes into derived workspace target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspace: { value: '2' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: undefined }, 5 /* ConfigurationTarget.WORKSPACE */]);
    });
    test('updateValue writes into derived workspace target with overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspace: { value: '2', override: '2' },
            overrideIdentifiers: [language]
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: language }, 5 /* ConfigurationTarget.WORKSPACE */]);
    });
    test('updateValue writes into derived workspace target with overrides and value defined in folder', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1', override: '3' },
            userLocal: { value: '2' },
            workspace: { value: '2', override: '2' },
            workspaceFolder: { value: '2' },
            overrideIdentifiers: [language]
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: language }, 5 /* ConfigurationTarget.WORKSPACE */]);
    });
    test('updateValue writes into derived user remote target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            userRemote: { value: '2' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: undefined }, 4 /* ConfigurationTarget.USER_REMOTE */]);
    });
    test('updateValue writes into derived user remote target with overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            userRemote: { value: '2', override: '3' },
            overrideIdentifiers: [language]
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: language }, 4 /* ConfigurationTarget.USER_REMOTE */]);
    });
    test('updateValue writes into derived user remote target with overrides and value defined in workspace', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            userRemote: { value: '2', override: '3' },
            workspace: { value: '3' },
            overrideIdentifiers: [language]
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: language }, 4 /* ConfigurationTarget.USER_REMOTE */]);
    });
    test('updateValue writes into derived user remote target with overrides and value defined in workspace folder', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2', override: '1' },
            userRemote: { value: '2', override: '3' },
            workspace: { value: '3' },
            workspaceFolder: { value: '3' },
            overrideIdentifiers: [language]
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: language }, 4 /* ConfigurationTarget.USER_REMOTE */]);
    });
    test('updateValue writes into derived user target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: undefined }, 3 /* ConfigurationTarget.USER_LOCAL */]);
    });
    test('updateValue writes into derived user target with overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2', override: '3' },
            overrideIdentifiers: [language]
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', '2');
        assert.deepStrictEqual(updateArgs, ['a', '2', { resource, overrideIdentifier: language }, 3 /* ConfigurationTarget.USER_LOCAL */]);
    });
    test('updateValue writes into derived user target with overrides and value is defined in remote', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2', override: '3' },
            userRemote: { value: '3' },
            overrideIdentifiers: [language]
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', '2');
        assert.deepStrictEqual(updateArgs, ['a', '2', { resource, overrideIdentifier: language }, 3 /* ConfigurationTarget.USER_LOCAL */]);
    });
    test('updateValue writes into derived user target with overrides and value is defined in workspace', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2', override: '3' },
            workspaceValue: { value: '3' },
            overrideIdentifiers: [language]
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', '2');
        assert.deepStrictEqual(updateArgs, ['a', '2', { resource, overrideIdentifier: language }, 3 /* ConfigurationTarget.USER_LOCAL */]);
    });
    test('updateValue writes into derived user target with overrides and value is defined in workspace folder', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1', override: '3' },
            userLocal: { value: '2', override: '3' },
            userRemote: { value: '3' },
            workspaceFolderValue: { value: '3' },
            overrideIdentifiers: [language]
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', '2');
        assert.deepStrictEqual(updateArgs, ['a', '2', { resource, overrideIdentifier: language }, 3 /* ConfigurationTarget.USER_LOCAL */]);
    });
    test('updateValue writes into derived user target when overridden in default and not in user', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1', override: '3' },
            userLocal: { value: '2' },
            overrideIdentifiers: [language]
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', '2');
        assert.deepStrictEqual(updateArgs, ['a', '2', { resource, overrideIdentifier: language }, 3 /* ConfigurationTarget.USER_LOCAL */]);
    });
    test('updateValue when not changed', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, ['a', 'b', { resource, overrideIdentifier: undefined }, 3 /* ConfigurationTarget.USER_LOCAL */]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlQ29uZmlndXJhdGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vc2VydmljZXMvdGV4dFJlc291cmNlQ29uZmlndXJhdGlvblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNEVBQTRFLENBQUM7QUFDdEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNEVBQTRFLENBQUM7QUFDdEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3pFLE9BQU8sRUFBdUIscUJBQXFCLEVBQXVCLE1BQU0sNERBQTRELENBQUM7QUFDN0ksT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDaEgsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBR2hHLEtBQUssQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7SUFFdkQsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUU5RCxJQUFJLG9CQUE4QyxDQUFDO0lBQ25ELElBQUksa0JBQWtCLEdBQTZCLEVBQUUsQ0FBQztJQUN0RCxJQUFJLFVBQWlCLENBQUM7SUFDdEIsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLEtBQU0sU0FBUSx3QkFBd0I7UUFDN0QsT0FBTztZQUNmLE9BQU8sa0JBQWtCLENBQUM7UUFDM0IsQ0FBQztR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