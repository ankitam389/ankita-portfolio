import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  { ignores: ["node_modules/", "design_docs/"] },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
  },
  pluginJs.configs.recommended,
];
