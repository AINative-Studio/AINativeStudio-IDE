"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseServiceConfigurationProvider = exports.ImplicitProjectConfiguration = exports.TsServerLogLevel = void 0;
exports.areServiceConfigurationsEqual = areServiceConfigurationsEqual;
const vscode = __importStar(require("vscode"));
const objects = __importStar(require("../utils/objects"));
var TsServerLogLevel;
(function (TsServerLogLevel) {
    TsServerLogLevel[TsServerLogLevel["Off"] = 0] = "Off";
    TsServerLogLevel[TsServerLogLevel["Normal"] = 1] = "Normal";
    TsServerLogLevel[TsServerLogLevel["Terse"] = 2] = "Terse";
    TsServerLogLevel[TsServerLogLevel["Verbose"] = 3] = "Verbose";
})(TsServerLogLevel || (exports.TsServerLogLevel = TsServerLogLevel = {}));
(function (TsServerLogLevel) {
    function fromString(value) {
        switch (value?.toLowerCase()) {
            case 'normal':
                return TsServerLogLevel.Normal;
            case 'terse':
                return TsServerLogLevel.Terse;
            case 'verbose':
                return TsServerLogLevel.Verbose;
            case 'off':
            default:
                return TsServerLogLevel.Off;
        }
    }
    TsServerLogLevel.fromString = fromString;
    function toString(value) {
        switch (value) {
            case TsServerLogLevel.Normal:
                return 'normal';
            case TsServerLogLevel.Terse:
                return 'terse';
            case TsServerLogLevel.Verbose:
                return 'verbose';
            case TsServerLogLevel.Off:
            default:
                return 'off';
        }
    }
    TsServerLogLevel.toString = toString;
})(TsServerLogLevel || (exports.TsServerLogLevel = TsServerLogLevel = {}));
class ImplicitProjectConfiguration {
    constructor(configuration) {
        this.target = ImplicitProjectConfiguration.readTarget(configuration);
        this.module = ImplicitProjectConfiguration.readModule(configuration);
        this.checkJs = ImplicitProjectConfiguration.readCheckJs(configuration);
        this.experimentalDecorators = ImplicitProjectConfiguration.readExperimentalDecorators(configuration);
        this.strictNullChecks = ImplicitProjectConfiguration.readImplicitStrictNullChecks(configuration);
        this.strictFunctionTypes = ImplicitProjectConfiguration.readImplicitStrictFunctionTypes(configuration);
    }
    isEqualTo(other) {
        return objects.equals(this, other);
    }
    static readTarget(configuration) {
        return configuration.get('js/ts.implicitProjectConfig.target');
    }
    static readModule(configuration) {
        return configuration.get('js/ts.implicitProjectConfig.module');
    }
    static readCheckJs(configuration) {
        return configuration.get('js/ts.implicitProjectConfig.checkJs')
            ?? configuration.get('javascript.implicitProjectConfig.checkJs', false);
    }
    static readExperimentalDecorators(configuration) {
        return configuration.get('js/ts.implicitProjectConfig.experimentalDecorators')
            ?? configuration.get('javascript.implicitProjectConfig.experimentalDecorators', false);
    }
    static readImplicitStrictNullChecks(configuration) {
        return configuration.get('js/ts.implicitProjectConfig.strictNullChecks', true);
    }
    static readImplicitStrictFunctionTypes(configuration) {
        return configuration.get('js/ts.implicitProjectConfig.strictFunctionTypes', true);
    }
}
exports.ImplicitProjectConfiguration = ImplicitProjectConfiguration;
function areServiceConfigurationsEqual(a, b) {
    return objects.equals(a, b);
}
const vscodeWatcherName = 'vscode';
class BaseServiceConfigurationProvider {
    loadFromWorkspace() {
        const configuration = vscode.workspace.getConfiguration();
        return {
            locale: this.readLocale(configuration),
            globalTsdk: this.readGlobalTsdk(configuration),
            localTsdk: this.readLocalTsdk(configuration),
            npmLocation: this.readNpmLocation(configuration),
            tsServerLogLevel: this.readTsServerLogLevel(configuration),
            tsServerPluginPaths: this.readTsServerPluginPaths(configuration),
            implicitProjectConfiguration: new ImplicitProjectConfiguration(configuration),
            disableAutomaticTypeAcquisition: this.readDisableAutomaticTypeAcquisition(configuration),
            useSyntaxServer: this.readUseSyntaxServer(configuration),
            webProjectWideIntellisenseEnabled: this.readWebProjectWideIntellisenseEnable(configuration),
            webProjectWideIntellisenseSuppressSemanticErrors: this.readWebProjectWideIntellisenseSuppressSemanticErrors(configuration),
            webTypeAcquisitionEnabled: this.readWebTypeAcquisition(configuration),
            enableDiagnosticsTelemetry: this.readEnableDiagnosticsTelemetry(configuration),
            enableProjectDiagnostics: this.readEnableProjectDiagnostics(configuration),
            maxTsServerMemory: this.readMaxTsServerMemory(configuration),
            enablePromptUseWorkspaceTsdk: this.readEnablePromptUseWorkspaceTsdk(configuration),
            useVsCodeWatcher: this.readUseVsCodeWatcher(configuration),
            watchOptions: this.readWatchOptions(configuration),
            includePackageJsonAutoImports: this.readIncludePackageJsonAutoImports(configuration),
            enableTsServerTracing: this.readEnableTsServerTracing(configuration),
            localNodePath: this.readLocalNodePath(configuration),
            globalNodePath: this.readGlobalNodePath(configuration),
            workspaceSymbolsExcludeLibrarySymbols: this.readWorkspaceSymbolsExcludeLibrarySymbols(configuration),
            enableRegionDiagnostics: this.readEnableRegionDiagnostics(configuration),
        };
    }
    readTsServerLogLevel(configuration) {
        const setting = configuration.get('typescript.tsserver.log', 'off');
        return TsServerLogLevel.fromString(setting);
    }
    readTsServerPluginPaths(configuration) {
        return configuration.get('typescript.tsserver.pluginPaths', []);
    }
    readNpmLocation(configuration) {
        return configuration.get('typescript.npm', null);
    }
    readDisableAutomaticTypeAcquisition(configuration) {
        return configuration.get('typescript.disableAutomaticTypeAcquisition', false);
    }
    readLocale(configuration) {
        const value = configuration.get('typescript.locale', 'auto');
        return !value || value === 'auto' ? null : value;
    }
    readUseSyntaxServer(configuration) {
        const value = configuration.get('typescript.tsserver.useSyntaxServer');
        switch (value) {
            case 'never': return 0 /* SyntaxServerConfiguration.Never */;
            case 'always': return 1 /* SyntaxServerConfiguration.Always */;
            case 'auto': return 2 /* SyntaxServerConfiguration.Auto */;
        }
        // Fallback to deprecated setting
        const deprecatedValue = configuration.get('typescript.tsserver.useSeparateSyntaxServer', true);
        if (deprecatedValue === 'forAllRequests') { // Undocumented setting
            return 1 /* SyntaxServerConfiguration.Always */;
        }
        if (deprecatedValue === true) {
            return 2 /* SyntaxServerConfiguration.Auto */;
        }
        return 0 /* SyntaxServerConfiguration.Never */;
    }
    readEnableDiagnosticsTelemetry(configuration) {
        // This setting does not appear in the settings view, as it is not to be enabled by users outside the team
        return configuration.get('typescript.enableDiagnosticsTelemetry', false);
    }
    readEnableProjectDiagnostics(configuration) {
        return configuration.get('typescript.tsserver.experimental.enableProjectDiagnostics', false);
    }
    readUseVsCodeWatcher(configuration) {
        const watcherExcludes = configuration.get('files.watcherExclude') ?? {};
        if (watcherExcludes['**/node_modules/*/**'] === true || // VS Code default prior to 1.94.x
            watcherExcludes['**/node_modules/**'] === true ||
            watcherExcludes['**/node_modules'] === true ||
            watcherExcludes['**'] === true // VS Code Watching is entirely disabled
        ) {
            return false;
        }
        const experimentalConfig = configuration.inspect('typescript.tsserver.experimental.useVsCodeWatcher');
        if (typeof experimentalConfig?.globalValue === 'boolean') {
            return experimentalConfig.globalValue;
        }
        if (typeof experimentalConfig?.workspaceValue === 'boolean') {
            return experimentalConfig.workspaceValue;
        }
        if (typeof experimentalConfig?.workspaceFolderValue === 'boolean') {
            return experimentalConfig.workspaceFolderValue;
        }
        return configuration.get('typescript.tsserver.watchOptions', vscodeWatcherName) === vscodeWatcherName;
    }
    readWatchOptions(configuration) {
        const watchOptions = configuration.get('typescript.tsserver.watchOptions');
        if (watchOptions === vscodeWatcherName) {
            return undefined;
        }
        // Returned value may be a proxy. Clone it into a normal object
        return { ...(watchOptions ?? {}) };
    }
    readIncludePackageJsonAutoImports(configuration) {
        return configuration.get('typescript.preferences.includePackageJsonAutoImports');
    }
    readMaxTsServerMemory(configuration) {
        const defaultMaxMemory = 3072;
        const minimumMaxMemory = 128;
        const memoryInMB = configuration.get('typescript.tsserver.maxTsServerMemory', defaultMaxMemory);
        if (!Number.isSafeInteger(memoryInMB)) {
            return defaultMaxMemory;
        }
        return Math.max(memoryInMB, minimumMaxMemory);
    }
    readEnablePromptUseWorkspaceTsdk(configuration) {
        return configuration.get('typescript.enablePromptUseWorkspaceTsdk', false);
    }
    readEnableTsServerTracing(configuration) {
        return configuration.get('typescript.tsserver.enableTracing', false);
    }
    readWorkspaceSymbolsExcludeLibrarySymbols(configuration) {
        return configuration.get('typescript.workspaceSymbols.excludeLibrarySymbols', true);
    }
    readWebProjectWideIntellisenseEnable(configuration) {
        return configuration.get('typescript.tsserver.web.projectWideIntellisense.enabled', true);
    }
    readWebProjectWideIntellisenseSuppressSemanticErrors(configuration) {
        return this.readWebTypeAcquisition(configuration) && configuration.get('typescript.tsserver.web.projectWideIntellisense.suppressSemanticErrors', false);
    }
    readWebTypeAcquisition(configuration) {
        return configuration.get('typescript.tsserver.web.typeAcquisition.enabled', true);
    }
    readEnableRegionDiagnostics(configuration) {
        return configuration.get('typescript.tsserver.enableRegionDiagnostics', true);
    }
}
exports.BaseServiceConfigurationProvider = BaseServiceConfigurationProvider;
//# sourceMappingURL=configuration.js.map