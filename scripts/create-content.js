#!/usr/bin/env node

/**
 * Revista Content Creator CLI
 *
 * Creates a new entry folder, src/content/<type>/<slug>/index.md, with
 * frontmatter matching the schema defined in content.config.ts. Photos
 * go in the same folder (01.jpg, 02.jpg, ...); the page shows them all
 * in file-name order.
 *
 * Supports both interactive (inquirer prompts) and non-interactive
 * (all values via CLI flags) modes.
 */

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --------------- Paths ---------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const contentDir = path.join(rootDir, "src", "content");

// --------------- Collection schemas ---------------
// Mirrors content.config.ts — update here when the schema changes.

const COLLECTION_TYPES = ["works", "research"];

const BASE_REQUIRED = ["title", "tags", "author", "description", "pubDate"];
const BASE_OPTIONAL = ["updatedDate", "image"];
const IMAGE_PROPS = [
  { name: "src", isOptional: false, default: "./01.jpg" },
  { name: "alt", isOptional: false },
  { name: "positionx", isOptional: true },
  { name: "positiony", isOptional: true },
];
// Works-only details shown on the project page (all optional).
const CATEGORIES = ["Home", "Commerce"];
const DETAIL_FIELDS = ["location", "year", "client"];

// --------------- Helpers ---------------

/** Convert a title into a URL-friendly slug. */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build the frontmatter string for a new content file.
 *
 * This is the single source of truth for frontmatter formatting so that
 * interactive and non-interactive modes produce identical output.
 */
function buildFrontmatter({
  title,
  pubDate,
  tags,
  author,
  description,
  image,
  category,
  details = {},
}) {
  const lines = [];

  lines.push(`title: "${title}"`);
  lines.push(`pubDate: "${pubDate}"`);
  if (category) lines.push(`category: ${category}`);

  // tags — double-quoted, inline array: ["tag1", "tag2"]
  const tagsStr = tags.map((t) => `"${t}"`).join(", ");
  lines.push(`tags: [${tagsStr}]`);

  for (const field of DETAIL_FIELDS) {
    if (details[field]) lines.push(`${field}: "${details[field]}"`);
  }

  if (author && author !== "CC Space") lines.push(`author: "${author}"`);

  // image (optional) — one property per line under `image:`
  if (image) {
    lines.push("image:");
    for (const [k, v] of Object.entries(image)) {
      if (v) lines.push(`  ${k}: "${v}"`); // skip empty optional props
    }
  }

  lines.push(`description: "${description}"`);

  return lines.join("\n");
}

/**
 * Write the content file to disk (shared by both modes).
 * Returns the absolute file path written to (or that would be written to).
 */
function writeContentFile({
  collectionType,
  slug,
  pubDate,
  frontmatter,
  dryRun,
}) {
  // One folder per entry; the folder name is the URL slug.
  const filename = path.join(collectionType, slug, "index.md");
  const filePath = path.join(contentDir, filename);
  if (!dryRun && fs.existsSync(path.dirname(filePath))) {
    console.error(
      chalk.red(`Error: ${path.dirname(filePath)} already exists.`),
    );
    process.exit(1);
  }

  // Preview
  console.log(chalk.yellow("\nContent Preview:"));
  console.log(chalk.gray("---"));
  console.log(chalk.cyan(frontmatter));
  console.log(chalk.gray("---"));
  console.log(chalk.gray("Enter your content here.\n"));

  if (dryRun) {
    console.log(chalk.yellow("Dry run - no file created."));
    console.log(chalk.gray(`Would create file: ${chalk.cyan(filePath)}`));
    return filePath;
  }

  return { filePath, filename };
}

function showNextSteps(filename) {
  console.log(chalk.blue("\nNext steps:"));
  console.log(
    `  1. Put the photos in ${chalk.cyan(path.dirname(filename))} as 01.jpg, 02.jpg, ...`,
  );
  console.log(`  2. ${chalk.cyan(`Edit ${filename}`)} to add your content`);
  console.log(`  3. Run ${chalk.cyan("bun run dev")} to preview your changes`);
  console.log(`  4. Run ${chalk.cyan("bun run build")} when ready to publish`);
}

// --------------- CLI setup ---------------

