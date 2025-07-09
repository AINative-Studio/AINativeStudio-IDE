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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvYWN0aW9ucy9oZWxwQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3RELE9BQU8sT0FBTyxNQUFNLDZDQUE2QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0sa0NBQWtDLENBQUM7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBR3JGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFaEYsTUFBTSwwQkFBMkIsU0FBUSxPQUFPO2FBRS9CLE9BQUUsR0FBRyx1Q0FBdUMsQ0FBQzthQUM3QyxjQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FB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