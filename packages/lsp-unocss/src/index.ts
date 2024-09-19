/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  MarkupKind,
  Range,
} from "vscode-languageserver/node.js";

import { TextDocument } from "vscode-languageserver-textdocument";
import {
  ctx,
  getComplete,
  resolveConfig,
  resolveCSS,
  resolveCSSByOffset,
} from "./resolve.js";

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const rootDir = params.workspaceFolders?.[0].name;
  if (rootDir) {
    resolveConfig(rootDir);
  }
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
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

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined,
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});

connection.onHover(async (params) => {
  const doc = documents.get(params.textDocument.uri);
  const content = doc?.getText();
  const cursor = doc?.offsetAt(params.position);
  if (content && cursor) {
    if (ctx.cache.has(content)) {
      return {
        contents: ctx.cache.get(content)!,
      };
    } else {
      const res = await resolveCSSByOffset(content, cursor);
      const css = res?.css;
      if (css) {
        await ctx.add(content, css);
        return {
          contents: ctx.cache.get(content)!,
        };
      }
    }
  }
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  async (
    _textDocumentPosition: TextDocumentPositionParams,
  ): Promise<CompletionItem[]> => {
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    await new Promise((resolve) => setTimeout(resolve, 500));
    const doc = documents.get(_textDocumentPosition.textDocument.uri);
    const content = doc?.getText();
    const cursor = doc?.offsetAt(_textDocumentPosition.position);
    if (content && cursor) {
      const result = await getComplete(content, cursor);
      if (!result) return [];
      const suggestions = result?.suggestions || [];
      return suggestions.map((item, i) => {
        const [label, value] = item;
        const resolved = result.resolveReplacement(value);
        return {
          label,
          kind: CompletionItemKind.EnumMember,
          data: i,
          textEdit: {
            newText: resolved.replacement,
            range: Range.create(
              doc!.positionAt(resolved.start),
              doc!.positionAt(resolved.end),
            ),
          },
        };
      });
    }
    return [];
  },
);

// This handler resolves additional information for the item selected in
// the completion list.

connection.onCompletionResolve(
  async (item: CompletionItem): Promise<CompletionItem> => {
    const result = await resolveCSS(item);
    const css = result.css;

    const _css = await ctx.getCss(css);

    item.documentation = {
      value: _css,
      kind: MarkupKind.Markdown,
    };
    return item;
  },
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
