/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import product from '../../../platform/product/common/product.js';
import { isMacintosh, isLinux, language, isWeb } from '../../../base/common/platform.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { URI } from '../../../base/common/uri.js';
import { MenuId, Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { KeyChord } from '../../../base/common/keyCodes.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
class KeybindingsReferenceAction extends Action2 {
    static { this.ID = 'workbench.action.keybindingsReference'; }
    static { this.AVAILABLE = !!(isLinux ? product.keyboardShortcutsUrlLinux : isMacintosh ? product.keyboardShortcutsUrlMac : product.keyboardShortcutsUrlWin); }
    constructor() {
        super({
            id: KeybindingsReferenceAction.ID,
            title: {
                ...localize2('keybindingsReference', "Keyboard Shortcuts Reference"),
                mnemonicTitle: localize({ key: 'miKeyboardShortcuts', comment: ['&& denotes a mnemonic'] }, "&&Keyboard Shortcuts Reference"),
            },
            category: Categories.Help,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: null,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */)
            },
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '2_reference',
                order: 1
            }
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        const url = isLinux ? productService.keyboardShortcutsUrlLinux : isMacintosh ? productService.keyboardShortcutsUrlMac : productService.keyboardShortcutsUrlWin;
        if (url) {
            openerService.open(URI.parse(url));
        }
    }
}
class OpenIntroductoryVideosUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openVideoTutorialsUrl'; }
    static { this.AVAILABLE = !!product.introductoryVideosUrl; }
    constructor() {
        super({
            id: OpenIntroductoryVideosUrlAction.ID,
            title: {
                ...localize2('openVideoTutorialsUrl', "Video Tutorials"),
                mnemonicTitle: localize({ key: 'miVideoTutorials', comment: ['&& denotes a mnemonic'] }, "&&Video Tutorials"),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '2_reference',
                order: 2
            }
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        if (productService.introductoryVideosUrl) {
            openerService.open(URI.parse(productService.introductoryVideosUrl));
        }
    }
}
class OpenTipsAndTricksUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openTipsAndTricksUrl'; }
    static { this.AVAILABLE = !!product.tipsAndTricksUrl; }
    constructor() {
        super({
            id: OpenTipsAndTricksUrlAction.ID,
            title: {
                ...localize2('openTipsAndTricksUrl', "Tips and Tricks"),
                mnemonicTitle: localize({ key: 'miTipsAndTricks', comment: ['&& denotes a mnemonic'] }, "Tips and Tri&&cks"),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '2_reference',
                order: 3
            }
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        if (productService.tipsAndTricksUrl) {
            openerService.open(URI.parse(productService.tipsAndTricksUrl));
        }
    }
}
class OpenDocumentationUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openDocumentationUrl'; }
    static { this.AVAILABLE = !!(isWeb ? product.serverDocumentationUrl : product.documentationUrl); }
    constructor() {
        super({
            id: OpenDocumentationUrlAction.ID,
            title: {
                ...localize2('openDocumentationUrl', "Documentation"),
                mnemonicTitle: localize({ key: 'miDocumentation', comment: ['&& denotes a mnemonic'] }, "&&Documentation"),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '1_welcome',
                order: 3
            }
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        const url = isWeb ? productService.serverDocumentationUrl : productService.documentationUrl;
        if (url) {
            openerService.open(URI.parse(url));
        }
    }
}
class OpenNewsletterSignupUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openNewsletterSignupUrl'; }
    static { this.AVAILABLE = !!product.newsletterSignupUrl; }
    constructor() {
        super({
            id: OpenNewsletterSignupUrlAction.ID,
            title: localize2('newsletterSignup', 'Signup for the VS Code Newsletter'),
            category: Categories.Help,
            f1: true
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        const telemetryService = accessor.get(ITelemetryService);
        openerService.open(URI.parse(`${productService.newsletterSignupUrl}?machineId=${encodeURIComponent(telemetryService.machineId)}`));
    }
}
class OpenYouTubeUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openYouTubeUrl'; }
    static { this.AVAILABLE = !!product.youTubeUrl; }
    constructor() {
        super({
            id: OpenYouTubeUrlAction.ID,
            title: {
                ...localize2('openYouTubeUrl', "Join Us on YouTube"),
                mnemonicTitle: localize({ key: 'miYouTube', comment: ['&& denotes a mnemonic'] }, "&&Join Us on YouTube"),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '3_feedback',
                order: 1
            }
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        if (productService.youTubeUrl) {
            openerService.open(URI.parse(productService.youTubeUrl));
        }
    }
}
class OpenRequestFeatureUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openRequestFeatureUrl'; }
    static { this.AVAILABLE = !!product.requestFeatureUrl; }
    constructor() {
        super({
            id: OpenRequestFeatureUrlAction.ID,
            title: {
                ...localize2('openUserVoiceUrl', "Search Feature Requests"),
                mnemonicTitle: localize({ key: 'miUserVoice', comment: ['&& denotes a mnemonic'] }, "&&Search Feature Requests"),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '3_feedback',
                order: 2
            }
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        if (productService.requestFeatureUrl) {
            openerService.open(URI.parse(productService.requestFeatureUrl));
        }
    }
}
class OpenLicenseUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openLicenseUrl'; }
    static { this.AVAILABLE = !!(isWeb ? product.serverLicense : product.licenseUrl); }
    constructor() {
        super({
            id: OpenLicenseUrlAction.ID,
            title: {
                ...localize2('openLicenseUrl', "View License"),
                mnemonicTitle: localize({ key: 'miLicense', comment: ['&& denotes a mnemonic'] }, "View &&License"),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '4_legal',
                order: 1
            }
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        const url = isWeb ? productService.serverLicenseUrl : productService.licenseUrl;
        if (url) {
            if (language) {
                const queryArgChar = url.indexOf('?') > 0 ? '&' : '?';
                openerService.open(URI.parse(`${url}${queryArgChar}lang=${language}`));
            }
            else {
                openerService.open(URI.parse(url));
            }
        }
    }
}
class OpenPrivacyStatementUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openPrivacyStatementUrl'; }
    static { this.AVAILABE = !!product.privacyStatementUrl; }
    constructor() {
        super({
            id: OpenPrivacyStatementUrlAction.ID,
            title: {
                ...localize2('openPrivacyStatement', "Privacy Statement"),
                mnemonicTitle: localize({ key: 'miPrivacyStatement', comment: ['&& denotes a mnemonic'] }, "Privac&&y Statement"),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '4_legal',
                order: 2
            }
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        if (productService.privacyStatementUrl) {
            openerService.open(URI.parse(productService.privacyStatementUrl));
        }
    }
}
class GetStartedWithAccessibilityFeatures extends Action2 {
    static { this.ID = 'workbench.action.getStartedWithAccessibilityFeatures'; }
    constructor() {
        super({
            id: GetStartedWithAccessibilityFeatures.ID,
            title: localize2('getStartedWithAccessibilityFeatures', 'Get Started with Accessibility Features'),
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '1_welcome',
                order: 6
            }
        });
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        commandService.executeCommand('workbench.action.openWalkthrough', 'SetupAccessibility');
    }
}
class GetStartedWithCopilot extends Action2 {
    static { this.ID = 'workbench.action.getStartedWithCopilot'; }
    static { this.AVAILABE = !!product.defaultChatAgent?.documentationUrl; }
    constructor() {
        super({
            id: GetStartedWithCopilot.ID,
            title: localize2('getStartedWithCopilot', 'Get Started with Copilot'),
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '1_welcome',
                order: 7
            }
        });
    }
    run(accessor) {
        const openerService = accessor.get(IOpenerService);
        openerService.open(URI.parse(product.defaultChatAgent.documentationUrl));
    }
}
// --- Actions Registration
if (KeybindingsReferenceAction.AVAILABLE) {
    registerAction2(KeybindingsReferenceAction);
}
if (OpenIntroductoryVideosUrlAction.AVAILABLE) {
    registerAction2(OpenIntroductoryVideosUrlAction);
}
if (OpenTipsAndTricksUrlAction.AVAILABLE) {
    registerAction2(OpenTipsAndTricksUrlAction);
}
if (OpenDocumentationUrlAction.AVAILABLE) {
    registerAction2(OpenDocumentationUrlAction);
}
if (OpenNewsletterSignupUrlAction.AVAILABLE) {
    registerAction2(OpenNewsletterSignupUrlAction);
}
if (OpenYouTubeUrlAction.AVAILABLE) {
    registerAction2(OpenYouTubeUrlAction);
}
if (OpenRequestFeatureUrlAction.AVAILABLE) {
    registerAction2(OpenRequestFeatureUrlAction);
}
if (OpenLicenseUrlAction.AVAILABLE) {
    registerAction2(OpenLicenseUrlAction);
}
if (OpenPrivacyStatementUrlAction.AVAILABE) {
    registerAction2(OpenPrivacyStatementUrlAction);
}
registerAction2(GetStartedWithAccessibilityFeatures);
if (GetStartedWithCopilot.AVAILABE) {
    registerAction2(GetStartedWithCopilot);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9hY3Rpb25zL2hlbHBBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDdEQsT0FBTyxPQUFPLE1BQU0sNkNBQTZDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFHckYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUVoRixNQUFNLDBCQUEyQixTQUFRLE9BQU87YUFFL0IsT0FBRSxHQUFHLHVDQUF1QyxDQUFDO2FBQzdDLGNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFP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