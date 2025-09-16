const fs = require("fs");
const path = require("path");

const sourcePath = path.join(__dirname, "..", "menu.js");
const outputDir = path.join(__dirname, "..", "dist");
const outputPath = path.join(outputDir, "menu.js");

function build() {
  fs.mkdirSync(outputDir, { recursive: true });
  const banner = `// Built on ${new Date().toISOString()}\n`;
  const content = fs.readFileSync(sourcePath, "utf8");
  fs.writeFileSync(outputPath, `${banner}${content}`);
  console.log(`menu.js copied to ${path.relative(process.cwd(), outputPath)}`);
}

build();
