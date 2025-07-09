/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ExternalUriOpenerPriority } from '../../../../../editor/common/languages.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ExternalUriOpenerService } from '../../common/externalUriOpenerService.js';
class MockQuickInputService {
    constructor(pickIndex) {
        this.pickIndex = pickIndex;
    }
    async pick(picks, options, token) {
        const resolvedPicks = await picks;
        const item = resolvedPicks[this.pickIndex];
        if (item.type === 'separator') {
            return undefined;
        }
        return item;
    }
}
suite('ExternalUriOpenerService', () => {
    let disposables;
    let instantiationService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IOpenerService, {
            registerExternalOpener: () => { return Disposable.None; }
        });
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Should not open if there are no openers', async () => {
        const externalUriOpenerService = disposables.add(instantiationService.createInstance(ExternalUriOpenerService));
        externalUriOpenerService.registerExternalOpenerProvider(new class {
            async *getOpeners(_targetUri) {
                // noop
            }
        });
        const uri = URI.parse('http://contoso.com');
        const didOpen = await externalUriOpenerService.openExternal(uri.toString(), { sourceUri: uri }, CancellationToken.None);
        assert.strictEqual(didOpen, false);
    });
    test('Should prompt if there is at least one enabled opener', async () => {
        instantiationService.stub(IQuickInputService, new MockQuickInputService(0));
        const externalUriOpenerService = disposables.add(instantiationService.createInstance(ExternalUriOpenerService));
        let openedWithEnabled = false;
        externalUriOpenerService.registerExternalOpenerProvider(new class {
            async *getOpeners(_targetUri) {
                yield {
                    id: 'disabled-id',
                    label: 'disabled',
                    canOpen: async () => ExternalUriOpenerPriority.None,
                    openExternalUri: async () => true,
                };
                yield {
                    id: 'enabled-id',
                    label: 'enabled',
                    canOpen: async () => ExternalUriOpenerPriority.Default,
                    openExternalUri: async () => {
                        openedWithEnabled = true;
                        return true;
                    }
                };
            }
        });
        const uri = URI.parse('http://contoso.com');
        const didOpen = await externalUriOpenerService.openExternal(uri.toString(), { sourceUri: uri }, CancellationToken.None);
        assert.strictEqual(didOpen, true);
        assert.strictEqual(openedWithEnabled, true);
    });
    test('Should automatically pick single preferred opener without prompt', async () => {
        const externalUriOpenerService = disposables.add(instantiationService.createInstance(ExternalUriOpenerService));
        let openedWithPreferred = false;
        externalUriOpenerService.registerExternalOpenerProvider(new class {
            async *getOpeners(_targetUri) {
                yield {
                    id: 'other-id',
                    label: 'other',
                    canOpen: async () => ExternalUriOpenerPriority.Default,
                    openExternalUri: async () => {
                        return true;
                    }
                };
                yield {
                    id: 'preferred-id',
                    label: 'preferred',
                    canOpen: async () => ExternalUriOpenerPriority.Preferred,
                    openExternalUri: async () => {
                        openedWithPreferred = true;
                        return true;
                    }
                };
            }
        });
        const uri = URI.parse('http://contoso.com');
        const didOpen = await externalUriOpenerService.openExternal(uri.toString(), { sourceUri: uri }, CancellationToken.None);
        assert.strictEqual(didOpen, true);
        assert.strictEqual(openedWithPreferred, true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxVcmlPcGVuZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZXJuYWxVcmlPcGVuZXIvdGVzdC9jb21tb24vZXh0ZXJuYWxVcmlPcGVuZXJTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNqRixPQUFPLEVBQWdCLGtCQUFrQixFQUFrQyxNQUFNLHlEQUF5RCxDQUFDO0FBQzNJLE9BQU8sRUFBRSx3QkFBd0IsRUFBK0MsTUFBTSwwQ0FBMEMsQ0FBQztBQUdqSSxNQUFNLHFCQUFxQjtJQUUxQixZQUNrQixTQUFpQjtRQUFqQixjQUFTLEdBQVQsU0FBUyxDQUFRO0lBQy9CLENBQUM7SUFJRSxLQUFLLENBQUMsSUFBSSxDQUEy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