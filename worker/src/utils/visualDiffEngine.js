const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

/**
 * Generates a heatmap diff between two identically sized images.
 * @returns {numDiffPixels, diffPercentage}
 */
async function generateVisualDiff(expectedPath, actualPath, diffPath) {
  if (!fs.existsSync(expectedPath) || !fs.existsSync(actualPath)) {
    throw new Error('Image paths do not exist for computing diff');
  }

  const img1 = PNG.sync.read(fs.readFileSync(expectedPath));
  const img2 = PNG.sync.read(fs.readFileSync(actualPath));
  
  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    img1.data, 
    img2.data, 
    diff.data, 
    width, 
    height, 
    { threshold: 0.1 } // Anti-aliasing threshold
  );

  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  const diffPercentage = (numDiffPixels / totalPixels) * 100;

  // Generate Bounding Boxes (Hotspots) for high diff density
  const hotspots = [];
  const gridSize = 50; // 50x50 pixel grid resolution
  
  for (let y = 0; y < height; y += gridSize) {
    for (let x = 0; x < width; x += gridSize) {
      let diffCount = 0;
      for (let gy = y; gy < Math.min(y + gridSize, height); gy++) {
        for (let gx = x; gx < Math.min(x + gridSize, width); gx++) {
          const idx = (width * gy + gx) * 4;
          // Pixelmatch uses red (255, 0, 0) for differences by default
          if (diff.data[idx] === 255 && diff.data[idx+1] === 0 && diff.data[idx+2] === 0) {
            diffCount++;
          }
        }
      }
      
      // If a cell has > 2% diff density, mark it as a hotspot box
      if (diffCount > (gridSize * gridSize * 0.02)) {
        // Merge with existing hotspots if overlapping or adjacent (simplified: just cluster heavily)
        hotspots.push({
          x,
          y,
          width: Math.min(gridSize, width - x),
          height: Math.min(gridSize, height - y)
        });
      }
    }
  }

  // Simple bounding box merging (Combine overlapping/adjacent boxes)
  const mergedHotspots = [];
  for (const box of hotspots) {
    let merged = false;
    for (const m of mergedHotspots) {
      if (
        box.x <= m.x + m.width + 10 && box.x + box.width + 10 >= m.x &&
        box.y <= m.y + m.height + 10 && box.y + box.height + 10 >= m.y
      ) {
        // Extend m to contain box
        const newX = Math.min(m.x, box.x);
        const newY = Math.min(m.y, box.y);
        const newRight = Math.max(m.x + m.width, box.x + box.width);
        const newBottom = Math.max(m.y + m.height, box.y + box.height);
        m.x = newX;
        m.y = newY;
        m.width = newRight - newX;
        m.height = newBottom - newY;
        merged = true;
        break;
      }
    }
    if (!merged) {
      mergedHotspots.push({ ...box });
    }
  }

  return { numDiffPixels, diffPercentage, hotspots: mergedHotspots };
}

module.exports = { generateVisualDiff };
