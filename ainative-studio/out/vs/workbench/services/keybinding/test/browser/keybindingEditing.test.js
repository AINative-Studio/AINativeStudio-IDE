/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as json from '../../../../../base/common/json.js';
import { KeyCodeChord } from '../../../../../base/common/keybindings.js';
import { OS } from '../../../../../base/common/platform.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ResolvedKeybindingItem } from '../../../../../platform/keybinding/common/resolvedKeybindingItem.js';
import { USLayoutResolvedKeybinding } from '../../../../../platform/keybinding/common/usLayoutResolvedKeybinding.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { KeybindingsEditingService } from '../../common/keybindingEditing.js';
import { ITextFileService } from '../../../textfile/common/textfiles.js';
import { TestEnvironmentService, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { FileUserDataProvider } from '../../../../../platform/userData/common/fileUserDataProvider.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { UserDataProfilesService } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { UserDataProfileService } from '../../../userDataProfile/common/userDataProfileService.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
suite('KeybindingsEditing', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let fileService;
    let environmentService;
    let userDataProfileService;
    let testObject;
    setup(async () => {
        environmentService = TestEnvironmentService;
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const userFolder = joinPath(ROOT, 'User');
        await fileService.createFolder(userFolder);
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('files', { 'eol': '\n' });
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        userDataProfileService = disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        instantiationService = workbenchInstantiationService({
            fileService: () => fileService,
            configurationService: () => configService,
            environmentService: () => environmentService
        }, disposables);
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditingService));
    });
    test('errors cases - parse errors', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.keybindingsResource, VSBuffer.fromString(',,,,,,,,,,,,,,'));
        try {
            await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ } }), 'alt+c', undefined);
            assert.fail('Should fail with parse errors');
        }
        catch (error) {
            assert.strictEqual(error.message, 'Unable to write to the keybindings configuration file. Please open it to correct errors/warnings in the file and try again.');
        }
    });
    test('errors cases - parse errors 2', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.keybindingsResource, VSBuffer.fromString('[{"key": }]'));
        try {
            await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ } }), 'alt+c', undefined);
            assert.fail('Should fail with parse errors');
        }
        catch (error) {
            assert.strictEqual(error.message, 'Unable to write to the keybindings configuration file. Please open it to correct errors/warnings in the file and try again.');
        }
    });
    test('errors cases - dirty', () => {
        instantiationService.stub(ITextFileService, 'isDirty', true);
        return testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ } }), 'alt+c', undefined)
            .then(() => assert.fail('Should fail with dirty error'), error => assert.strictEqual(error.message, 'Unable to write because the keybindings configuration file has unsaved changes. Please save it first and then try again.'));
    });
    test('errors cases - did not find an array', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.keybindingsResource, VSBuffer.fromString('{"key": "alt+c", "command": "hello"}'));
        try {
            await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ } }), 'alt+c', undefined);
            assert.fail('Should fail');
        }
        catch (error) {
            assert.strictEqual(error.message, 'Unable to write to the keybindings configuration file. It has an object which is not of type Array. Please open the file to clean up and try again.');
        }
    });
    test('edit a default keybinding to an empty file', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.keybindingsResource, VSBuffer.fromString(''));
        const expected = [{ key: 'alt+c', command: 'a' }, { key: 'escape', command: '-a' }];
        await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ }, command: 'a' }), 'alt+c', undefined);
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('edit a default keybinding to an empty array', async () => {
        await writeToKeybindingsFile();
        const expected = [{ key: 'alt+c', command: 'a' }, { key: 'escape', command: '-a' }];
        await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ }, command: 'a' }), 'alt+c', undefined);
        return assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('edit a default keybinding in an existing array', async () => {
        await writeToKeybindingsFile({ command: 'b', key: 'shift+c' });
        const expected = [{ key: 'shift+c', command: 'b' }, { key: 'alt+c', command: 'a' }, { key: 'escape', command: '-a' }];
        await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ }, command: 'a' }), 'alt+c', undefined);
        return assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('add another keybinding', async () => {
        const expected = [{ key: 'alt+c', command: 'a' }];
        await testObject.addKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ }, command: 'a' }), 'alt+c', undefined);
        return assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('add a new default keybinding', async () => {
        const expected = [{ key: 'alt+c', command: 'a' }];
        await testObject.addKeybinding(aResolvedKeybindingItem({ command: 'a' }), 'alt+c', undefined);
        return assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('add a new default keybinding using edit', async () => {
        const expected = [{ key: 'alt+c', command: 'a' }];
        await testObject.editKeybinding(aResolvedKeybindingItem({ command: 'a' }), 'alt+c', undefined);
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('edit an user keybinding', async () => {
        await writeToKeybindingsFile({ key: 'escape', command: 'b' });
        const expected = [{ key: 'alt+c', command: 'b' }];
        await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ }, command: 'b', isDefault: false }), 'alt+c', undefined);
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('edit an user keybinding with more than one element', async () => {
        await writeToKeybindingsFile({ key: 'escape', command: 'b' }, { key: 'alt+shift+g', command: 'c' });
        const expected = [{ key: 'alt+c', command: 'b' }, { key: 'alt+shift+g', command: 'c' }];
        await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ }, command: 'b', isDefault: false }), 'alt+c', undefined);
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('remove a default keybinding', async () => {
        const expected = [{ key: 'alt+c', command: '-a' }];
        await testObject.removeKeybinding(aResolvedKeybindingItem({ command: 'a', firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } } }));
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('remove a default keybinding should not ad duplicate entries', async () => {
        const expected = [{ key: 'alt+c', command: '-a' }];
        await testObject.removeKeybinding(aResolvedKeybindingItem({ command: 'a', firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } } }));
        await testObject.removeKeybinding(aResolvedKeybindingItem({ command: 'a', firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } } }));
        await testObject.removeKeybinding(aResolvedKeybindingItem({ command: 'a', firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } } }));
        await testObject.removeKeybinding(aResolvedKeybindingItem({ command: 'a', firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } } }));
        await testObject.removeKeybinding(aResolvedKeybindingItem({ command: 'a', firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } } }));
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('remove a user keybinding', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: 'b' });
        await testObject.removeKeybinding(aResolvedKeybindingItem({ command: 'b', firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } }, isDefault: false }));
        assert.deepStrictEqual(await getUserKeybindings(), []);
    });
    test('reset an edited keybinding', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: 'b' });
        await testObject.resetKeybinding(aResolvedKeybindingItem({ command: 'b', firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } }, isDefault: false }));
        assert.deepStrictEqual(await getUserKeybindings(), []);
    });
    test('reset a removed keybinding', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: '-b' });
        await testObject.resetKeybinding(aResolvedKeybindingItem({ command: 'b', isDefault: false }));
        assert.deepStrictEqual(await getUserKeybindings(), []);
    });
    test('reset multiple removed keybindings', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: '-b' });
        await writeToKeybindingsFile({ key: 'alt+shift+c', command: '-b' });
        await writeToKeybindingsFile({ key: 'escape', command: '-b' });
        await testObject.resetKeybinding(aResolvedKeybindingItem({ command: 'b', isDefault: false }));
        assert.deepStrictEqual(await getUserKeybindings(), []);
    });
    test('add a new keybinding to unassigned keybinding', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: '-a' });
        const expected = [{ key: 'alt+c', command: '-a' }, { key: 'shift+alt+c', command: 'a' }];
        await testObject.editKeybinding(aResolvedKeybindingItem({ command: 'a', isDefault: false }), 'shift+alt+c', undefined);
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('add when expression', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: '-a' });
        const expected = [{ key: 'alt+c', command: '-a' }, { key: 'shift+alt+c', command: 'a', when: 'editorTextFocus' }];
        await testObject.editKeybinding(aResolvedKeybindingItem({ command: 'a', isDefault: false }), 'shift+alt+c', 'editorTextFocus');
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('update command and when expression', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' });
        const expected = [{ key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' }, { key: 'shift+alt+c', command: 'a', when: 'editorTextFocus' }];
        await testObject.editKeybinding(aResolvedKeybindingItem({ command: 'a', isDefault: false }), 'shift+alt+c', 'editorTextFocus');
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('update when expression', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' }, { key: 'shift+alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' });
        const expected = [{ key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' }, { key: 'shift+alt+c', command: 'a', when: 'editorTextFocus' }];
        await testObject.editKeybinding(aResolvedKeybindingItem({ command: 'a', isDefault: false, when: 'editorTextFocus && !editorReadonly' }), 'shift+alt+c', 'editorTextFocus');
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('remove when expression', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' });
        const expected = [{ key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' }, { key: 'shift+alt+c', command: 'a' }];
        await testObject.editKeybinding(aResolvedKeybindingItem({ command: 'a', isDefault: false }), 'shift+alt+c', undefined);
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    async function writeToKeybindingsFile(...keybindings) {
        await fileService.writeFile(userDataProfileService.currentProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify(keybindings || [])));
    }
    async function getUserKeybindings() {
        return json.parse((await fileService.readFile(userDataProfileService.currentProfile.keybindingsResource)).value.toString());
    }
    function aResolvedKeybindingItem({ command, when, isDefault, firstChord, secondChord }) {
        const aSimpleKeybinding = function (chord) {
            const { ctrlKey, shiftKey, altKey, metaKey } = chord.modifiers || { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false };
            return new KeyCodeChord(ctrlKey, shiftKey, altKey, metaKey, chord.keyCode);
        };
        const chords = [];
        if (firstChord) {
            chords.push(aSimpleKeybinding(firstChord));
            if (secondChord) {
                chords.push(aSimpleKeybinding(secondChord));
            }
        }
        const keybinding = chords.length > 0 ? new USLayoutResolvedKeybinding(chords, OS) : undefined;
        return new ResolvedKeybindingItem(keybinding, command || 'some command', null, when ? ContextKeyExpr.deserialize(when) : undefined, isDefault === undefined ? true : isDefault, null, false);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0VkaXRpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMva2V5YmluZGluZy90ZXN0L2Jyb3dzZXIva2V5YmluZGluZ0VkaXRpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQztBQUUzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDekUsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUt6RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM3RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNySCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDMUgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUVBQWlFLENB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