import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  { ignores: ["node_modules/", "docs/"] },
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
