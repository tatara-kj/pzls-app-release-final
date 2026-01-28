module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    // kluczowe: VSCode odpala ESLint z innego katalogu
    tsconfigRootDir: __dirname,
    sourceType: "module",
    ecmaVersion: "latest",

    // UWAGA: świadomie wyłączamy "project", żeby ESLint nie robił type-checkingu
    // (type-check i tak robi `tsc` w `npm run build`)
    // project: ["./tsconfig.json", "./tsconfig.dev.json"],
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
  ],
  ignorePatterns: ["lib/**", "node_modules/**"],
  rules: {
    quotes: ["error", "double"],
    indent: ["error", 2],
    "import/no-unresolved": "off",

    // te rzeczy w backendzie tylko przeszkadzają
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/ban-ts-comment": "off",
  },
};
