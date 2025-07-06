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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbmZpZ3VyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZENvbmZpZ3VyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUE4QyxNQUFNLG9FQUFvRSxDQUFDO0FBQzVJLE9BQU8sRUFBRSx3QkFBd0IsRUFBa0IsTUFBTSxvREFBb0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUN0SCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQXVCLE1BQU0sNERBQTRELENBQUM7QUFDeEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsS0FBSyxDQUFDLHlCQUF5QixFQUFFO0lBRWhDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxLQUFLLEdBQUc7UUFDYix3QkFBd0IsRUFBRSxH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