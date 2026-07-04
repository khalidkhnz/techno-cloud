import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/dist-lambda/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/*.mjs",
      "**/*.config.ts",
      "**/drizzle/**",
      "apps/web/**", // Next.js app has its own lint (next lint)
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      "no-console": "off",
      "require-yield": "off", // async-generator stubs that throw (superseded by LogsService)
      "no-empty": ["error", { allowEmptyCatch: true }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
