/**
 * Shared logic for picking a random image from a data-attribute-driven
 * <img> element. Used by the tag index random images.
 *
 * Each element stores a JSON array of {src, srcset, alt} in
 * data-images. Client JS shuffles and picks one to display.
 */
import { shuffle } from "./utils.ts";

interface ImageData {
  src: string;
  srcset: string;
  alt: string;
}

export function initRandomImages(selector: string): void {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

  if (elements.length === 0) return;

  elements.forEach((element) => {
    try {
      const images: ImageData[] = JSON.parse(element.dataset.images ?? "[]");
      if (images.length === 0) return;

      const selected = shuffle(images)[0];
      if (!selected) return;

      const imgElement = element.querySelector<HTMLImageElement>("img");
      if (imgElement) {
        imgElement.src = selected.src;
        imgElement.srcset = selected.srcset;
        imgElement.alt = selected.alt;
        imgElement.classList.remove("hidden");
      }
    } catch (error) {
      console.error("Error processing random image data:", error);
    }
  });
}
