/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/


// register inline diffs
import './editCodeService.js'

// register Sidebar pane, state, actions (keybinds, menus) (Ctrl+L)
import './sidebarActions.js'
import './sidebarPane.js'

// register quick edit (Ctrl+K)
import './quickEditActions.js'


// register Autocomplete
import './autocompleteService.js'

// register Context services
// import './contextGatheringService.js'
// import './contextUserChangesService.js'

// settings pane
import './ainativeSettingsPane.js'

// Tool Logs / Model Browser / Usage Dashboard panels (command-triggered editor tabs)
import './ainativeReactPanels.js'

// register css
import './media/ainative.css'

// update (frontend part, also see platform/)
import './ainativeUpdateActions.js'

// Vibe Coder Mode (redesign phase 9): simplified, chat-first layout toggle
import './vibeCoderModeActions.js'

import './convertToLLMMessageWorkbenchContrib.js'

// Codebase-wide semantic retrieval (#160): initial workspace index + debounced per-file reindex
import './codeContextIndexContribution.js'

// Provision usable provider API keys after a Cloud sign-in (#184)
import './cloudBootstrapContribution.js'

// tools
import './toolsService.js'
import './terminalToolService.js'

// register Thread History
import './chatThreadService.js'

// ping
import './metricsPollService.js'

// helper services
import './helperServices/consistentItemService.js'

// register selection helper
import './ainativeSelectionHelperWidget.js'

// register tooltip service
import './tooltipService.js'

// register onboarding service
import './ainativeOnboardingService.js'

// register misc service
import './miscWokrbenchContrib.js'

// register file service (for explorer context menu)
import './fileService.js'

// register source control management
import './ainativeSCMService.js'

// register hooks (event-driven agent automation, #162)
import './hooksService.js'

// ---------- common (unclear if these actually need to be imported, because they're already imported wherever they're used) ----------

// llmMessage
import '../common/sendLLMMessageService.js'

// ainativeSettings
import '../common/ainativeSettingsService.js'

// refreshModel
import '../common/refreshModelService.js'

// metrics
import '../common/metricsService.js'

// updates
import '../common/ainativeUpdateService.js'

// model service
import '../common/ainativeModelService.js'

// agent memory service
import '../common/agentMemoryService.js'

// GitHub OAuth service
import '../common/githubOAuthService.js'

// GitHub OAuth URL handler
import './githubOAuthUrlHandler.js'

// Skills configuration service
import '../common/skills/skillsModule.js'

// AI Model Registry service
import '../common/aiModelRegistryService.js'

// AINative Cloud Authentication service
import '../common/ainativeCloudAuthService.js'

// Usage Tracking service
import '../common/usageTrackingService.js'

// AINative Auth service
import '../common/ainativeAuthService.js'

// AINative Cloud Auth UI and commands
import './ainativeAuthActions.js'
