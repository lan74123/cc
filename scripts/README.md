# Scripts

Node CLI helpers for content maintenance and the build pipeline.

## `create-content.js` — `bun run create`

Creates a new `works` or `research` entry folder, `src/content/<type>/<slug>/index.md`, with valid frontmatter. Put the photos in the same folder afterwards (`01.jpg`, `02.jpg`, …); the page shows them all in file-name order. Copying `src/content/works/_template/` by hand does the same job (see [CONTENT.md](../CONTENT.md)).

Interactive:

```sh
bun run create
```

The wizard asks for the collection, title, optional slug (defaults to the slugified title; it becomes the folder name and URL), tags, author (defaults to `CC Space`), description and the cover photo (defaults to `./01.jpg`), and for works the category, location, year and client, then previews the frontmatter before writing the file. It refuses to overwrite an existing folder.

Non-interactive:

```sh
bun run create -- --non-interactive --type works \
  --title "Sample Residence" \
  --category Home \
  --location Taipei --year 2026 --client "Private Client" \
  --description "Full-floor apartment renovation." \
  --image-src ./01.jpg \
  --image-alt "Living room"
```

Tags default to the category in lower case. Add `--dry-run` to preview without creating the file.

## `update-post.js` — `bun run update-post`

Updates frontmatter of an existing entry in place. `--file` is relative to `src/content`.

```sh
# Bump updatedDate to now
bun run update-post --file works/daliao/index.md --touch

# Change tags, preview first
bun run update-post --file works/daliao/index.md --tags "home,renovation" --dry-run

# Change the cover image
bun run update-post --file works/daliao/index.md \
  --image-src ./3.jpg \
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

## `fix-orientation.js` — `bun run fix-images`

Rewrites every JPEG under `src/assets/` that has a non-default EXIF Orientation so the pixels are upright and the tag is removed. Phone photos need this: the build's image service ignores the tag, so they would otherwise render rotated. Safe to run repeatedly.

## `check-links.js` — `bun run lint:links`

Checks the built site in `dist/`: every `href`, `src`, `srcset` and `poster` in the HTML pages, and every `url()` in CSS (files and inline `<style>`), must resolve to a built file or a `_redirects` source, and a `#fragment` must name an `id` on its page. External URLs are skipped. Exits 1 with the list of broken links. No dependencies; it replaced the `hyperlink` package.
