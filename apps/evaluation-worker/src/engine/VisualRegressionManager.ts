import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface VisualDiffResult {
  matches: boolean;
  score: number;        // 0 to 100 representing identical pixels
  diffPercentage: number;
  diffBuffer: Buffer;   // The heatmap image buffer to upload
}

export class VisualRegressionManager {
  private threshold = 0.1;

  /**
   * Compares two PNG image buffers and generates a visual diff heatmap.
   * Calculates a score based strictly on percentage of mismatched pixels.
   */
  public async compareScreenshots(
    expectedBuffer: Buffer,
    actualBuffer: Buffer
  ): Promise<VisualDiffResult> {
    
    // Parse the raw buffers into PNGJS instances
    const imgExpected = PNG.sync.read(expectedBuffer);
    const imgActual = PNG.sync.read(actualBuffer);

    const { width, height } = imgExpected;

    // Optional: Safety check if dimensions don't match exactly.
    // In a robust system, you might want to crop/pad actual to expected dimensions first.
    if (imgActual.width !== width || imgActual.height !== height) {
      console.warn(`[VisualDiff] Dimension mismatch: Expected ${width}x${height}, Actual ${imgActual.width}x${imgActual.height}`);
    }

    // Create a new empty PNG to hold the diff heatmap
    const diff = new PNG({ width, height });

    // Execute MapBox's pixelmatch
    const mismatchedPixels = pixelmatch(
      imgExpected.data,
      imgActual.data,
      diff.data,
      width,
      height,
      {
        threshold: this.threshold,
        includeAA: true,         // Attempt to ignore anti-aliasing edge drift
        alpha: 0.5,              // Transparency of the original image background
        aaColor: [255, 255, 0],  // Anti-aliased pixels shown as yellow
        diffColor: [255, 0, 0]   // Genuine differences shown as bright red
      }
    );

    const totalPixels = width * height;
    const diffPercentage = (mismatchedPixels / totalPixels) * 100;

    // Apply strict bracket routing logic to convert raw pixel % to a grading score (0-100)
    let score = 0;
    if (diffPercentage <= 1.0) {
      score = 100; // Almost perfect, ignore <1% noise
    } else if (diffPercentage <= 3.0) {
      score = 80;  // Minor structural changes
    } else if (diffPercentage <= 6.0) {
      score = 50;  // Moderate breakage
    } else {
      score = 0;   // Complete failure / entirely wrong page
    }

    // Pack the heatmap back into a raw binary Buffer for S3 upload
    const diffBuffer = PNG.sync.write(diff);

    return {
      matches: score === 100,
      score,
      diffPercentage,
      diffBuffer
    };
  }
}