const program = new Command();

program
  .name("create-content")
  .description(
    chalk.blue(
      "CLI to create content files for CC Space with proper frontmatter",
    ),
  )
  .version("1.0.0")
  .option("-t, --type <type>", `content type (${COLLECTION_TYPES.join(", ")})`)
  .option("-d, --dry-run", "preview frontmatter without creating the file")
  .option(
    "--non-interactive",
    "run in non-interactive mode with provided options",
  )
  .option("--title <title>", "title for the content")
  .option("--slug <slug>", "custom slug (defaults to slugified title)")
  .option("--tags <tags>", "comma-separated tags")
  .option("--author <author>", "author name")
  .option("--description <description>", "content description")
  .option("--category <category>", `works category (${CATEGORIES.join(", ")})`)
  .option("--location <location>", "works location, e.g. Kaohsiung")
  .option("--year <year>", "works year, e.g. 2026")
  .option("--client <client>", "works client, e.g. Private Client")
  .option("--image-src <src>", "cover photo, e.g. ./01.jpg")
  .option("--image-alt <alt>", "image alt text")
  .option("--image-positionx <pos>", "image X position (e.g. 50%)")
  .option("--image-positiony <pos>", "image Y position (e.g. 40%)")
  .option("--pub-date <date>", "publication date in ISO format")
  .parse(process.argv);

const options = program.opts();

// --------------- Non-interactive mode ---------------

function handleNonInteractive() {
  if (!options.type || !options.title || !options.description) {
    console.error(
      chalk.red(
        "Error: In non-interactive mode, --type, --title, and --description are required",
      ),
    );
    process.exit(1);
  }

  const collectionType = options.type;
  if (!COLLECTION_TYPES.includes(collectionType)) {
    console.error(
      chalk.red(`Error: Unknown collection type '${collectionType}'.`),
    );
    console.log(
      chalk.yellow(`Available types: ${COLLECTION_TYPES.join(", ")}`),
    );
    process.exit(1);
  }

  console.log(
    chalk.green(
      `\nCreating new ${chalk.bold(collectionType)} content (non-interactive)\n`,
    ),
  );

  const slug = options.slug || slugify(options.title);
  const pubDate = options.pubDate || new Date().toISOString();
  const tags = options.tags
    ? options.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : options.category
      ? [options.category.toLowerCase()]
      : [];
  const author = options.author || "CC Space";

  let image;
  if (options.imageSrc && options.imageAlt) {
    image = { src: options.imageSrc, alt: options.imageAlt };
    if (options.imagePositionx) image.positionx = options.imagePositionx;
    if (options.imagePositiony) image.positiony = options.imagePositiony;
  }

  if (options.category && !CATEGORIES.includes(options.category)) {
    console.error(
      chalk.red(`Error: --category must be one of ${CATEGORIES.join(", ")}.`),
    );
    process.exit(1);
  }

  const frontmatter = buildFrontmatter({
    title: options.title,
    pubDate,
    tags,
    author,
    description: options.description,
    image,
    category: options.category,
    details: {
      location: options.location,
      year: options.year,
      client: options.client,
    },
  });

  const result = writeContentFile({
    collectionType,
    slug,
    pubDate,
    frontmatter,
    dryRun: options.dryRun,
  });

  if (options.dryRun) return;

  const { filePath, filename } = result;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fileContent = `---\n${frontmatter}\n---\n\nEnter your content here.\n`;
  fs.writeFileSync(filePath, fileContent);
  console.log(chalk.green(`\n✅ File created: ${chalk.cyan(filePath)}`));
  showNextSteps(filename);
}

// --------------- Interactive mode ---------------

