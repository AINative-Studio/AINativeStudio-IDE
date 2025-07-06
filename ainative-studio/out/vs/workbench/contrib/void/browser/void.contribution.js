/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvdm9pZC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFHMUYsd0JBQXdCO0FBQ3hCLE9BQU8sc0JBQXNCLENBQUE7QUFFN0IsbUVBQW1FO0FBQ25FLE9BQU8scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxrQkFBa0IsQ0FBQTtBQUV6QiwrQkFBK0I7QUFDL0IsT0FBTyx1QkFBdUIsQ0FBQTtBQUc5Qix3QkFBd0I7QUFDeEIsT0FBTywwQkFBMEIsQ0FBQTtBQUVqQyw0QkFBNEI7QUFDNUIsd0NBQXdDO0FBQ3hDLDBDQUEwQztBQUUxQyxnQkFBZ0I7QUFDaEIsT0FBTyx1QkFBdUIsQ0FBQTtBQUU5QixlQUFlO0FBQ2YsT0FBTyxrQkFBa0IsQ0FBQTtBQUV6Qiw2Q0FBNkM7QUFDN0MsT0FBTyx3QkFBd0IsQ0FBQTtBQUUvQixPQUFPLDBDQUEwQyxDQUFBO0FBRWpELFFBQVE7QUFDUixPQUFPLG1CQUFtQixDQUFBO0FBQzFCLE9BQU8sMEJBQTBCLENBQUE7QUFFakMsMEJBQTBCO0FBQzFCLE9BQU8sd0JBQXdCLENBQUE7QUFFL0IsT0FBTztBQUNQLE9BQU8seUJBQXlCLENBQUE7QUFFaEMsa0JBQWtCO0FBQ2xCLE9BQU8sMkNBQTJDLENBQUE7QUFFbEQsNEJBQTRCO0FBQzVCLE9BQU8sZ0NBQWdDLENBQUE7QUFFdkMsMkJBQTJCO0FBQzNCLE9BQU8scUJBQXFCLENBQUE7QUFFNUIsOEJBQThCO0FBQzlCLE9BQU8sNEJBQTRCLENBQUE7QUFFbkMsd0JBQXdCO0FBQ3hCLE9BQU8sMkJBQTJCLENBQUE7QUFFbEMsb0RBQW9EO0FBQ3BELE9BQU8sa0JBQWtCLENBQUE7QUFFekIscUNBQXFDO0FBQ3JDLE9BQU8scUJBQXFCLENBQUE7QUFFNUIsdUlBQXVJO0FBRXZJLGFBQWE7QUFDYixPQUFPLG9DQUFvQyxDQUFBO0FBRTNDLGVBQWU7QUFDZixPQUFPLGtDQUFrQyxDQUFBO0FBRXpDLGVBQWU7QUFDZixPQUFPLGtDQUFrQyxDQUFBO0FBRXpDLFVBQVU7QUFDVixPQUFPLDZCQUE2QixDQUFBO0FBRXBDLFVBQVU7QUFDVixPQUFPLGdDQUFnQyxDQUFBO0FBRXZDLGdCQUFnQjtBQUNoQixPQUFPLCtCQUErQixDQUFBIn0=