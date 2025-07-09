/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TerminalInstanceService } from '../../browser/terminalInstanceService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('Workbench - TerminalInstanceService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let terminalInstanceService;
    setup(async () => {
        const instantiationService = workbenchInstantiationService(undefined, store);
        terminalInstanceService = store.add(instantiationService.createInstance(TerminalInstanceService));
    });
    suite('convertProfileToShellLaunchConfig', () => {
        test('should return an empty shell launch config when undefined is provided', () => {
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig(), {});
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig(undefined), {});
        });
        test('should return the same shell launch config when provided', () => {
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({}), {});
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({ executable: '/foo' }), { executable: '/foo' });
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({ executable: '/foo', cwd: '/bar', args: ['a', 'b'] }), { executable: '/foo', cwd: '/bar', args: ['a', 'b'] });
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({ executable: '/foo' }, '/bar'), { executable: '/foo', cwd: '/bar' });
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({ executable: '/foo', cwd: '/bar' }, '/baz'), { executable: '/foo', cwd: '/baz' });
        });
        test('should convert a provided profile to a shell launch config', () => {
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({
                profileName: 'abc',
                path: '/foo',
                isDefault: true
            }), {
                args: undefined,
                color: undefined,
                cwd: undefined,
                env: undefined,
                executable: '/foo',
                icon: undefined,
                name: undefined
            });
            const icon = URI.file('/icon');
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({
                profileName: 'abc',
                path: '/foo',
                isDefault: true,
                args: ['a', 'b'],
                color: 'color',
                env: { test: 'TEST' },
                icon
            }, '/bar'), {
                args: ['a', 'b'],
                color: 'color',
                cwd: '/bar',
                env: { test: 'TEST' },
                executable: '/foo',
                icon,
                name: undefined
            });
        });
        test('should respect overrideName in profile', () => {
            deepStrictEqual(terminalInstanceService.convertProfileToShellLaunchConfig({
                profileName: 'abc',
                path: '/foo',
                isDefault: true,
                overrideName: true
            }), {
                args: undefined,
                color: undefined,
                cwd: undefined,
                env: undefined,
                executable: '/foo',
                icon: undefined,
                name: 'abc'
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbnN0YW5jZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIvdGVybWluYWxJbnN0YW5jZVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUduRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVsRyxLQUFLLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO0lBQ2pELE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSx1QkFBaUQsQ0FBQztJQUV0RCxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsTUFBTSxvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0UsdUJBQXVCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO0lBQ25HLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxJQUFJLENBQUMsdUVBQXVFLEVBQUUsR0FBRyxFQUFFO1lBQ2xGLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxpQ0FBaUMsRUFBRSxFQUFFLEVBQUUsQ0FB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