import { createGenerator } from "@unocss/core";
import {
  createAutocomplete,
  searchAttrKey,
  searchUsageBoundary,
} from "@unocss/autocomplete";
import preserUno from "@unocss/preset-uno";
import { loadConfig } from "@unocss/config";
import { sourcePluginFactory, sourceObjectFields } from "unconfig/presets";
import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { getPrettiedMarkdown } from "./util.js";

const defaultConfig = {
  presets: [preserUno()],
  separators: [],
};

const generator = createGenerator({}, defaultConfig);
let autocomplete = createAutocomplete(generator);
let isAttributify = false;

export function resolveConfig(roorDir: string) {
  return loadConfig(process.cwd(), roorDir, [
    sourcePluginFactory({
      files: ["vite.config", "svelte.config", "iles.config"],
      targetModule: "unocss/vite",
      parameters: [{ command: "serve", mode: "development" }],
    }),
    sourcePluginFactory({
      files: ["astro.config"],
      targetModule: "unocss/astro",
    }),
    sourceObjectFields({
      files: "nuxt.config",
      fields: "unocss",
    }),
  ]).then((result) => {
    generator.setConfig(result.config, defaultConfig);
    autocomplete = createAutocomplete(generator, { matchType: "prefix" });
    isAttributify = generator.config.presets.some(
      (i) => i.name == "@unocss/preset-attributify",
    );
    return generator.config;
  });
}

export function resolveCSS(item: CompletionItem) {
  return getPrettiedMarkdown(generator, item.label, 16);
}

export function getComplete(content: string, cursor: number) {
  return autocomplete.suggestInFile(content, cursor);
}

export async function resolveCSSByOffset(content: string, cursor: number) {
  let cls = searchUsageBoundary(content, cursor)?.content;
  if (cls) {
    if (isAttributify) {
      const attrKey = searchAttrKey(content, cursor);
      if (attrKey && !["class", "className"].includes(attrKey)) {
        cls = `${attrKey}-${cls}`;
      }
    }
    const prettierd = await getPrettiedMarkdown(generator, cls, 16);
    return prettierd;
  }
}

export async function handleComplete(content: string, cursor: number) {
  const result = await autocomplete.suggestInFile(content, cursor);

  if (!result) return [];
  const suggestions = result?.suggestions || [];
  return suggestions.map((item, i) => {
    const [value] = item;
    const { replacement } = result.resolveReplacement(value);
    return {
      label: value,
      kind: CompletionItemKind.EnumMember,
      data: i,
      insertText: replacement,
    } as CompletionItem;
  });
}
