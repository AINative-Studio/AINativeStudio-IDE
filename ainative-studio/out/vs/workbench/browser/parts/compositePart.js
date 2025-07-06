/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/compositepart.css';
import { localize } from '../../../nls.js';
import { defaultGenerator } from '../../../base/common/idGenerator.js';
import { dispose, DisposableStore, MutableDisposable, } from '../../../base/common/lifecycle.js';
import { Emitter } from '../../../base/common/event.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { prepareActions } from '../../../base/browser/ui/actionbar/actionbar.js';
import { ProgressBar } from '../../../base/browser/ui/progressbar/progressbar.js';
import { Part } from '../part.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { IEditorProgressService } from '../../../platform/progress/common/progress.js';
import { Dimension, append, $, hide, show } from '../../../base/browser/dom.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { createActionViewItem } from '../../../platform/actions/browser/menuEntryActionViewItem.js';
import { AbstractProgressScope, ScopedProgressIndicator } from '../../services/progress/browser/progressIndicator.js';
import { WorkbenchToolBar } from '../../../platform/actions/browser/toolbar.js';
import { defaultProgressBarStyles } from '../../../platform/theme/browser/defaultStyles.js';
import { createInstantHoverDelegate, getDefaultHoverDelegate } from '../../../base/browser/ui/hover/hoverDelegateFactory.js';
export class CompositePart extends Part {
    constructor(notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, registry, activeCompositeSettingsKey, defaultCompositeId, nameForTelemetry, compositeCSSClass, titleForegroundColor, titleBorderColor, id, options) {
        super(id, options, themeService, storageService, layoutService);
        this.notificationService = notificationService;
        this.storageService = storageService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.hoverService = hoverService;
        this.instantiationService = instantiationService;
        this.registry = registry;
        this.activeCompositeSettingsKey = activeCompositeSettingsKey;
        this.defaultCompositeId = defaultCompositeId;
        this.nameForTelemetry = nameForTelemetry;
        this.compositeCSSClass = compositeCSSClass;
        this.titleForegroundColor = titleForegroundColor;
        this.titleBorderColor = titleBorderColor;
        this.onDidCompositeOpen = this._register(new Emitter());
        this.onDidCompositeClose = this._register(new Emitter());
        this.mapCompositeToCompositeContainer = new Map();
        this.mapActionsBindingToComposite = new Map();
        this.instantiatedCompositeItems = new Map();
        this.actionsListener = this._register(new MutableDisposable());
        this.lastActiveCompositeId = storageService.get(activeCompositeSettingsKey, 1 /* StorageScope.WORKSPACE */, this.defaultCompositeId);
        this.toolbarHoverDelegate = this._register(createInstantHoverDelegate());
    }
    openComposite(id, focus) {
        // Check if composite already visible and just focus in that case
        if (this.activeComposite?.getId() === id) {
            if (focus) {
                this.activeComposite.focus();
            }
            // Fullfill promise with composite that is being opened
            return this.activeComposite;
        }
        // We cannot open the composite if we have not been created yet
        if (!this.element) {
            return;
        }
        // Open
        return this.doOpenComposite(id, focus);
    }
    doOpenComposite(id, focus = false) {
        // Use a generated token to avoid race conditions from long running promises
        const currentCompositeOpenToken = defaultGenerator.nextId();
        this.currentCompositeOpenToken = currentCompositeOpenToken;
        // Hide current
        if (this.activeComposite) {
            this.hideActiveComposite();
        }
        // Update Title
        this.updateTitle(id);
        // Create composite
        const composite = this.createComposite(id, true);
        // Check if another composite opened meanwhile and return in that case
        if ((this.currentCompositeOpenToken !== currentCompositeOpenToken) || (this.activeComposite && this.activeComposite.getId() !== composite.getId())) {
            return undefined;
        }
        // Check if composite already visible and just focus in that case
        if (this.activeComposite?.getId() === composite.getId()) {
            if (focus) {
                composite.focus();
            }
            this.onDidCompositeOpen.fire({ composite, focus });
            return composite;
        }
        // Show Composite and Focus
        this.showComposite(composite);
        if (focus) {
            composite.focus();
        }
        // Return with the composite that is being opened
        if (composite) {
            this.onDidCompositeOpen.fire({ composite, focus });
        }
        return composite;
    }
    createComposite(id, isActive) {
        // Check if composite is already created
        const compositeItem = this.instantiatedCompositeItems.get(id);
        if (compositeItem) {
            return compositeItem.composite;
        }
        // Instantiate composite from registry otherwise
        const compositeDescriptor = this.registry.getComposite(id);
        if (compositeDescriptor) {
            const that = this;
            const compositeProgressIndicator = new ScopedProgressIndicator(assertIsDefined(this.progressBar), new class extends AbstractProgressScope {
                constructor() {
                    super(compositeDescriptor.id, !!isActive);
                    this._register(that.onDidCompositeOpen.event(e => this.onScopeOpened(e.composite.getId())));
                    this._register(that.onDidCompositeClose.event(e => this.onScopeClosed(e.getId())));
                }
            }());
            const compositeInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IEditorProgressService, compositeProgressIndicator] // provide the editor progress service for any editors instantiated within the composite
            )));
            const composite = compositeDescriptor.instantiate(compositeInstantiationService);
            const disposable = new DisposableStore();
            // Remember as Instantiated
            this.instantiatedCompositeItems.set(id, { composite, disposable, progress: compositeProgressIndicator });
            // Register to title area update events from the composite
            disposable.add(composite.onTitleAreaUpdate(() => this.onTitleAreaUpdate(composite.getId()), this));
            disposable.add(compositeInstantiationService);
            return composite;
        }
        throw new Error(`Unable to find composite with id ${id}`);
    }
    showComposite(composite) {
        // Remember Composite
        this.activeComposite = composite;
        // Store in preferences
        const id = this.activeComposite.getId();
        if (id !== this.defaultCompositeId) {
            this.storageService.store(this.activeCompositeSettingsKey, id, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(this.activeCompositeSettingsKey, 1 /* StorageScope.WORKSPACE */);
        }
        // Remember
        this.lastActiveCompositeId = this.activeComposite.getId();
        // Composites created for the first time
        let compositeContainer = this.mapCompositeToCompositeContainer.get(composite.getId());
        if (!compositeContainer) {
            // Build Container off-DOM
            compositeContainer = $('.composite');
            compositeContainer.classList.add(...this.compositeCSSClass.split(' '));
            compositeContainer.id = composite.getId();
            composite.create(compositeContainer);
            composite.updateStyles();
            // Remember composite container
            this.mapCompositeToCompositeContainer.set(composite.getId(), compositeContainer);
        }
        // Fill Content and Actions
        // Make sure that the user meanwhile did not open another composite or closed the part containing the composite
        if (!this.activeComposite || composite.getId() !== this.activeComposite.getId()) {
            return undefined;
        }
        // Take Composite on-DOM and show
        const contentArea = this.getContentArea();
        contentArea?.appendChild(compositeContainer);
        show(compositeContainer);
        // Setup action runner
        const toolBar = assertIsDefined(this.toolBar);
        toolBar.actionRunner = composite.getActionRunner();
        // Update title with composite title if it differs from descriptor
        const descriptor = this.registry.getComposite(composite.getId());
        if (descriptor && descriptor.name !== composite.getTitle()) {
            this.updateTitle(composite.getId(), composite.getTitle());
        }
        // Handle Composite Actions
        let actionsBinding = this.mapActionsBindingToComposite.get(composite.getId());
        if (!actionsBinding) {
            actionsBinding = this.collectCompositeActions(composite);
            this.mapActionsBindingToComposite.set(composite.getId(), actionsBinding);
        }
        actionsBinding();
        // Action Run Handling
        this.actionsListener.value = toolBar.actionRunner.onDidRun(e => {
            // Check for Error
            if (e.error && !isCancellationError(e.error)) {
                this.notificationService.error(e.error);
            }
        });
        // Indicate to composite that it is now visible
        composite.setVisible(true);
        // Make sure that the user meanwhile did not open another composite or closed the part containing the composite
        if (!this.activeComposite || composite.getId() !== this.activeComposite.getId()) {
            return;
        }
        // Make sure the composite is layed out
        if (this.contentAreaSize) {
            composite.layout(this.contentAreaSize);
        }
        // Make sure boundary sashes are propagated
        if (this.boundarySashes) {
            composite.setBoundarySashes(this.boundarySashes);
        }
    }
    onTitleAreaUpdate(compositeId) {
        // Title
        const composite = this.instantiatedCompositeItems.get(compositeId);
        if (composite) {
            this.updateTitle(compositeId, composite.composite.getTitle());
        }
        // Active Composite
        if (this.activeComposite?.getId() === compositeId) {
            // Actions
            const actionsBinding = this.collectCompositeActions(this.activeComposite);
            this.mapActionsBindingToComposite.set(this.activeComposite.getId(), actionsBinding);
            actionsBinding();
        }
        // Otherwise invalidate actions binding for next time when the composite becomes visible
        else {
            this.mapActionsBindingToComposite.delete(compositeId);
        }
    }
    updateTitle(compositeId, compositeTitle) {
        const compositeDescriptor = this.registry.getComposite(compositeId);
        if (!compositeDescriptor || !this.titleLabel) {
            return;
        }
        if (!compositeTitle) {
            compositeTitle = compositeDescriptor.name;
        }
        const keybinding = this.keybindingService.lookupKeybinding(compositeId);
        this.titleLabel.updateTitle(compositeId, compositeTitle, keybinding?.getLabel() ?? undefined);
        const toolBar = assertIsDefined(this.toolBar);
        toolBar.setAriaLabel(localize('ariaCompositeToolbarLabel', "{0} actions", compositeTitle));
    }
    collectCompositeActions(composite) {
        // From Composite
        const menuIds = composite?.getMenuIds();
        const primaryActions = composite?.getActions().slice(0) || [];
        const secondaryActions = composite?.getSecondaryActions().slice(0) || [];
        // Update context
        const toolBar = assertIsDefined(this.toolBar);
        toolBar.context = this.actionsContextProvider();
        // Return fn to set into toolbar
        return () => toolBar.setActions(prepareActions(primaryActions), prepareActions(secondaryActions), menuIds);
    }
    getActiveComposite() {
        return this.activeComposite;
    }
    getLastActiveCompositeId() {
        return this.lastActiveCompositeId;
    }
    hideActiveComposite() {
        if (!this.activeComposite) {
            return undefined; // Nothing to do
        }
        const composite = this.activeComposite;
        this.activeComposite = undefined;
        const compositeContainer = this.mapCompositeToCompositeContainer.get(composite.getId());
        // Indicate to Composite
        composite.setVisible(false);
        // Take Container Off-DOM and hide
        if (compositeContainer) {
            compositeContainer.remove();
            hide(compositeContainer);
        }
        // Clear any running Progress
        this.progressBar?.stop().hide();
        // Empty Actions
        if (this.toolBar) {
            this.collectCompositeActions()();
        }
        this.onDidCompositeClose.fire(composite);
        return composite;
    }
    createTitleArea(parent) {
        // Title Area Container
        const titleArea = append(parent, $('.composite'));
        titleArea.classList.add('title');
        // Left Title Label
        this.titleLabel = this.createTitleLabel(titleArea);
        // Right Actions Container
        const titleActionsContainer = append(titleArea, $('.title-actions'));
        // Toolbar
        this.toolBar = this._register(this.instantiationService.createInstance(WorkbenchToolBar, titleActionsContainer, {
            actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            getKeyBinding: action => this.keybindingService.lookupKeybinding(action.id),
            anchorAlignmentProvider: () => this.getTitleAreaDropDownAnchorAlignment(),
            toggleMenuTitle: localize('viewsAndMoreActions', "Views and More Actions..."),
            telemetrySource: this.nameForTelemetry,
            hoverDelegate: this.toolbarHoverDelegate
        }));
        this.collectCompositeActions()();
        return titleArea;
    }
    createTitleLabel(parent) {
        const titleContainer = append(parent, $('.title-label'));
        const titleLabel = append(titleContainer, $('h2'));
        this.titleLabelElement = titleLabel;
        const hover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), titleLabel, ''));
        const $this = this;
        return {
            updateTitle: (id, title, keybinding) => {
                // The title label is shared for all composites in the base CompositePart
                if (!this.activeComposite || this.activeComposite.getId() === id) {
                    titleLabel.innerText = title;
                    hover.update(keybinding ? localize('titleTooltip', "{0} ({1})", title, keybinding) : title);
                }
            },
            updateStyles: () => {
                titleLabel.style.color = $this.titleForegroundColor ? $this.getColor($this.titleForegroundColor) || '' : '';
                const borderColor = $this.titleBorderColor ? $this.getColor($this.titleBorderColor) : undefined;
                parent.style.borderBottom = borderColor ? `1px solid ${borderColor}` : '';
            }
        };
    }
    createHeaderArea() {
        return $('.composite');
    }
    createFooterArea() {
        return $('.composite');
    }
    updateStyles() {
        super.updateStyles();
        // Forward to title label
        const titleLabel = assertIsDefined(this.titleLabel);
        titleLabel.updateStyles();
    }
    actionViewItemProvider(action, options) {
        // Check Active Composite
        if (this.activeComposite) {
            return this.activeComposite.getActionViewItem(action, options);
        }
        return createActionViewItem(this.instantiationService, action, options);
    }
    actionsContextProvider() {
        // Check Active Composite
        if (this.activeComposite) {
            return this.activeComposite.getActionsContext();
        }
        return null;
    }
    createContentArea(parent) {
        const contentContainer = append(parent, $('.content'));
        this.progressBar = this._register(new ProgressBar(contentContainer, defaultProgressBarStyles));
        this.progressBar.hide();
        return contentContainer;
    }
    getProgressIndicator(id) {
        const compositeItem = this.instantiatedCompositeItems.get(id);
        return compositeItem ? compositeItem.progress : undefined;
    }
    getTitleAreaDropDownAnchorAlignment() {
        return 1 /* AnchorAlignment.RIGHT */;
    }
    layout(width, height, top, left) {
        super.layout(width, height, top, left);
        // Layout contents
        this.contentAreaSize = Dimension.lift(super.layoutContents(width, height).contentSize);
        // Layout composite
        this.activeComposite?.layout(this.contentAreaSize);
    }
    setBoundarySashes(sashes) {
        this.boundarySashes = sashes;
        this.activeComposite?.setBoundarySashes(sashes);
    }
    removeComposite(compositeId) {
        if (this.activeComposite?.getId() === compositeId) {
            return false; // do not remove active composite
        }
        this.mapCompositeToCompositeContainer.delete(compositeId);
        this.mapActionsBindingToComposite.delete(compositeId);
        const compositeItem = this.instantiatedCompositeItems.get(compositeId);
        if (compositeItem) {
            compositeItem.composite.dispose();
            dispose(compositeItem.disposable);
            this.instantiatedCompositeItems.delete(compositeId);
        }
        return true;
    }
    dispose() {
        this.mapCompositeToCompositeContainer.clear();
        this.mapActionsBindingToComposite.clear();
        this.instantiatedCompositeItems.forEach(compositeItem => {
            compositeItem.composite.dispose();
            dispose(compositeItem.disposable);
        });
        this.instantiatedCompositeItems.clear();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9zaXRlUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2NvbXBvc2l0ZVBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTywyQkFBMkIsQ0FBQztBQUNuQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkUsT0FBTyxFQUFlLE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEdBQUcsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckUsT0FBTyxFQUF1QyxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN0SCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFbEYsT0FBTyxFQUFFLElBQUksRUFBZ0IsTUFBTSxZQUFZLENBQUM7QUFPaEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDaEcsT0FBTyxFQUFzQixzQkFBc0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBSTNHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSx1QkFB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