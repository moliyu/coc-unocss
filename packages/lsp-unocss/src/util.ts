import { toArray, UnoGenerator } from "@unocss/core";
import parserCSS from "prettier/parser-postcss";
import prettier from "prettier/standalone";

const remUnitRE = /(-?[\d.]+)rem(\s+!important)?;/;

export async function getPrettiedCSS(
  uno: UnoGenerator,
  util: string | string[],
  remToPxRatio: number,
) {
  const result = await uno.generate(new Set(toArray(util)), {
    preflights: false,
    safelist: false,
  });
  const css = addRemToPxComment(result.css, remToPxRatio);
  const prettified = await prettier.format(css, {
    parser: "css",
    plugins: [parserCSS],
  });

  return {
    ...result,
    prettified,
  };
}

/**
 * Credit to [@voorjaar](https://github.com/voorjaar)
 *
 * @see https://github.com/windicss/windicss-intellisense/issues/13
 * @param str
 */
export function addRemToPxComment(str?: string, remToPixel = 16) {
  if (!str) return "";
  if (remToPixel < 1) return str;
  let index = 0;
  const output: string[] = [];

  while (index < str.length) {
    const rem = str.slice(index).match(remUnitRE);
    if (!rem || !rem.index) break;
    const px = ` /* ${Number.parseFloat(rem[1]) * remToPixel}px */`;
    const end = index + rem.index + rem[0].length;

    output.push(str.slice(index, end));
    output.push(px);
    index = end;
  }
  output.push(str.slice(index));
  return output.join("");
}

export async function getPrettiedMarkdown(
  uno: UnoGenerator,
  util: string | string[],
  remToPxRatio: number,
) {
  return `\`\`\`css\n${(await getPrettiedCSS(uno, util, remToPxRatio)).prettified}\n\`\`\``;
}
