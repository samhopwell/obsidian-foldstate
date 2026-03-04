export default {
  // Only type-check when src files are staged; tsc needs the whole project so ignore file args
  "src/**/*.ts": () => "tsc -p tsconfig.json --noEmit --skipLibCheck",
  // Run tests when test files change
  "tests/**/*.ts": () => "npm test",
};