async function handleInteractive() {
  // Pick collection type
  let collectionType = options.type;
  if (!collectionType) {
    const resp = await inquirer.prompt([
      {
        type: "list",
        name: "collectionType",
        message: "Select content type:",
        choices: COLLECTION_TYPES,
      },
    ]);
    collectionType = resp.collectionType;
  }

  if (!COLLECTION_TYPES.includes(collectionType)) {
    console.error(
      chalk.red(`Error: Unknown collection type '${collectionType}'.`),
    );
    console.log(
      chalk.yellow(`Available types: ${COLLECTION_TYPES.join(", ")}`),
    );
    process.exit(1);
  }

  console.log(
    chalk.green(`\nCreating new ${chalk.bold(collectionType)} content\n`),
  );

  // Build the prompt questions
  const questions = [
    {
      type: "input",
      name: "title",
      message: `${chalk.cyan("Title:")}`,
      validate: (v) => (v ? true : "Title is required"),
    },
    {
      type: "input",
      name: "slug",
      message: `${chalk.cyan("Slug")} ${chalk.gray("(leave blank to auto-generate from title)")}:`,
      default: "",
    },
    {
      type: "input",
      name: "tags",
      message: `${chalk.cyan("Tags")} ${chalk.gray("(comma-separated, e.g. home)")}:`,
      default: collectionType === "works" ? "home" : "",
      filter: (v) =>
        v
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
    },
    {
      type: "input",
      name: "author",
      message: `${chalk.cyan("Author:")}`,
      default: "CC Space",
    },
    {
      type: "input",
      name: "description",
      message: `${chalk.cyan("Description:")}`,
      validate: (v) => (v ? true : "Description is required"),
    },
    {
      type: "confirm",
      name: "includeImage",
      message: "Include a cover photo?",
      default: true,
    },
  ];

  // Image sub-questions. Plain names (imageSrc, not image.src): inquirer
  // reads a dotted name as a nested answer.
  const imageKey = (name) => `image${name[0].toUpperCase()}${name.slice(1)}`;
  for (const prop of IMAGE_PROPS) {
    questions.push({
      type: "input",
      name: imageKey(prop.name),
      message: `${chalk.cyan(`Cover ${prop.name}:`)}${prop.isOptional ? chalk.gray(" (optional)") : ""}`,
      default: prop.default,
      when: (answers) => answers.includeImage,
      validate: (v) => {
        if (!prop.isOptional && !v) return `Cover ${prop.name} is required`;
        return true;
      },
    });
  }

  // Works only: the facts shown under the project title.
  if (collectionType === "works") {
    questions.push({
      type: "list",
      name: "category",
      message: `${chalk.cyan("Category:")}`,
      choices: CATEGORIES,
    });
    for (const field of DETAIL_FIELDS) {
      questions.push({
        type: "input",
        name: field,
        message: `${chalk.cyan(`${field[0].toUpperCase()}${field.slice(1)}:`)}${chalk.gray(" (optional)")}`,
        default: field === "year" ? String(new Date().getFullYear()) : "",
      });
    }
  }

  const answers = await inquirer.prompt(questions);

  const slug = answers.slug || slugify(answers.title);
  const pubDate = new Date().toISOString();

  // Collect image props
  let image;
  if (answers.includeImage) {
    image = {};
    for (const prop of IMAGE_PROPS) {
      const value = answers[imageKey(prop.name)];
      if (value) image[prop.name] = value;
    }
  }

  const frontmatter = buildFrontmatter({
    title: answers.title,
    pubDate,
    tags: answers.tags,
    author: answers.author,
    description: answers.description,
    image,
    category: answers.category,
    details: Object.fromEntries(DETAIL_FIELDS.map((f) => [f, answers[f]])),
  });

  const result = writeContentFile({
    collectionType,
    slug,
    pubDate,
    frontmatter,
    dryRun: options.dryRun,
  });

  if (options.dryRun) return;

  const { filePath, filename } = result;

  // Confirm before writing
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `Create file at ${chalk.cyan(filePath)}?`,
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow("File creation cancelled."));
    return;
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fileContent = `---\n${frontmatter}\n---\n\nEnter your content here.\n`;
  fs.writeFileSync(filePath, fileContent);
  console.log(chalk.green(`\n✅ File created: ${chalk.cyan(filePath)}`));
  showNextSteps(filename);
}

// --------------- Main ---------------

async function main() {
  try {
    console.log(chalk.blue.bold("🌟 Revista Content Creator 🌟"));
    console.log(chalk.gray("Creates content files with proper frontmatter\n"));

    if (options.nonInteractive) {
      handleNonInteractive();
    } else {
      await handleInteractive();
    }
  } catch (error) {
    console.error(chalk.red("\nError:"), error);
    process.exit(1);
  }
}

main();
