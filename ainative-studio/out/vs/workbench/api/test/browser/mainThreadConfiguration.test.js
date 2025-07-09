/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { URI } from '../../../../base/common/uri.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MainThreadConfiguration } from '../../browser/mainThreadConfiguration.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { WorkspaceService } from '../../../services/configuration/browser/configurationService.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('MainThreadConfiguration', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    const proxy = {
        $initializeConfiguration: () => { }
    };
    let instantiationService;
    let target;
    suiteSetup(() => {
        Registry.as(Extensions.Configuration).registerConfiguration({
            'id': 'extHostConfiguration',
            'title': 'a',
            'type': 'object',
            'properties': {
                'extHostConfiguration.resource': {
                    'description': 'extHostConfiguration.resource',
                    'type': 'boolean',
                    'default': true,
                    'scope': 5 /* ConfigurationScope.RESOURCE */
                },
                'extHostConfiguration.window': {
                    'description': 'extHostConfiguration.resource',
                    'type': 'boolean',
                    'default': true,
                    'scope': 4 /* ConfigurationScope.WINDOW */
                }
            }
        });
    });
    setup(() => {
        target = sinon.spy();
        instantiationService = new TestInstantiationService();
        instantiationService.stub(IConfigurationService, WorkspaceService);
        instantiationService.stub(IConfigurationService, 'onDidUpdateConfiguration', sinon.mock());
        instantiationService.stub(IConfigurationService, 'onDidChangeConfiguration', sinon.mock());
        instantiationService.stub(IConfigurationService, 'updateValue', target);
        instantiationService.stub(IEnvironmentService, {
            isBuilt: false
        });
    });
    teardown(() => {
        instantiationService.dispose();
    });
    test('update resource configuration without configuration target defaults to workspace in multi root workspace when no resource is provided', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.resource', 'value', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update resource configuration without configuration target defaults to workspace in folder workspace when resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.resource', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update resource configuration without configuration target defaults to workspace in folder workspace when no resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.resource', 'value', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update window configuration without configuration target defaults to workspace in multi root workspace when no resource is provided', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.window', 'value', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update window configuration without configuration target defaults to workspace in multi root workspace when resource is provided', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.window', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update window configuration without configuration target defaults to workspace in folder workspace when resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.window', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update window configuration without configuration target defaults to workspace in folder workspace when no resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.window', 'value', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update resource configuration without configuration target defaults to folder', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.resource', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, target.args[0][3]);
    });
    test('update configuration with user configuration target', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(2 /* ConfigurationTarget.USER */, 'extHostConfiguration.window', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(2 /* ConfigurationTarget.USER */, target.args[0][3]);
    });
    test('update configuration with workspace configuration target', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(5 /* ConfigurationTarget.WORKSPACE */, 'extHostConfiguration.window', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update configuration with folder configuration target', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, 'extHostConfiguration.window', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, target.args[0][3]);
    });
    test('remove resource configuration without configuration target defaults to workspace in multi root workspace when no resource is provided', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.resource', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove resource configuration without configuration target defaults to workspace in folder workspace when resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.resource', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove resource configuration without configuration target defaults to workspace in folder workspace when no resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.resource', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove window configuration without configuration target defaults to workspace in multi root workspace when no resource is provided', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.window', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove window configuration without configuration target defaults to workspace in multi root workspace when resource is provided', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.window', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove window configuration without configuration target defaults to workspace in folder workspace when resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.window', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove window configuration without configuration target defaults to workspace in folder workspace when no resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.window', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove configuration without configuration target defaults to folder', function () {
        instantiationService.stub(IWorkspaceContextService, { getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */ });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.resource', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, target.args[0][3]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbmZpZ3VyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9tYWluVGhyZWFkQ29uZmlndXJhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLEVBQThDLE1BQU0sb0VBQW9FLENBQUM7QUFDNUksT0FBTyxFQUFFLHdCQUF3QixFQUFrQixNQUFNLG9EQUFvRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQ3RILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBdUIsTUFBTSw0REFBNEQsQ0FBQztBQUN4SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxLQUFLLENBQUMseUJBQXlCLEVBQUU7SUFFaEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxNQUFNLEtBQUssR0FBRztRQUNiLHdCQUF3QixFQUFFLEdBQUcs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