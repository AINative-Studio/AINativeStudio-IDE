/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createProxyIdentifier } from '../../services/extensions/common/proxyIdentifier.js';
export var TextEditorRevealType;
(function (TextEditorRevealType) {
    TextEditorRevealType[TextEditorRevealType["Default"] = 0] = "Default";
    TextEditorRevealType[TextEditorRevealType["InCenter"] = 1] = "InCenter";
    TextEditorRevealType[TextEditorRevealType["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
    TextEditorRevealType[TextEditorRevealType["AtTop"] = 3] = "AtTop";
})(TextEditorRevealType || (TextEditorRevealType = {}));
//#region --- tabs model
export var TabInputKind;
(function (TabInputKind) {
    TabInputKind[TabInputKind["UnknownInput"] = 0] = "UnknownInput";
    TabInputKind[TabInputKind["TextInput"] = 1] = "TextInput";
    TabInputKind[TabInputKind["TextDiffInput"] = 2] = "TextDiffInput";
    TabInputKind[TabInputKind["TextMergeInput"] = 3] = "TextMergeInput";
    TabInputKind[TabInputKind["NotebookInput"] = 4] = "NotebookInput";
    TabInputKind[TabInputKind["NotebookDiffInput"] = 5] = "NotebookDiffInput";
    TabInputKind[TabInputKind["CustomEditorInput"] = 6] = "CustomEditorInput";
    TabInputKind[TabInputKind["WebviewEditorInput"] = 7] = "WebviewEditorInput";
    TabInputKind[TabInputKind["TerminalEditorInput"] = 8] = "TerminalEditorInput";
    TabInputKind[TabInputKind["InteractiveEditorInput"] = 9] = "InteractiveEditorInput";
    TabInputKind[TabInputKind["ChatEditorInput"] = 10] = "ChatEditorInput";
    TabInputKind[TabInputKind["MultiDiffEditorInput"] = 11] = "MultiDiffEditorInput";
})(TabInputKind || (TabInputKind = {}));
export var TabModelOperationKind;
(function (TabModelOperationKind) {
    TabModelOperationKind[TabModelOperationKind["TAB_OPEN"] = 0] = "TAB_OPEN";
    TabModelOperationKind[TabModelOperationKind["TAB_CLOSE"] = 1] = "TAB_CLOSE";
    TabModelOperationKind[TabModelOperationKind["TAB_UPDATE"] = 2] = "TAB_UPDATE";
    TabModelOperationKind[TabModelOperationKind["TAB_MOVE"] = 3] = "TAB_MOVE";
})(TabModelOperationKind || (TabModelOperationKind = {}));
export var WebviewEditorCapabilities;
(function (WebviewEditorCapabilities) {
    WebviewEditorCapabilities[WebviewEditorCapabilities["Editable"] = 0] = "Editable";
    WebviewEditorCapabilities[WebviewEditorCapabilities["SupportsHotExit"] = 1] = "SupportsHotExit";
})(WebviewEditorCapabilities || (WebviewEditorCapabilities = {}));
export var WebviewMessageArrayBufferViewType;
(function (WebviewMessageArrayBufferViewType) {
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Int8Array"] = 1] = "Int8Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Uint8Array"] = 2] = "Uint8Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Uint8ClampedArray"] = 3] = "Uint8ClampedArray";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Int16Array"] = 4] = "Int16Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Uint16Array"] = 5] = "Uint16Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Int32Array"] = 6] = "Int32Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Uint32Array"] = 7] = "Uint32Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Float32Array"] = 8] = "Float32Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["Float64Array"] = 9] = "Float64Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["BigInt64Array"] = 10] = "BigInt64Array";
    WebviewMessageArrayBufferViewType[WebviewMessageArrayBufferViewType["BigUint64Array"] = 11] = "BigUint64Array";
})(WebviewMessageArrayBufferViewType || (WebviewMessageArrayBufferViewType = {}));
export var CellOutputKind;
(function (CellOutputKind) {
    CellOutputKind[CellOutputKind["Text"] = 1] = "Text";
    CellOutputKind[CellOutputKind["Error"] = 2] = "Error";
    CellOutputKind[CellOutputKind["Rich"] = 3] = "Rich";
})(CellOutputKind || (CellOutputKind = {}));
export var NotebookEditorRevealType;
(function (NotebookEditorRevealType) {
    NotebookEditorRevealType[NotebookEditorRevealType["Default"] = 0] = "Default";
    NotebookEditorRevealType[NotebookEditorRevealType["InCenter"] = 1] = "InCenter";
    NotebookEditorRevealType[NotebookEditorRevealType["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
    NotebookEditorRevealType[NotebookEditorRevealType["AtTop"] = 3] = "AtTop";
})(NotebookEditorRevealType || (NotebookEditorRevealType = {}));
export var CandidatePortSource;
(function (CandidatePortSource) {
    CandidatePortSource[CandidatePortSource["None"] = 0] = "None";
    CandidatePortSource[CandidatePortSource["Process"] = 1] = "Process";
    CandidatePortSource[CandidatePortSource["Output"] = 2] = "Output";
    CandidatePortSource[CandidatePortSource["Hybrid"] = 3] = "Hybrid";
})(CandidatePortSource || (CandidatePortSource = {}));
export class IdObject {
    static { this._n = 0; }
    static mixin(object) {
        object._id = IdObject._n++;
        return object;
    }
}
export var ISuggestDataDtoField;
(function (ISuggestDataDtoField) {
    ISuggestDataDtoField["label"] = "a";
    ISuggestDataDtoField["kind"] = "b";
    ISuggestDataDtoField["detail"] = "c";
    ISuggestDataDtoField["documentation"] = "d";
    ISuggestDataDtoField["sortText"] = "e";
    ISuggestDataDtoField["filterText"] = "f";
    ISuggestDataDtoField["preselect"] = "g";
    ISuggestDataDtoField["insertText"] = "h";
    ISuggestDataDtoField["insertTextRules"] = "i";
    ISuggestDataDtoField["range"] = "j";
    ISuggestDataDtoField["commitCharacters"] = "k";
    ISuggestDataDtoField["additionalTextEdits"] = "l";
    ISuggestDataDtoField["kindModifier"] = "m";
    ISuggestDataDtoField["commandIdent"] = "n";
    ISuggestDataDtoField["commandId"] = "o";
    ISuggestDataDtoField["commandArguments"] = "p";
})(ISuggestDataDtoField || (ISuggestDataDtoField = {}));
export var ISuggestResultDtoField;
(function (ISuggestResultDtoField) {
    ISuggestResultDtoField["defaultRanges"] = "a";
    ISuggestResultDtoField["completions"] = "b";
    ISuggestResultDtoField["isIncomplete"] = "c";
    ISuggestResultDtoField["duration"] = "d";
})(ISuggestResultDtoField || (ISuggestResultDtoField = {}));
/**
 * Represents a collection of {@link CompletionItem completion items} to be presented
 * in the editor.
 */
export class TerminalCompletionListDto {
    /**
     * Creates a new completion list.
     *
     * @param items The completion items.
     * @param isIncomplete The list is not complete.
     */
    constructor(items, resourceRequestConfig) {
        this.items = items ?? [];
        this.resourceRequestConfig = resourceRequestConfig;
    }
}
export var ExtHostTestingResource;
(function (ExtHostTestingResource) {
    ExtHostTestingResource[ExtHostTestingResource["Workspace"] = 0] = "Workspace";
    ExtHostTestingResource[ExtHostTestingResource["TextDocument"] = 1] = "TextDocument";
})(ExtHostTestingResource || (ExtHostTestingResource = {}));
// --- proxy identifiers
export const MainContext = {
    MainThreadAuthentication: createProxyIdentifier('MainThreadAuthentication'),
    MainThreadBulkEdits: createProxyIdentifier('MainThreadBulkEdits'),
    MainThreadLanguageModels: createProxyIdentifier('MainThreadLanguageModels'),
    MainThreadEmbeddings: createProxyIdentifier('MainThreadEmbeddings'),
    MainThreadChatAgents2: createProxyIdentifier('MainThreadChatAgents2'),
    MainThreadCodeMapper: createProxyIdentifier('MainThreadCodeMapper'),
    MainThreadLanguageModelTools: createProxyIdentifier('MainThreadChatSkills'),
    MainThreadClipboard: createProxyIdentifier('MainThreadClipboard'),
    MainThreadCommands: createProxyIdentifier('MainThreadCommands'),
    MainThreadComments: createProxyIdentifier('MainThreadComments'),
    MainThreadConfiguration: createProxyIdentifier('MainThreadConfiguration'),
    MainThreadConsole: createProxyIdentifier('MainThreadConsole'),
    MainThreadDebugService: createProxyIdentifier('MainThreadDebugService'),
    MainThreadDecorations: createProxyIdentifier('MainThreadDecorations'),
    MainThreadDiagnostics: createProxyIdentifier('MainThreadDiagnostics'),
    MainThreadDialogs: createProxyIdentifier('MainThreadDiaglogs'),
    MainThreadDocuments: createProxyIdentifier('MainThreadDocuments'),
    MainThreadDocumentContentProviders: createProxyIdentifier('MainThreadDocumentContentProviders'),
    MainThreadTextEditors: createProxyIdentifier('MainThreadTextEditors'),
    MainThreadEditorInsets: createProxyIdentifier('MainThreadEditorInsets'),
    MainThreadEditorTabs: createProxyIdentifier('MainThreadEditorTabs'),
    MainThreadErrors: createProxyIdentifier('MainThreadErrors'),
    MainThreadTreeViews: createProxyIdentifier('MainThreadTreeViews'),
    MainThreadDownloadService: createProxyIdentifier('MainThreadDownloadService'),
    MainThreadLanguageFeatures: createProxyIdentifier('MainThreadLanguageFeatures'),
    MainThreadLanguages: createProxyIdentifier('MainThreadLanguages'),
    MainThreadLogger: createProxyIdentifier('MainThreadLogger'),
    MainThreadMessageService: createProxyIdentifier('MainThreadMessageService'),
    MainThreadOutputService: createProxyIdentifier('MainThreadOutputService'),
    MainThreadProgress: createProxyIdentifier('MainThreadProgress'),
    MainThreadQuickDiff: createProxyIdentifier('MainThreadQuickDiff'),
    MainThreadQuickOpen: createProxyIdentifier('MainThreadQuickOpen'),
    MainThreadStatusBar: createProxyIdentifier('MainThreadStatusBar'),
    MainThreadSecretState: createProxyIdentifier('MainThreadSecretState'),
    MainThreadStorage: createProxyIdentifier('MainThreadStorage'),
    MainThreadSpeech: createProxyIdentifier('MainThreadSpeechProvider'),
    MainThreadTelemetry: createProxyIdentifier('MainThreadTelemetry'),
    MainThreadTerminalService: createProxyIdentifier('MainThreadTerminalService'),
    MainThreadTerminalShellIntegration: createProxyIdentifier('MainThreadTerminalShellIntegration'),
    MainThreadWebviews: createProxyIdentifier('MainThreadWebviews'),
    MainThreadWebviewPanels: createProxyIdentifier('MainThreadWebviewPanels'),
    MainThreadWebviewViews: createProxyIdentifier('MainThreadWebviewViews'),
    MainThreadCustomEditors: createProxyIdentifier('MainThreadCustomEditors'),
    MainThreadUrls: createProxyIdentifier('MainThreadUrls'),
    MainThreadUriOpeners: createProxyIdentifier('MainThreadUriOpeners'),
    MainThreadProfileContentHandlers: createProxyIdentifier('MainThreadProfileContentHandlers'),
    MainThreadWorkspace: createProxyIdentifier('MainThreadWorkspace'),
    MainThreadFileSystem: createProxyIdentifier('MainThreadFileSystem'),
    MainThreadFileSystemEventService: createProxyIdentifier('MainThreadFileSystemEventService'),
    MainThreadExtensionService: createProxyIdentifier('MainThreadExtensionService'),
    MainThreadSCM: createProxyIdentifier('MainThreadSCM'),
    MainThreadSearch: createProxyIdentifier('MainThreadSearch'),
    MainThreadShare: createProxyIdentifier('MainThreadShare'),
    MainThreadTask: createProxyIdentifier('MainThreadTask'),
    MainThreadWindow: createProxyIdentifier('MainThreadWindow'),
    MainThreadLabelService: createProxyIdentifier('MainThreadLabelService'),
    MainThreadNotebook: createProxyIdentifier('MainThreadNotebook'),
    MainThreadNotebookDocuments: createProxyIdentifier('MainThreadNotebookDocumentsShape'),
    MainThreadNotebookEditors: createProxyIdentifier('MainThreadNotebookEditorsShape'),
    MainThreadNotebookKernels: createProxyIdentifier('MainThreadNotebookKernels'),
    MainThreadNotebookRenderers: createProxyIdentifier('MainThreadNotebookRenderers'),
    MainThreadInteractive: createProxyIdentifier('MainThreadInteractive'),
    MainThreadTheming: createProxyIdentifier('MainThreadTheming'),
    MainThreadTunnelService: createProxyIdentifier('MainThreadTunnelService'),
    MainThreadManagedSockets: createProxyIdentifier('MainThreadManagedSockets'),
    MainThreadTimeline: createProxyIdentifier('MainThreadTimeline'),
    MainThreadTesting: createProxyIdentifier('MainThreadTesting'),
    MainThreadLocalization: createProxyIdentifier('MainThreadLocalizationShape'),
    MainThreadMcp: createProxyIdentifier('MainThreadMcpShape'),
    MainThreadAiRelatedInformation: createProxyIdentifier('MainThreadAiRelatedInformation'),
    MainThreadAiEmbeddingVector: createProxyIdentifier('MainThreadAiEmbeddingVector'),
    MainThreadChatStatus: createProxyIdentifier('MainThreadChatStatus'),
};
export const ExtHostContext = {
    ExtHostCodeMapper: createProxyIdentifier('ExtHostCodeMapper'),
    ExtHostCommands: createProxyIdentifier('ExtHostCommands'),
    ExtHostConfiguration: createProxyIdentifier('ExtHostConfiguration'),
    ExtHostDiagnostics: createProxyIdentifier('ExtHostDiagnostics'),
    ExtHostDebugService: createProxyIdentifier('ExtHostDebugService'),
    ExtHostDecorations: createProxyIdentifier('ExtHostDecorations'),
    ExtHostDocumentsAndEditors: createProxyIdentifier('ExtHostDocumentsAndEditors'),
    ExtHostDocuments: createProxyIdentifier('ExtHostDocuments'),
    ExtHostDocumentContentProviders: createProxyIdentifier('ExtHostDocumentContentProviders'),
    ExtHostDocumentSaveParticipant: createProxyIdentifier('ExtHostDocumentSaveParticipant'),
    ExtHostEditors: createProxyIdentifier('ExtHostEditors'),
    ExtHostTreeViews: createProxyIdentifier('ExtHostTreeViews'),
    ExtHostFileSystem: createProxyIdentifier('ExtHostFileSystem'),
    ExtHostFileSystemInfo: createProxyIdentifier('ExtHostFileSystemInfo'),
    ExtHostFileSystemEventService: createProxyIdentifier('ExtHostFileSystemEventService'),
    ExtHostLanguages: createProxyIdentifier('ExtHostLanguages'),
    ExtHostLanguageFeatures: createProxyIdentifier('ExtHostLanguageFeatures'),
    ExtHostQuickOpen: createProxyIdentifier('ExtHostQuickOpen'),
    ExtHostQuickDiff: createProxyIdentifier('ExtHostQuickDiff'),
    ExtHostStatusBar: createProxyIdentifier('ExtHostStatusBar'),
    ExtHostShare: createProxyIdentifier('ExtHostShare'),
    ExtHostExtensionService: createProxyIdentifier('ExtHostExtensionService'),
    ExtHostLogLevelServiceShape: createProxyIdentifier('ExtHostLogLevelServiceShape'),
    ExtHostTerminalService: createProxyIdentifier('ExtHostTerminalService'),
    ExtHostTerminalShellIntegration: createProxyIdentifier('ExtHostTerminalShellIntegration'),
    ExtHostSCM: createProxyIdentifier('ExtHostSCM'),
    ExtHostSearch: createProxyIdentifier('ExtHostSearch'),
    ExtHostTask: createProxyIdentifier('ExtHostTask'),
    ExtHostWorkspace: createProxyIdentifier('ExtHostWorkspace'),
    ExtHostWindow: createProxyIdentifier('ExtHostWindow'),
    ExtHostWebviews: createProxyIdentifier('ExtHostWebviews'),
    ExtHostWebviewPanels: createProxyIdentifier('ExtHostWebviewPanels'),
    ExtHostCustomEditors: createProxyIdentifier('ExtHostCustomEditors'),
    ExtHostWebviewViews: createProxyIdentifier('ExtHostWebviewViews'),
    ExtHostEditorInsets: createProxyIdentifier('ExtHostEditorInsets'),
    ExtHostEditorTabs: createProxyIdentifier('ExtHostEditorTabs'),
    ExtHostProgress: createProxyIdentifier('ExtHostProgress'),
    ExtHostComments: createProxyIdentifier('ExtHostComments'),
    ExtHostSecretState: createProxyIdentifier('ExtHostSecretState'),
    ExtHostStorage: createProxyIdentifier('ExtHostStorage'),
    ExtHostUrls: createProxyIdentifier('ExtHostUrls'),
    ExtHostUriOpeners: createProxyIdentifier('ExtHostUriOpeners'),
    ExtHostProfileContentHandlers: createProxyIdentifier('ExtHostProfileContentHandlers'),
    ExtHostOutputService: createProxyIdentifier('ExtHostOutputService'),
    ExtHostLabelService: createProxyIdentifier('ExtHostLabelService'),
    ExtHostNotebook: createProxyIdentifier('ExtHostNotebook'),
    ExtHostNotebookDocuments: createProxyIdentifier('ExtHostNotebookDocuments'),
    ExtHostNotebookEditors: createProxyIdentifier('ExtHostNotebookEditors'),
    ExtHostNotebookKernels: createProxyIdentifier('ExtHostNotebookKernels'),
    ExtHostNotebookRenderers: createProxyIdentifier('ExtHostNotebookRenderers'),
    ExtHostNotebookDocumentSaveParticipant: createProxyIdentifier('ExtHostNotebookDocumentSaveParticipant'),
    ExtHostInteractive: createProxyIdentifier('ExtHostInteractive'),
    ExtHostChatAgents2: createProxyIdentifier('ExtHostChatAgents'),
    ExtHostLanguageModelTools: createProxyIdentifier('ExtHostChatSkills'),
    ExtHostChatProvider: createProxyIdentifier('ExtHostChatProvider'),
    ExtHostSpeech: createProxyIdentifier('ExtHostSpeech'),
    ExtHostEmbeddings: createProxyIdentifier('ExtHostEmbeddings'),
    ExtHostAiRelatedInformation: createProxyIdentifier('ExtHostAiRelatedInformation'),
    ExtHostAiEmbeddingVector: createProxyIdentifier('ExtHostAiEmbeddingVector'),
    ExtHostTheming: createProxyIdentifier('ExtHostTheming'),
    ExtHostTunnelService: createProxyIdentifier('ExtHostTunnelService'),
    ExtHostManagedSockets: createProxyIdentifier('ExtHostManagedSockets'),
    ExtHostAuthentication: createProxyIdentifier('ExtHostAuthentication'),
    ExtHostTimeline: createProxyIdentifier('ExtHostTimeline'),
    ExtHostTesting: createProxyIdentifier('ExtHostTesting'),
    ExtHostTelemetry: createProxyIdentifier('ExtHostTelemetry'),
    ExtHostLocalization: createProxyIdentifier('ExtHostLocalization'),
    ExtHostMcp: createProxyIdentifier('ExtHostMcp'),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC5wcm90b2NvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0LnByb3RvY29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBOEVoRyxPQUFPLEVBQW9ELHFCQUFxQixFQUFFLE1BQU0scURBQXFELENBQUM7QUF1TDlJLE1BQU0sQ0FBTixJQUFZLG9CQUtYO0FBTEQsV0FBWSxvQkFBb0I7SUFDL0IscUVBQVcsQ0FBQTtJQUNYLHVFQUFZLENBQUE7SUFDWix5R0FBNkIsQ0FBQTtJQUM3QixpRUFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUxXLG9CQUFvQixLQUFwQixvQkFBb0IsUUFLL0I7QUEwZEQsd0JBQXdCO0FBRXhCLE1BQU0sQ0FBTixJQUFrQixZQWFqQjtBQWJELFdBQWtCLFlBQVk7SUFDN0IsK0RBQVksQ0FBQTtJQUNaLHlEQUFTLENBQUE7SUFDVCxpRUFBYSxDQUFBO0lBQ2IsbUVBQWMsQ0FBQTtJQUNkLGlFQUFhLENBQUE7SUFDYix5RUFBaUIsQ0FBQTtJQUNqQix5RUFBaUIsQ0FBQTtJQUNqQiwyRUFBa0IsQ0FBQTtJQUNsQiw2RUFBbUIsQ0FBQTtJQUNuQixtRkFBc0IsQ0FBQTtJQUN0QixzRUFBZSxDQUFBO0lBQ2YsZ0ZBQW9CLENBQUE7QUFDckIsQ0FBQyxFQWJpQixZQUFZLEtBQVosWUFBWSxRQWE3QjtBQUVELE1BQU0sQ0FBTixJQUFrQixxQkFLakI7QUFMRCxXQUFrQixxQkFBcUI7SUFDdEMseUVBQVEsQ0FBQTtJQUNSLDJFQUFTLENBQUE7SUFDVCw2RUFBVSxDQUFBO0lBQ1YseUVBQVEsQ0FBQTtBQUNULENBQUMsRUFMaUIscUJBQXFCLEtBQXJCLHFCQUFxQixRQUt0QztBQWlJRCxNQUFNLENBQU4sSUFBWSx5QkFHWDtBQUhE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