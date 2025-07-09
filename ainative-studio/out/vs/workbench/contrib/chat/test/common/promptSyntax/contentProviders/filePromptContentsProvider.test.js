/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../../../base/common/buffer.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { randomInt } from '../../../../../../../base/common/numbers.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { wait } from '../../../../../../../base/test/common/testUtils.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { NullPolicyService } from '../../../../../../../platform/policy/common/policy.js';
import { Line } from '../../../../../../../editor/common/codecs/linesCodec/tokens/line.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { LinesDecoder } from '../../../../../../../editor/common/codecs/linesCodec/linesDecoder.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../../../../../../platform/configuration/common/configurationService.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { FilePromptContentProvider } from '../../../../common/promptSyntax/contentProviders/filePromptContentsProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
suite('FilePromptContentsProvider', function () {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        const nullPolicyService = new NullPolicyService();
        const nullLogService = testDisposables.add(new NullLogService());
        const nullFileService = testDisposables.add(new FileService(nullLogService));
        const nullConfigService = testDisposables.add(new ConfigurationService(URI.file('/config.json'), nullFileService, nullPolicyService, nullLogService));
        instantiationService = testDisposables.add(new TestInstantiationService());
        const fileSystemProvider = testDisposables.add(new InMemoryFileSystemProvider());
        testDisposables.add(nullFileService.registerProvider(Schemas.file, fileSystemProvider));
        instantiationService.stub(IFileService, nullFileService);
        instantiationService.stub(ILogService, nullLogService);
        instantiationService.stub(IConfigurationService, nullConfigService);
    });
    test('provides contents of a file', async function () {
        const fileService = instantiationService.get(IFileService);
        const fileName = `file-${randomInt(10000)}.prompt.md`;
        const fileUri = URI.file(`/${fileName}`);
        if (await fileService.exists(fileUri)) {
            await fileService.del(fileUri);
        }
        await fileService.writeFile(fileUri, VSBuffer.fromString('Hello, world!'));
        await wait(5);
        const contentsProvider = testDisposables.add(instantiationService.createInstance(FilePromptContentProvider, fileUri));
        let streamOrError;
        testDisposables.add(contentsProvider.onContentChanged((event) => {
            streamOrError = event;
        }));
        contentsProvider.start();
        await wait(25);
        assertDefined(streamOrError, 'The `streamOrError` must be defined.');
        assert(!(streamOrError instanceof Error), `Provider must produce a byte stream, got '${streamOrError}'.`);
        const stream = new LinesDecoder(streamOrError);
        const receivedLines = await stream.consumeAll();
        assert.strictEqual(receivedLines.length, 1, 'Must read the correct number of lines from the provider.');
        const expectedLine = new Line(1, 'Hello, world!');
        const receivedLine = receivedLines[0];
        assert(receivedLine.equals(expectedLine), `Expected to receive '${expectedLine}', got '${receivedLine}'.`);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVByb21wdENvbnRlbnRzUHJvdmlkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb250ZW50UHJvdmlkZXJzL2ZpbGVQcm9tcHRDb250ZW50c1Byb3ZpZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDMUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRTFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzNGLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDOUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQ3BHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pH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