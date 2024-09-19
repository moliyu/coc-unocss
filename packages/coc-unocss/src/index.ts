/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from "path";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  ExtensionContext,
  Thenable,
} from "coc.nvim";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join("node_modules", "@moliyu/lsp-unocss", "bin", "index.js"),
  );

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [
      "erb",
      "haml",
      "hbs",
      "html",
      "css",
      "postcss",
      "javascript",
      "javascriptreact",
      "markdown",
      "ejs",
      "php",
      "svelte",
      "typescript",
      "typescriptreact",
      "vue-html",
      "vue",
      "sass",
      "scss",
      "less",
      "stylus",
      "astro",
      "rust",
    ],
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "lsp-unocss",
    "lsp unocss",
    serverOptions,
    clientOptions,
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
