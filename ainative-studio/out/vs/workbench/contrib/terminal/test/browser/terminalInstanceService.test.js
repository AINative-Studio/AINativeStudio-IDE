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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbnN0YW5jZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3Rlcm1pbmFsSW5zdGFuY2VTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHbkcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFbEcsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtJQUNqRCxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksdUJBQWlELENBQUM7SUFFdEQsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLE1BQU0sb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdFLHVCQUF1QixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQztJQUNuRyxDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDL0MsSUFBSSxDQUFDLHVFQUF1RSxFQUFFLEdBQUcsRUFBRTtZQUNsRixlQUFlLENBQUMsdUJBQXVCLENBQUMsaUNBQWlDLEVBQUUsRUFBRSxFQUFF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