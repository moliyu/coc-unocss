import { createGenerator } from "@unocss/core";
import { createAutocomplete, searchUsageBoundary } from "@unocss/autocomplete";
import preserUno from "@unocss/preset-uno";
import { loadConfig } from "@unocss/config";
import { sourcePluginFactory, sourceObjectFields } from "unconfig/presets";
import { CompletionItem } from "vscode-languageserver";
import prettier from "prettier/standalone";
import parserCss from "prettier/parser-postcss";

class Cache {
  cache: Map<string, string> = new Map();
  cssMap: Map<string, string> = new Map();
  async add(key: string, css: string) {
    if (!this.cache.has(key)) {
      const _css = await this.getCss(css);
      this.cache.set(key, `\n\`\`\`css\n${_css.trim()}\n\`\`\``);
    }
  }
  async getCss(css: string) {
    if (!this.cssMap.has(css)) {
      const _css = await prettier.format(css, {
        parser: "css",
        plugins: [parserCss],
      });
      this.cssMap.set(css, _css);
    }
    return this.cssMap.get(css)!;
  }
}

export const ctx = new Cache();

const defaultConfig = {
  presets: [preserUno()],
  separators: [],
};

const generator = createGenerator({}, defaultConfig);
let autocomplete = createAutocomplete(generator);

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
    autocomplete = createAutocomplete(generator);
    return generator.config;
  });
}

export function resolveCSS(item: CompletionItem) {
  return generator.generate(item.label, {
    preflights: false,
    safelist: false,
  });
}

// export const documentColor = async (content: string, id: string) => {
//   const pos = await getMatchedPositionsFromCode(generator, content, id)
//   const ret = (await Promise.all(pos.map(async p => {
//     const [start, end, text] = p;
//     const css = (await generator.generate(text, {
//       preflights: false,
//       safelist: false,
//     })).css
//     console.log(css)
//
//     const color = getColorString(css)
//     if (color) {
//       return {
//         range: {start, end},
//         color
//       }
//     } else {
//       return
//     }
//   }))).filter(p => !!p)
//   return ret
// }

export function getComplete(content: string, cursor: number) {
  return autocomplete.suggestInFile(content, cursor);
}

export function resolveCSSByOffset(content: string, cursor: number) {
  const cls = searchUsageBoundary(content, cursor)?.content;
  if (cls) {
    return generator.generate(cls, {
      preflights: false,
      safelist: false,
    });
  }
}
