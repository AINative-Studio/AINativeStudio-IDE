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
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter } from '../../../../base/common/event.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Memento } from '../../../common/memento.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { URI } from '../../../../base/common/uri.js';
import { joinPath } from '../../../../base/common/resources.js';
import { FileAccess } from '../../../../base/common/network.js';
import { EXTENSION_INSTALL_DEP_PACK_CONTEXT, EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT, IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { walkthroughs } from '../common/gettingStartedContent.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { walkthroughsExtensionPoint } from './gettingStartedExtensionPoint.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { dirname } from '../../../../base/common/path.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { localize, localize2 } from '../../../../nls.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { checkGlobFileExists } from '../../../services/extensions/common/workspaceContains.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { DefaultIconPath } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asWebviewUri } from '../../webview/common/webview.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
export const HasMultipleNewFileEntries = new RawContextKey('hasMultipleNewFileEntries', false);
export const IWalkthroughsService = createDecorator('walkthroughsService');
export const hiddenEntriesConfigurationKey = 'workbench.welcomePage.hiddenCategories';
export const walkthroughMetadataConfigurationKey = 'workbench.welcomePage.walkthroughMetadata';
const BUILT_IN_SOURCE = localize('builtin', "Built-In");
// Show walkthrough as "new" for 7 days after first install
const DAYS = 24 * 60 * 60 * 1000;
const NEW_WALKTHROUGH_TIME = 7 * DAYS;
let WalkthroughsService = class WalkthroughsService extends Disposable {
    constructor(storageService, commandService, instantiationService, workspaceContextService, contextService, userDataSyncEnablementService, configurationService, extensionManagementService, hostService, viewsService, telemetryService, tasExperimentService, productService, layoutService) {
        super();
        this.storageService = storageService;
        this.commandService = commandService;
        this.instantiationService = instantiationService;
        this.workspaceContextService = workspaceContextService;
        this.contextService = contextService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.configurationService = configurationService;
        this.extensionManagementService = extensionManagementService;
        this.hostService = hostService;
        this.viewsService = viewsService;
        this.telemetryService = telemetryService;
        this.tasExperimentService = tasExperimentService;
        this.productService = productService;
        this.layoutService = layoutService;
        this._onDidAddWalkthrough = new Emitter();
        this.onDidAddWalkthrough = this._onDidAddWalkthrough.event;
        this._onDidRemoveWalkthrough = new Emitter();
        this.onDidRemoveWalkthrough = this._onDidRemoveWalkthrough.event;
        this._onDidChangeWalkthrough = new Emitter();
        this.onDidChangeWalkthrough = this._onDidChangeWalkthrough.event;
        this._onDidProgressStep = new Emitter();
        this.onDidProgressStep = this._onDidProgressStep.event;
        this.sessionEvents = new Set();
        this.completionListeners = new Map();
        this.gettingStartedContributions = new Map();
        this.steps = new Map();
        this.sessionInstalledExtensions = new Set();
        this.categoryVisibilityContextKeys = new Set();
        this.stepCompletionContextKeyExpressions = new Set();
        this.stepCompletionContextKeys = new Set();
        this.metadata = new Map(JSON.parse(this.storageService.get(walkthroughMetadataConfigurationKey, 0 /* StorageScope.PROFILE */, '[]')));
        this.memento = new Memento('gettingStartedService', this.storageService);
        this.stepProgress = this.memento.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        this.initCompletionEventListeners();
        HasMultipleNewFileEntries.bindTo(this.contextService).set(false);
        this.registerWalkthroughs();
    }
    registerWalkthroughs() {
        walkthroughs.forEach(async (category, index) => {
            this._registerWalkthrough({
                ...category,
                icon: { type: 'icon', icon: category.icon },
                order: walkthroughs.length - index,
                source: BUILT_IN_SOURCE,
                when: ContextKeyExpr.deserialize(category.when) ?? ContextKeyExpr.true(),
                steps: category.content.steps.map((step, index) => {
                    return ({
                        ...step,
                        completionEvents: step.completionEvents ?? [],
                        description: parseDescription(step.description),
                        category: category.id,
                        order: index,
                        when: ContextKeyExpr.deserialize(step.when) ?? ContextKeyExpr.true(),
                        media: step.media.type === 'image'
                            ? {
                                type: 'image',
                                altText: step.media.altText,
                                path: convertInternalMediaPathsToBrowserURIs(step.media.path)
                            }
                            : step.media.type === 'svg'
                                ? {
                                    type: 'svg',
                                    altText: step.media.altText,
                                    path: convertInternalMediaPathToFileURI(step.media.path).with({ query: JSON.stringify({ moduleId: 'vs/workbench/contrib/welcomeGettingStarted/common/media/' + step.media.path }) })
                                }
                                : step.media.type === 'markdown'
                                    ? {
                                        type: 'markdown',
                                        path: convertInternalMediaPathToFileURI(step.media.path).with({ query: JSON.stringify({ moduleId: 'vs/workbench/contrib/welcomeGettingStarted/common/media/' + step.media.path }) }),
                                        base: FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'),
                                        root: FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'),
                                    }
                                    : {
                                        type: 'video',
                                        path: convertRelativeMediaPathsToWebviewURIs(FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'), step.media.path),
                                        altText: step.media.altText,
                                        root: FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'),
                                        poster: step.media.poster ? convertRelativeMediaPathsToWebviewURIs(FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'), step.media.poster) : undefined
                                    },
                    });
                })
            });
        });
        walkthroughsExtensionPoint.setHandler((_, { added, removed }) => {
            added.map(e => this.registerExtensionWalkthroughContributions(e.description));
            removed.map(e => this.unregisterExtensionWalkthroughContributions(e.description));
        });
    }
    initCompletionEventListeners() {
        this._register(this.commandService.onDidExecuteCommand(command => this.progressByEvent(`onCommand:${command.commandId}`)));
        this.extensionManagementService.getInstalled().then(installed => {
            installed.forEach(ext => this.progressByEvent(`extensionInstalled:${ext.identifier.id.toLowerCase()}`));
        });
        this._register(this.extensionManagementService.onDidInstallExtensions((result) => {
            if (result.some(e => ExtensionIdentifier.equals(this.productService.defaultChatAgent?.extensionId, e.identifier.id) && !e?.context?.[EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT])) {
                result.forEach(e => {
                    this.sessionInstalledExtensions.add(e.identifier.id.toLowerCase());
                    this.progressByEvent(`extensionInstalled:${e.identifier.id.toLowerCase()}`);
                });
                return;
            }
            for (const e of result) {
                const skipWalkthrough = e?.context?.[EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT] || e?.context?.[EXTENSION_INSTALL_DEP_PACK_CONTEXT];
                // If the window had last focus and the install didn't specify to skip the walkthrough
                // Then add it to the sessionInstallExtensions to be opened
                if (!skipWalkthrough) {
                    this.sessionInstalledExtensions.add(e.identifier.id.toLowerCase());
                }
                this.progressByEvent(`extensionInstalled:${e.identifier.id.toLowerCase()}`);
            }
        }));
        this._register(this.contextService.onDidChangeContext(event => {
            if (event.affectsSome(this.stepCompletionContextKeys)) {
                this.stepCompletionContextKeyExpressions.forEach(expression => {
                    if (event.affectsSome(new Set(expression.keys())) && this.contextService.contextMatchesRules(expression)) {
                        this.progressByEvent(`onContext:` + expression.serialize());
                    }
                });
            }
        }));
        this._register(this.viewsService.onDidChangeViewVisibility(e => {
            if (e.visible) {
                this.progressByEvent('onView:' + e.id);
            }
        }));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            e.affectedKeys.forEach(key => { this.progressByEvent('onSettingChanged:' + key); });
        }));
        if (this.userDataSyncEnablementService.isEnabled()) {
            this.progressByEvent('onEvent:sync-enabled');
        }
        this._register(this.userDataSyncEnablementService.onDidChangeEnablement(() => {
            if (this.userDataSyncEnablementService.isEnabled()) {
                this.progressByEvent('onEvent:sync-enabled');
            }
        }));
    }
    markWalkthroughOpened(id) {
        const walkthrough = this.gettingStartedContributions.get(id);
        const prior = this.metadata.get(id);
        if (prior && walkthrough) {
            this.metadata.set(id, { ...prior, manaullyOpened: true, stepIDs: walkthrough.steps.map(s => s.id) });
        }
        this.storageService.store(walkthroughMetadataConfigurationKey, JSON.stringify([...this.metadata.entries()]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    async registerExtensionWalkthroughContributions(extension) {
        const convertExtensionPathToFileURI = (path) => path.startsWith('https://')
            ? URI.parse(path, true)
            : FileAccess.uriToFileUri(joinPath(extension.extensionLocation, path));
        const convertExtensionRelativePathsToBrowserURIs = (path) => {
            const convertPath = (path) => path.startsWith('https://')
                ? URI.parse(path, true)
                : FileAccess.uriToBrowserUri(joinPath(extension.extensionLocation, path));
            if (typeof path === 'string') {
                const converted = convertPath(path);
                return { hcDark: converted, hcLight: converted, dark: converted, light: converted };
            }
            else {
                return {
                    hcDark: convertPath(path.hc),
                    hcLight: convertPath(path.hcLight ?? path.light),
                    light: convertPath(path.light),
                    dark: convertPath(path.dark)
                };
            }
        };
        if (!(extension.contributes?.walkthroughs?.length)) {
            return;
        }
        let sectionToOpen;
        let sectionToOpenIndex = Math.min(); // '+Infinity';
        await Promise.all(extension.contributes?.walkthroughs?.map(async (walkthrough, index) => {
            const categoryID = extension.identifier.value + '#' + walkthrough.id;
            const isNewlyInstalled = !this.metadata.get(categoryID);
            if (isNewlyInstalled) {
                this.metadata.set(categoryID, { firstSeen: +new Date(), stepIDs: walkthrough.steps?.map(s => s.id) ?? [], manaullyOpened: false });
            }
            const override = await Promise.race([
                this.tasExperimentService?.getTreatment(`gettingStarted.overrideCategory.${extension.identifier.value + '.' + walkthrough.id}.when`),
                new Promise(resolve => setTimeout(() => resolve(walkthrough.when), 5000))
            ]);
            if (this.sessionInstalledExtensions.has(extension.identifier.value.toLowerCase())
                && this.contextService.contextMatchesRules(ContextKeyExpr.deserialize(override ?? walkthrough.when) ?? ContextKeyExpr.true())) {
                this.sessionInstalledExtensions.delete(extension.identifier.value.toLowerCase());
                if (index < sectionToOpenIndex && isNewlyInstalled) {
                    sectionToOpen = categoryID;
                    sectionToOpenIndex = index;
                }
            }
            const steps = (walkthrough.steps ?? []).map((step, index) => {
                const description = parseDescription(step.description || '');
                const fullyQualifiedID = extension.identifier.value + '#' + walkthrough.id + '#' + step.id;
                let media;
                if (!step.media) {
                    throw Error('missing media in walkthrough step: ' + walkthrough.id + '@' + step.id);
                }
                if (step.media.image) {
                    const altText = step.media.altText;
                    if (altText === undefined) {
                        console.error('Walkthrough item:', fullyQualifiedID, 'is missing altText for its media element.');
                    }
                    media = { type: 'image', altText, path: convertExtensionRelativePathsToBrowserURIs(step.media.image) };
                }
                else if (step.media.markdown) {
                    media = {
                        type: 'markdown',
                        path: convertExtensionPathToFileURI(step.media.markdown),
                        base: convertExtensionPathToFileURI(dirname(step.media.markdown)),
                        root: FileAccess.uriToFileUri(extension.extensionLocation),
                    };
                }
                else if (step.media.svg) {
                    media = {
                        type: 'svg',
                        path: convertExtensionPathToFileURI(step.media.svg),
                        altText: step.media.svg,
                    };
                }
                else if (step.media.video) {
                    const baseURI = FileAccess.uriToFileUri(extension.extensionLocation);
                    media = {
                        type: 'video',
                        path: convertRelativeMediaPathsToWebviewURIs(baseURI, step.media.video),
                        root: FileAccess.uriToFileUri(extension.extensionLocation),
                        altText: step.media.altText,
                        poster: step.media.poster ? convertRelativeMediaPathsToWebviewURIs(baseURI, step.media.poster) : undefined
                    };
                }
                // Throw error for unknown walkthrough format
                else {
                    throw new Error('Unknown walkthrough format detected for ' + fullyQualifiedID);
                }
                return ({
                    description,
                    media,
                    completionEvents: step.completionEvents?.filter(x => typeof x === 'string') ?? [],
                    id: fullyQualifiedID,
                    title: step.title,
                    when: ContextKeyExpr.deserialize(step.when) ?? ContextKeyExpr.true(),
                    category: categoryID,
                    order: index,
                });
            });
            let isFeatured = false;
            if (walkthrough.featuredFor) {
                const folders = this.workspaceContextService.getWorkspace().folders.map(f => f.uri);
                const token = new CancellationTokenSource();
                setTimeout(() => token.cancel(), 2000);
                isFeatured = await this.instantiationService.invokeFunction(a => checkGlobFileExists(a, folders, walkthrough.featuredFor, token.token));
            }
            const iconStr = walkthrough.icon ?? extension.icon;
            const walkthoughDescriptor = {
                description: walkthrough.description,
                title: walkthrough.title,
                id: categoryID,
                isFeatured,
                source: extension.displayName ?? extension.name,
                order: 0,
                walkthroughPageTitle: extension.displayName ?? extension.name,
                steps,
                icon: {
                    type: 'image',
                    path: iconStr
                        ? FileAccess.uriToBrowserUri(joinPath(extension.extensionLocation, iconStr)).toString(true)
                        : DefaultIconPath
                },
                when: ContextKeyExpr.deserialize(override ?? walkthrough.when) ?? ContextKeyExpr.true(),
            };
            this._registerWalkthrough(walkthoughDescriptor);
            this._onDidAddWalkthrough.fire(this.resolveWalkthrough(walkthoughDescriptor));
        }));
        this.storageService.store(walkthroughMetadataConfigurationKey, JSON.stringify([...this.metadata.entries()]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const hadLastFoucs = await this.hostService.hadLastFocus();
        if (hadLastFoucs && sectionToOpen && this.configurationService.getValue('workbench.welcomePage.walkthroughs.openOnInstall')) {
            this.telemetryService.publicLog2('gettingStarted.didAutoOpenWalkthrough', { id: sectionToOpen });
            this.commandService.executeCommand('workbench.action.openWalkthrough', sectionToOpen, {
                inactive: this.layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */) // do not steal the active editor away
            });
        }
    }
    unregisterExtensionWalkthroughContributions(extension) {
        if (!(extension.contributes?.walkthroughs?.length)) {
            return;
        }
        extension.contributes?.walkthroughs?.forEach(section => {
            const categoryID = extension.identifier.value + '#' + section.id;
            section.steps.forEach(step => {
                const fullyQualifiedID = extension.identifier.value + '#' + section.id + '#' + step.id;
                this.steps.delete(fullyQualifiedID);
            });
            this.gettingStartedContributions.delete(categoryID);
            this._onDidRemoveWalkthrough.fire(categoryID);
        });
    }
    getWalkthrough(id) {
        const walkthrough = this.gettingStartedContributions.get(id);
        if (!walkthrough) {
            throw Error('Trying to get unknown walkthrough: ' + id);
        }
        return this.resolveWalkthrough(walkthrough);
    }
    getWalkthroughs() {
        const registeredCategories = [...this.gettingStartedContributions.values()];
        const categoriesWithCompletion = registeredCategories
            .map(category => {
            return {
                ...category,
                content: {
                    type: 'steps',
                    steps: category.steps
                }
            };
        })
            .filter(category => category.content.type !== 'steps' || category.content.steps.length)
            .map(category => this.resolveWalkthrough(category));
        return categoriesWithCompletion;
    }
    resolveWalkthrough(category) {
        const stepsWithProgress = category.steps.map(step => this.getStepProgress(step));
        const hasOpened = this.metadata.get(category.id)?.manaullyOpened;
        const firstSeenDate = this.metadata.get(category.id)?.firstSeen;
        const isNew = firstSeenDate && firstSeenDate > (+new Date() - NEW_WALKTHROUGH_TIME);
        const lastStepIDs = this.metadata.get(category.id)?.stepIDs;
        const rawCategory = this.gettingStartedContributions.get(category.id);
        if (!rawCategory) {
            throw Error('Could not find walkthrough with id ' + category.id);
        }
        const currentStepIds = rawCategory.steps.map(s => s.id);
        const hasNewSteps = lastStepIDs && (currentStepIds.length !== lastStepIDs.length || currentStepIds.some((id, index) => id !== lastStepIDs[index]));
        let recencyBonus = 0;
        if (firstSeenDate) {
            const currentDate = +new Date();
            const timeSinceFirstSeen = currentDate - firstSeenDate;
            recencyBonus = Math.max(0, (NEW_WALKTHROUGH_TIME - timeSinceFirstSeen) / NEW_WALKTHROUGH_TIME);
        }
        return {
            ...category,
            recencyBonus,
            steps: stepsWithProgress,
            newItems: !!hasNewSteps,
            newEntry: !!(isNew && !hasOpened),
        };
    }
    getStepProgress(step) {
        return {
            ...step,
            done: false,
            ...this.stepProgress[step.id]
        };
    }
    progressStep(id) {
        const oldProgress = this.stepProgress[id];
        if (!oldProgress || oldProgress.done !== true) {
            this.stepProgress[id] = { done: true };
            this.memento.saveMemento();
            const step = this.getStep(id);
            if (!step) {
                throw Error('Tried to progress unknown step');
            }
            this._onDidProgressStep.fire(this.getStepProgress(step));
        }
    }
    deprogressStep(id) {
        delete this.stepProgress[id];
        this.memento.saveMemento();
        const step = this.getStep(id);
        this._onDidProgressStep.fire(this.getStepProgress(step));
    }
    progressByEvent(event) {
        if (this.sessionEvents.has(event)) {
            return;
        }
        this.sessionEvents.add(event);
        this.completionListeners.get(event)?.forEach(id => this.progressStep(id));
    }
    registerWalkthrough(walkthoughDescriptor) {
        this._registerWalkthrough({
            ...walkthoughDescriptor,
            steps: walkthoughDescriptor.steps.map(step => ({ ...step, description: parseDescription(step.description) }))
        });
    }
    _registerWalkthrough(walkthroughDescriptor) {
        const oldCategory = this.gettingStartedContributions.get(walkthroughDescriptor.id);
        if (oldCategory) {
            console.error(`Skipping attempt to overwrite walkthrough. (${walkthroughDescriptor.id})`);
            return;
        }
        this.gettingStartedContributions.set(walkthroughDescriptor.id, walkthroughDescriptor);
        walkthroughDescriptor.steps.forEach(step => {
            if (this.steps.has(step.id)) {
                throw Error('Attempting to register step with id ' + step.id + ' twice. Second is dropped.');
            }
            this.steps.set(step.id, step);
            step.when.keys().forEach(key => this.categoryVisibilityContextKeys.add(key));
            this.registerDoneListeners(step);
        });
        walkthroughDescriptor.when.keys().forEach(key => this.categoryVisibilityContextKeys.add(key));
    }
    registerDoneListeners(step) {
        if (step.doneOn) {
            console.error(`wakthrough step`, step, `uses deprecated 'doneOn' property. Adopt 'completionEvents' to silence this warning`);
            return;
        }
        if (!step.completionEvents.length) {
            step.completionEvents = coalesce(step.description
                .filter(linkedText => linkedText.nodes.length === 1) // only buttons
                .flatMap(linkedText => linkedText.nodes
                .filter(((node) => typeof node !== 'string'))
                .map(({ href }) => {
                if (href.startsWith('command:')) {
                    return 'onCommand:' + href.slice('command:'.length, href.includes('?') ? href.indexOf('?') : undefined);
                }
                if (href.startsWith('https://') || href.startsWith('http://')) {
                    return 'onLink:' + href;
                }
                return undefined;
            })));
        }
        if (!step.completionEvents.length) {
            step.completionEvents.push('stepSelected');
        }
        for (let event of step.completionEvents) {
            const [_, eventType, argument] = /^([^:]*):?(.*)$/.exec(event) ?? [];
            if (!eventType) {
                console.error(`Unknown completionEvent ${event} when registering step ${step.id}`);
                continue;
            }
            switch (eventType) {
                case 'onLink':
                case 'onEvent':
                case 'onView':
                case 'onSettingChanged':
                    break;
                case 'onContext': {
                    const expression = ContextKeyExpr.deserialize(argument);
                    if (expression) {
                        this.stepCompletionContextKeyExpressions.add(expression);
                        expression.keys().forEach(key => this.stepCompletionContextKeys.add(key));
                        event = eventType + ':' + expression.serialize();
                        if (this.contextService.contextMatchesRules(expression)) {
                            this.sessionEvents.add(event);
                        }
                    }
                    else {
                        console.error('Unable to parse context key expression:', expression, 'in walkthrough step', step.id);
                    }
                    break;
                }
                case 'onStepSelected':
                case 'stepSelected':
                    event = 'stepSelected:' + step.id;
                    break;
                case 'onCommand':
                    event = eventType + ':' + argument.replace(/^toSide:/, '');
                    break;
                case 'onExtensionInstalled':
                case 'extensionInstalled':
                    event = 'extensionInstalled:' + argument.toLowerCase();
                    break;
                default:
                    console.error(`Unknown completionEvent ${event} when registering step ${step.id}`);
                    continue;
            }
            this.registerCompletionListener(event, step);
        }
    }
    registerCompletionListener(event, step) {
        if (!this.completionListeners.has(event)) {
            this.completionListeners.set(event, new Set());
        }
        this.completionListeners.get(event)?.add(step.id);
    }
    getStep(id) {
        const step = this.steps.get(id);
        if (!step) {
            throw Error('Attempting to access step which does not exist in registry ' + id);
        }
        return step;
    }
};
WalkthroughsService = __decorate([
    __param(0, IStorageService),
    __param(1, ICommandService),
    __param(2, IInstantiationService),
    __param(3, IWorkspaceContextService),
    __param(4, IContextKeyService),
    __param(5, IUserDataSyncEnablementService),
    __param(6, IConfigurationService),
    __param(7, IExtensionManagementService),
    __param(8, IHostService),
    __param(9, IViewsService),
    __param(10, ITelemetryService),
    __param(11, IWorkbenchAssignmentService),
    __param(12, IProductService),
    __param(13, IWorkbenchLayoutService)
], WalkthroughsService);
export { WalkthroughsService };
export const parseDescription = (desc) => desc.split('\n').filter(x => x).map(text => parseLinkedText(text));
export const convertInternalMediaPathToFileURI = (path) => path.startsWith('https://')
    ? URI.parse(path, true)
    : FileAccess.asFileUri(`vs/workbench/contrib/welcomeGettingStarted/common/media/${path}`);
const convertInternalMediaPathToBrowserURI = (path) => path.startsWith('https://')
    ? URI.parse(path, true)
    : FileAccess.asBrowserUri(`vs/workbench/contrib/welcomeGettingStarted/common/media/${path}`);
const convertInternalMediaPathsToBrowserURIs = (path) => {
    if (typeof path === 'string') {
        const converted = convertInternalMediaPathToBrowserURI(path);
        return { hcDark: converted, hcLight: converted, dark: converted, light: converted };
    }
    else {
        return {
            hcDark: convertInternalMediaPathToBrowserURI(path.hc),
            hcLight: convertInternalMediaPathToBrowserURI(path.hcLight ?? path.light),
            light: convertInternalMediaPathToBrowserURI(path.light),
            dark: convertInternalMediaPathToBrowserURI(path.dark)
        };
    }
};
const convertRelativeMediaPathsToWebviewURIs = (basePath, path) => {
    const convertPath = (path) => path.startsWith('https://')
        ? URI.parse(path, true)
        : asWebviewUri(joinPath(basePath, path));
    if (typeof path === 'string') {
        const converted = convertPath(path);
        return { hcDark: converted, hcLight: converted, dark: converted, light: converted };
    }
    else {
        return {
            hcDark: convertPath(path.hc),
            hcLight: convertPath(path.hcLight ?? path.light),
            light: convertPath(path.light),
            dark: convertPath(path.dark)
        };
    }
};
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'resetGettingStartedProgress',
            category: localize2('developer', "Developer"),
            title: localize2('resetWelcomePageWalkthroughProgress', "Reset Welcome Page Walkthrough Progress"),
            f1: true,
            metadata: {
                description: localize2('resetGettingStartedProgressDescription', 'Reset the progress of all Walkthrough steps on the Welcome Page to make them appear as if they are being viewed for the first time, providing a fresh start to the getting started experience.'),
            }
        });
    }
    run(accessor) {
        const gettingStartedService = accessor.get(IWalkthroughsService);
        const storageService = accessor.get(IStorageService);
        storageService.store(hiddenEntriesConfigurationKey, JSON.stringify([]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        storageService.store(walkthroughMetadataConfigurationKey, JSON.stringify([]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const memento = new Memento('gettingStartedService', accessor.get(IStorageService));
        const record = memento.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        for (const key in record) {
            if (Object.prototype.hasOwnProperty.call(record, key)) {
                try {
                    gettingStartedService.deprogressStep(key);
                }
                catch (e) {
                    console.error(e);
                }
            }
        }
        memento.saveMemento();
    }
});
registerSingleton(IWalkthroughsService, WalkthroughsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2Jyb3dzZXIvZ2V0dGluZ1N0YXJ0ZWRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDdEksT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQXdCLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQy9JLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQXlCLE1BQU0sc0RBQXNELENBQUM7QUFDbEgsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLGtDQUFrQyxFQUFF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