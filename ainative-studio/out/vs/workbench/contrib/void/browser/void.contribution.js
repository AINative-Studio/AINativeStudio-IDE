/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
// register inline diffs
import './editCodeService.js';
// register Sidebar pane, state, actions (keybinds, menus) (Ctrl+L)
import './sidebarActions.js';
import './sidebarPane.js';
// register quick edit (Ctrl+K)
import './quickEditActions.js';
// register Autocomplete
import './autocompleteService.js';
// register Context services
// import './contextGatheringService.js'
// import './contextUserChangesService.js'
// settings pane
import './voidSettingsPane.js';
// register css
import './media/void.css';
// update (frontend part, also see platform/)
import './voidUpdateActions.js';
import './convertToLLMMessageWorkbenchContrib.js';
// tools
import './toolsService.js';
import './terminalToolService.js';
// register Thread History
import './chatThreadService.js';
// ping
import './metricsPollService.js';
// helper services
import './helperServices/consistentItemService.js';
// register selection helper
import './voidSelectionHelperWidget.js';
// register tooltip service
import './tooltipService.js';
// register onboarding service
import './voidOnboardingService.js';
// register misc service
import './miscWokrbenchContrib.js';
// register file service (for explorer context menu)
import './fileService.js';
// register source control management
import './voidSCMService.js';
// ---------- common (unclear if these actually need to be imported, because they're already imported wherever they're used) ----------
// llmMessage
import '../common/sendLLMMessageService.js';
// voidSettings
import '../common/voidSettingsService.js';
// refreshModel
import '../common/refreshModelService.js';
// metrics
import '../common/metricsService.js';
// updates
import '../common/voidUpdateService.js';
// model service
import '../common/voidModelService.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3ZvaWQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBRzFGLHdCQUF3QjtBQUN4QixPQUFPLHNCQUFzQixDQUFBO0FBRTdCLG1FQUFtRTtBQUNuRSxPQUFPLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sa0JBQWtCLENBQUE7QUFFekIsK0JBQStCO0FBQy9CLE9BQU8sdUJBQXVCLENBQUE7QUFHOUIsd0JBQXdCO0FBQ3hCLE9BQU8sMEJBQTBCLENBQUE7QUFFakMsNEJBQTRCO0FBQzVCLHdDQUF3QztBQUN4QywwQ0FBMEM7QUFFMUMsZ0JBQWdCO0FBQ2hCLE9BQU8sdUJBQXVCLENBQUE7QUFFOUIsZUFBZTtBQUNmLE9BQU8sa0JBQWtCLENBQUE7QUFFekIsNkNBQTZDO0FBQzdDLE9BQU8sd0JBQXdCLENBQUE7QUFFL0IsT0FBTywwQ0FBMEMsQ0FBQTtBQUVqRCxRQUFRO0FBQ1IsT0FBTyxtQkFBbUIsQ0FBQTtBQUMxQixPQUFPLDBCQUEwQixDQUFBO0FBRWpDLDBCQUEwQjtBQUMxQixPQUFPLHdCQUF3QixDQUFBO0FBRS9CLE9BQU87QUFDUCxPQUFPLHlCQUF5QixDQUFBO0FBRWhDLGtCQUFrQjtBQUNsQixPQUFPLDJDQUEyQyxDQUFBO0FBRWxELDRCQUE0QjtBQUM1QixPQUFPLGdDQUFnQyxDQUFBO0FBRXZDLDJCQUEyQjtBQUMzQixPQUFPLHFCQUFxQixDQUFBO0FBRTVCLDhCQUE4QjtBQUM5QixPQUFPLDRCQUE0QixDQUFBO0FBRW5DLHdCQUF3QjtBQUN4QixPQUFPLDJCQUEyQixDQUFBO0FBRWxDLG9EQUFvRDtBQUNwRCxPQUFPLGtCQUFrQixDQUFBO0FBRXpCLHFDQUFxQztBQUNyQyxPQUFPLHFCQUFxQixDQUFBO0FBRTVCLHVJQUF1STtBQUV2SSxhQUFhO0FBQ2IsT0FBTyxvQ0FBb0MsQ0FBQTtBQUUzQyxlQUFlO0FBQ2YsT0FBTyxrQ0FBa0MsQ0FBQTtBQUV6QyxlQUFlO0FBQ2YsT0FBTyxrQ0FBa0MsQ0FBQTtBQUV6QyxVQUFVO0FBQ1YsT0FBTyw2QkFBNkIsQ0FBQTtBQUVwQyxVQUFVO0FBQ1YsT0FBTyxnQ0FBZ0MsQ0FBQTtBQUV2QyxnQkFBZ0I7QUFDaEIsT0FBTywrQkFBK0IsQ0FBQSJ9