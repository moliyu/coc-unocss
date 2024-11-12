import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  MarkupKind,
} from "vscode-languageserver/node.js";

import { TextDocument } from "vscode-languageserver-textdocument";
import {
  handleComplete,
  resolveConfig,
  resolveCSS,
  resolveCSSByOffset,
} from "./resolve.js";

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const rootDir = params.workspaceFolders?.[0].name;
  if (rootDir) {
    resolveConfig(rootDir);
  }
  const capabilities = params.capabilities;

  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
      documentHighlightProvider: false,
      hoverProvider: true,
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

connection.onHover(async (params) => {
  const doc = documents.get(params.textDocument.uri);
  const content = doc?.getText();
  const cursor = doc?.offsetAt(params.position);
  if (content && cursor) {
    const contents = await resolveCSSByOffset(content, cursor);
    if (contents) {
      return {
        contents,
      };
    }
  }
  return null;
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  async (
    _textDocumentPosition: TextDocumentPositionParams,
  ): Promise<CompletionItem[]> => {
    // await new Promise((resolve) => setTimeout(resolve, 500));

    const doc = documents.get(_textDocumentPosition.textDocument.uri);
    const content = doc?.getText();
    const cursor = doc?.offsetAt(_textDocumentPosition.position);
    if (content && cursor) {
      const result = await handleComplete(content, cursor);
      return result || [];
    }
    return [];
  },
);

connection.onCompletionResolve(
  async (item: CompletionItem): Promise<CompletionItem> => {
    const value = await resolveCSS(item);

    item.documentation = {
      value,
      kind: MarkupKind.Markdown,
    };
    return item;
  },
);

documents.listen(connection);

connection.listen();
