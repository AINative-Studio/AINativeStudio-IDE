/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CustomEditorLabelService_1;
import { Emitter } from '../../../../base/common/event.js';
import { parse as parseGlob } from '../../../../base/common/glob.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isAbsolute, parse as parsePath, dirname } from '../../../../base/common/path.js';
import { dirname as resourceDirname, relativePath as getRelativePath } from '../../../../base/common/resources.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { MRUCache } from '../../../../base/common/map.js';
let CustomEditorLabelService = class CustomEditorLabelService extends Disposable {
    static { CustomEditorLabelService_1 = this; }
    static { this.SETTING_ID_PATTERNS = 'workbench.editor.customLabels.patterns'; }
    static { this.SETTING_ID_ENABLED = 'workbench.editor.customLabels.enabled'; }
    constructor(configurationService, workspaceContextService) {
        super();
        this.configurationService = configurationService;
        this.workspaceContextService = workspaceContextService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.patterns = [];
        this.enabled = true;
        this.cache = new MRUCache(1000);
        this._templateRegexValidation = /[a-zA-Z0-9]/;
        this._parsedTemplateExpression = /\$\{(dirname|filename|extname|extname\((?<extnameN>[-+]?\d+)\)|dirname\((?<dirnameN>[-+]?\d+)\))\}/g;
        this._filenameCaptureExpression = /(?<filename>^\.*[^.]*)/;
        this.storeEnablementState();
        this.storeCustomPatterns();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            // Cache the enabled state
            if (e.affectsConfiguration(CustomEditorLabelService_1.SETTING_ID_ENABLED)) {
                const oldEnablement = this.enabled;
                this.storeEnablementState();
                if (oldEnablement !== this.enabled && this.patterns.length > 0) {
                    this._onDidChange.fire();
                }
            }
            // Cache the patterns
            else if (e.affectsConfiguration(CustomEditorLabelService_1.SETTING_ID_PATTERNS)) {
                this.cache.clear();
                this.storeCustomPatterns();
                this._onDidChange.fire();
            }
        }));
    }
    storeEnablementState() {
        this.enabled = this.configurationService.getValue(CustomEditorLabelService_1.SETTING_ID_ENABLED);
    }
    storeCustomPatterns() {
        this.patterns = [];
        const customLabelPatterns = this.configurationService.getValue(CustomEditorLabelService_1.SETTING_ID_PATTERNS);
        for (const pattern in customLabelPatterns) {
            const template = customLabelPatterns[pattern];
            if (!this._templateRegexValidation.test(template)) {
                continue;
            }
            const isAbsolutePath = isAbsolute(pattern);
            const parsedPattern = parseGlob(pattern);
            this.patterns.push({ pattern, template, isAbsolutePath, parsedPattern });
        }
        this.patterns.sort((a, b) => this.patternWeight(b.pattern) - this.patternWeight(a.pattern));
    }
    patternWeight(pattern) {
        let weight = 0;
        for (const fragment of pattern.split('/')) {
            if (fragment === '**') {
                weight += 1;
            }
            else if (fragment === '*') {
                weight += 10;
            }
            else if (fragment.includes('*') || fragment.includes('?')) {
                weight += 50;
            }
            else if (fragment !== '') {
                weight += 100;
            }
        }
        return weight;
    }
    getName(resource) {
        if (!this.enabled || this.patterns.length === 0) {
            return undefined;
        }
        const key = resource.toString();
        const cached = this.cache.get(key);
        if (cached !== undefined) {
            return cached ?? undefined;
        }
        const result = this.applyPatterns(resource);
        this.cache.set(key, result ?? null);
        return result;
    }
    applyPatterns(resource) {
        const root = this.workspaceContextService.getWorkspaceFolder(resource);
        let relativePath;
        for (const pattern of this.patterns) {
            let relevantPath;
            if (root && !pattern.isAbsolutePath) {
                if (!relativePath) {
                    relativePath = getRelativePath(resourceDirname(root.uri), resource) ?? resource.path;
                }
                relevantPath = relativePath;
            }
            else {
                relevantPath = resource.path;
            }
            if (pattern.parsedPattern(relevantPath)) {
                return this.applyTemplate(pattern.template, resource, relevantPath);
            }
        }
        return undefined;
    }
    applyTemplate(template, resource, relevantPath) {
        let parsedPath;
        return template.replace(this._parsedTemplateExpression, (match, variable, ...args) => {
            parsedPath = parsedPath ?? parsePath(resource.path);
            // named group matches
            const { dirnameN = '0', extnameN = '0' } = args.pop();
            if (variable === 'filename') {
                const { filename } = this._filenameCaptureExpression.exec(parsedPath.base)?.groups ?? {};
                if (filename) {
                    return filename;
                }
            }
            else if (variable === 'extname') {
                const extension = this.getExtnames(parsedPath.base);
                if (extension) {
                    return extension;
                }
            }
            else if (variable.startsWith('extname')) {
                const n = parseInt(extnameN);
                const nthExtname = this.getNthExtname(parsedPath.base, n);
                if (nthExtname) {
                    return nthExtname;
                }
            }
            else if (variable.startsWith('dirname')) {
                const n = parseInt(dirnameN);
                const nthDir = this.getNthDirname(dirname(relevantPath), n);
                if (nthDir) {
                    return nthDir;
                }
            }
            return match;
        });
    }
    removeLeadingDot(path) {
        let withoutLeadingDot = path;
        while (withoutLeadingDot.startsWith('.')) {
            withoutLeadingDot = withoutLeadingDot.slice(1);
        }
        return withoutLeadingDot;
    }
    getNthDirname(path, n) {
        // grand-parent/parent/filename.ext1.ext2 -> [grand-parent, parent]
        path = path.startsWith('/') ? path.slice(1) : path;
        const pathFragments = path.split('/');
        return this.getNthFragment(pathFragments, n);
    }
    getExtnames(fullFileName) {
        return this.removeLeadingDot(fullFileName).split('.').slice(1).join('.');
    }
    getNthExtname(fullFileName, n) {
        // file.ext1.ext2.ext3 -> [file, ext1, ext2, ext3]
        const extensionNameFragments = this.removeLeadingDot(fullFileName).split('.');
        extensionNameFragments.shift(); // remove the first element which is the file name
        return this.getNthFragment(extensionNameFragments, n);
    }
    getNthFragment(fragments, n) {
        const length = fragments.length;
        let nth;
        if (n < 0) {
            nth = Math.abs(n) - 1;
        }
        else {
            nth = length - n - 1;
        }
        const nthFragment = fragments[nth];
        if (nthFragment === undefined || nthFragment === '') {
            return undefined;
        }
        return nthFragment;
    }
};
CustomEditorLabelService = CustomEditorLabelService_1 = __decorate([
    __param(0, IConfigurationService),
    __param(1, IWorkspaceContextService)
], CustomEditorLabelService);
export { CustomEditorLabelService };
export const ICustomEditorLabelService = createDecorator('ICustomEditorLabelService');
registerSingleton(ICustomEditorLabelService, CustomEditorLabelService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9yTGFiZWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvY29tbW9uL2N1c3RvbUVkaXRvckxhYmVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBaUIsS0FBSyxJQUFJLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLEtBQUssSUFBSSxTQUFTLEVBQWMsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEcsT0FBTyxFQUFFLE9BQU8sSUFBSSxlQUFlLEVBQUUsWUFBWSxJQUFJLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRW5ILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBY25ELElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTs7YUFJdkMsd0JBQW1CLEdBQUcsd0NBQXdDLEFBQTNDLENBQTRDO2FBQy9ELHVCQUFrQixHQUFHLHVDQUF1QyxBQUExQyxDQUEyQztJQVU3RSxZQUN3QixvQkFB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