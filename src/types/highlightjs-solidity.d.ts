// highlightjs-solidity ships no types. Both exports are highlight.js
// LanguageFn factories, which is all lowlight's registry needs.
declare module "highlightjs-solidity" {
  import type { LanguageFn } from "highlight.js";
  export const solidity: LanguageFn;
  export const yul: LanguageFn;
}
