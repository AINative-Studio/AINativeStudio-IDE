/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { AiRelatedInformationService } from '../../common/aiRelatedInformationService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { RelatedInformationType } from '../../common/aiRelatedInformation.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('AiRelatedInformationService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let service;
    setup(() => {
        service = new AiRelatedInformationService(store.add(new NullLogService()));
    });
    test('should check if providers are registered', () => {
        assert.equal(service.isEnabled(), false);
        store.add(service.registerAiRelatedInformationProvider(RelatedInformationType.CommandInformation, { provideAiRelatedInformation: () => Promise.resolve([]) }));
        assert.equal(service.isEnabled(), true);
    });
    test('should register and unregister providers', () => {
        const provider = { provideAiRelatedInformation: () => Promise.resolve([]) };
        const disposable = service.registerAiRelatedInformationProvider(RelatedInformationType.CommandInformation, provider);
        assert.strictEqual(service.isEnabled(), true);
        disposable.dispose();
        assert.strictEqual(service.isEnabled(), false);
    });
    test('should get related information', async () => {
        const command = 'command';
        const provider = {
            provideAiRelatedInformation: () => Promise.resolve([{ type: RelatedInformationType.CommandInformation, command, weight: 1 }])
        };
        service.registerAiRelatedInformationProvider(RelatedInformationType.CommandInformation, provider);
        const result = await service.getRelatedInformation('query', [RelatedInformationType.CommandInformation], CancellationToken.None);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].command, command);
    });
    test('should get different types of related information', async () => {
        const command = 'command';
        const commandProvider = {
            provideAiRelatedInformation: () => Promise.resolve([{ type: RelatedInformationType.CommandInformation, command, weight: 1 }])
        };
        service.registerAiRelatedInformationProvider(RelatedInformationType.CommandInformation, commandProvider);
        const setting = 'setting';
        const settingProvider = {
            provideAiRelatedInformation: () => Promise.resolve([{ type: RelatedInformationType.SettingInformation, setting, weight: 1 }])
        };
        service.registerAiRelatedInformationProvider(RelatedInformationType.SettingInformation, settingProvider);
        const result = await service.getRelatedInformation('query', [
            RelatedInformationType.CommandInformation,
            RelatedInformationType.SettingInformation
        ], CancellationToken.None);
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].command, command);
        assert.strictEqual(result[1].setting, setting);
    });
    test('should return empty array on timeout', async () => {
        const clock = sinon.useFakeTimers({
            shouldAdvanceTime: true,
        });
        const provider = {
            provideAiRelatedInformation: () => new Promise((resolve) => {
                setTimeout(() => {
                    resolve([{ type: RelatedInformationType.CommandInformation, command: 'command', weight: 1 }]);
                }, AiRelatedInformationService.DEFAULT_TIMEOUT + 100);
            })
        };
        service.registerAiRelatedInformationProvider(RelatedInformationType.CommandInformation, provider);
        try {
            const promise = service.getRelatedInformation('query', [RelatedInformationType.CommandInformation], CancellationToken.None);
            clock.tick(AiRelatedInformationService.DEFAULT_TIMEOUT + 200);
            const result = await promise;
            assert.strictEqual(result.length, 0);
        }
        finally {
            clock.restore();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlSZWxhdGVkSW5mb3JtYXRpb25TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2FpUmVsYXRlZEluZm9ybWF0aW9uL3Rlc3QvY29tbW9uL2FpUmVsYXRlZEluZm9ybWF0aW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMxRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUEyRCxzQkFBc0IsRUFBNEIsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqSyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFDeEQsSUFBSSxPQUFvQyxDQUFDO0lBRXpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixPQUFPLEdBQUcsSUFBSSwyQkFBMkIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtRQUNyRCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FB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