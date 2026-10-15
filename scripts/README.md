# Scripts

Node CLI helpers for content maintenance and the build pipeline.

## `create-content.js` — `bun run create`

Creates a new `works` or `research` entry at `src/content/<type>/YYYY-MM-DD-<slug>.mdx` with valid frontmatter.

Interactive:

```sh
bun run create
```

The wizard asks for the collection, title, optional slug (defaults to the slugified title), tags, author (defaults to `CC Space`), description and an optional cover image, then previews the frontmatter before writing the file.

Non-interactive:

```sh
bun run create -- --non-interactive --type works \
  --title "Sample Residence" \
  --tags "home" \
  --description "Full-floor apartment renovation." \
  --image-src "../../assets/works/sample-residence/1.jpg" \
  --image-alt "Living room"
```

Add `--dry-run` to preview without creating the file.

The wizard does not prompt for the works-only fields `location`, `year`, `client` and `category`; add them to the frontmatter by hand (see `src/content.config.ts`). For a local image, use a path relative to the content file (for example `../../assets/works/<slug>/1.jpg`) so it is optimized at build time.

## `update-post.js` — `bun run update-post`

Updates frontmatter of an existing entry in place. `--file` is relative to `src/content`.

```sh
# Bump updatedDate to now
bun run update-post --file works/2026-09-14-daliao.mdx --touch

# Change tags, preview first
bun run update-post --file works/2026-09-14-daliao.mdx --tags "home,renovation" --dry-run

# Change the cover image
bun run update-post --file works/2026-09-14-daliao.mdx \
  --image-src "../../assets/works/daliao/3.jpg" \
  --image-alt "Daliao 3"
```

| Option                    | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `--file <path>`           | File path relative to `src/content` (required) |
| `--title <title>`         | Update the title                               |
| `--description <desc>`    | Update the description                         |
| `--tags <tags>`           | Update tags (comma-separated)                  |
| `--author <name>`         | Update the author                              |
| `--pub-date <date>`       | Update publication date (ISO format)           |
| `--updated-date <date>`   | Set updated date (ISO format)                  |
| `--touch`                 | Set updated date to now                        |
| `--remove-updated-date`   | Remove the updated date                        |
| `--image-src <src>`       | Update image source                            |
| `--image-alt <text>`      | Update image alt text                          |
| `--image-positionx <pos>` | Update image X position                        |
| `--image-positiony <pos>` | Update image Y position                        |
| `--dry-run`               | Preview without writing                        |

Existing frontmatter formatting (flow-style `{ ... }` or block-style) is preserved.

## `parser.js`

```sh
node scripts/parser.js
```

Checks that the collections the CLI scripts know about (`works`, `research`) match the ones defined in `src/content.config.ts`. Run it after adding or renaming a collection.

## `sync-readme-versions.js`

Runs automatically as the `prebuild` step. Reads dependency versions from `package.json` and updates version badges and "Astro vX.Y.Z" strings in every `.md` file.

## `capture-routes.sh`

```sh
bun run build && scripts/capture-routes.sh routes.txt
```

Writes every emitted `.html` / `.xml` path in `dist/` to a file, so two captures can be diffed to see which URLs were added or dropped by a change.
