#!/usr/bin/env node

/**
 * fix-orientation.js
 *
 * Phone cameras store photos sideways and rely on the EXIF Orientation tag
 * to display them upright. The build's image service does not apply that
 * tag, so such photos render rotated on the site. This script rewrites every
 * JPEG under src/assets/ that carries a non-default Orientation so the pixels
 * are upright and the tag is gone.
 *
 * Usage: bun run fix-images
 */

import { readdirSync, renameSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..", "src", "assets");

function findJpegs(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findJpegs(full));
    } else if (/\.jpe?g$/i.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

let fixed = 0;

for (const file of findJpegs(ROOT)) {
  const { orientation } = await sharp(file).metadata();
  if (!orientation || orientation === 1) continue;

  const tmp = `${file}.tmp`;
  // rotate() with no argument applies the EXIF orientation and drops the tag.
  await sharp(file)
    .rotate()
    .keepIccProfile()
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(tmp);
  renameSync(tmp, file);
  console.log(`fixed (orientation ${orientation}): ${file}`);
  fixed++;
}

console.log(fixed ? `Fixed ${fixed} image(s).` : "All images already upright.");
