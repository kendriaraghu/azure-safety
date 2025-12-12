import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const errors = [];

function checkFile(filePath, checks) {
  const fullPath = path.join(rootDir, filePath);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  const content = fs.readFileSync(fullPath, "utf-8");

  checks.forEach(({ name, pattern, message }) => {
    if (pattern.test(content)) {
      errors.push(`${filePath}: ${message} (${name})`);
    }
  });
}

function checkDirectory(dirPath, checks, extensions = [".ts", ".tsx", ".js", ".jsx"]) {
  const fullPath = path.join(rootDir, dirPath);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  const files = fs.readdirSync(fullPath, { recursive: true });
  files.forEach((file) => {
    const filePath = path.join(fullPath, file);
    if (fs.statSync(filePath).isFile()) {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        checkFile(path.relative(rootDir, filePath), checks);
      }
    }
  });
}

// Check for SSR/ISR/Edge/API Route violations
const staticViolations = [
  {
    name: "getServerSideProps",
    pattern: /getServerSideProps/,
    message: "Found getServerSideProps (SSR not allowed)",
  },
  {
    name: "getStaticProps",
    pattern: /getStaticProps/,
    message: "Found getStaticProps (ISR not allowed)",
  },
  {
    name: "route.ts",
    pattern: /route\.ts/,
    message: "Found route.ts (API Route not allowed)",
  },
  {
    name: "route.js",
    pattern: /route\.js/,
    message: "Found route.js (API Route not allowed)",
  },
  {
    name: "next/headers",
    pattern: /from ['"]next\/headers['"]/,
    message: "Found next/headers import (server-only)",
  },
  {
    name: "cookies()",
    pattern: /cookies\(\)/,
    message: "Found cookies() usage (server-only)",
  },
  {
    name: "server-only",
    pattern: /['"]server-only['"]/,
    message: "Found server-only import",
  },
  {
    name: "force-dynamic",
    pattern: /force-dynamic/,
    message: "Found force-dynamic (dynamic rendering not allowed)",
  },
];

// Check app directory
checkDirectory("app", staticViolations);

// Check for dynamic routes without generateStaticParams
const appDir = path.join(rootDir, "app");
if (fs.existsSync(appDir)) {
  const files = fs.readdirSync(appDir, { recursive: true });
  files.forEach((file) => {
    if (file.includes("[") && file.includes("]")) {
      // Dynamic route detected
      const dirPath = path.dirname(file);
      const pageFile = path.join(appDir, dirPath, "page.tsx");
      const paramsFile = path.join(appDir, dirPath, "generateStaticParams.ts");
      
      if (fs.existsSync(pageFile) && !fs.existsSync(paramsFile)) {
        const content = fs.readFileSync(pageFile, "utf-8");
        if (!content.includes("generateStaticParams")) {
          errors.push(
            `app/${dirPath}/page.tsx: Dynamic route without generateStaticParams`
          );
        }
      }
    }
  });
}

// Check next.config.ts
checkFile("next.config.ts", [
  {
    name: "output-export",
    pattern: /output\s*:\s*['"]export['"]/,
    message: "Missing output: 'export'",
    invert: true,
  },
]);

// Report results
if (errors.length > 0) {
  console.error("\n❌ Static export check failed:\n");
  errors.forEach((error) => console.error(`  - ${error}`));
  console.error("\n");
  process.exit(1);
} else {
  console.log("✅ Static export check passed!");
}

