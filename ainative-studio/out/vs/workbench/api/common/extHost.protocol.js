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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC5wcm90b2NvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3QucHJvdG9jb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUE4RWhHLE9BQU8sRUFBb0QscUJBQXFCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQXVMOUksTUFBTSxDQUFOLElBQVksb0JBS1g7QUFMRCxXQUFZLG9CQUFvQjtJQUMvQixxRUFBVyxDQUFBO0lBQ1gsdUVBQVksQ0FBQTtJQUNaLHlHQUE2QixDQUFBO0lBQzdCLGlFQUFTLENBQUE7QUFDVixDQUFDLEVBTFcsb0JBQW9CLEtBQXBCLG9CQUFvQixRQUsvQjtBQTBkRCx3QkFBd0I7QUFFeEIsTUFBTSxDQUFOLElBQWtCLFlBYWpCO0FBYkQsV0FBa0IsWUFBWTtJQUM3QiwrREFBWSxDQUFBO0lBQ1oseURBQVMsQ0FBQTtJQUNULGlFQUFhLENBQUE7SUFDYixtRUFBYyxDQUFBO0lBQ2QsaUVBQWEsQ0FBQTtJQUNiLHlFQUFpQixDQUFBO0lBQ2pCLHlFQUFpQixDQUFBO0lBQ2pCLDJFQUFrQixDQUFBO0lBQ2xCLDZFQUFtQixDQUFBO0lBQ25CLG1GQUFzQixDQUFBO0lBQ3RCLHNFQUFlLENBQUE7SUFDZixnRkFBb0IsQ0FBQTtBQUNyQixDQUFDLEVBYmlCLFlBQVksS0FBWixZQUFZLFFBYTdCO0FBRUQsTUFBTSxDQUFOLElBQWtCLHFCQUtqQjtBQUxELFdBQWtCLHFCQUFxQjtJQUN0Qyx5RUFBUSxDQUFBO0lBQ1IsMkVBQVMsQ0FBQTtJQUNULDZFQUFVLENBQUE7SUFDVix5RUFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUxpQixxQkFBcUIsS0FBckIscUJBQXFCLFFBS3RDO0FBaUlELE1BQU0sQ0FBTixJQUFZLHlCQUdYO0FBSEQs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