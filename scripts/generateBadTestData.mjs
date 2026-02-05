/**
 * Script to generate "bad" test data for label verification testing
 * 
 * Defect Types:
 * 1. "Government Warning" text is not bold and not all uppercase
 * 2. Government warning text uses wrong wording/phrases
 * 3. Poor image quality (blurry/unreadable)
 * 
 * For types 1 & 2, we overlay modified text on the image
 * For type 3, we apply heavy blur to degrade quality
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DATA_DIR = path.join(__dirname, '..', 'test data');

// Application assignments for defect types
const assignments = {
  beer: {
    'Forte Masso beer': 3 // Type 3: poor quality
  },
  wine: {
    'Cascade Val wine': 1,      // Type 1: not bold/uppercase
    'Fete Rose wine': 2,        // Type 2: wrong wording
    'Lenz Moser wine': 3,       // Type 3: poor quality
    'Rosso Veneto wine': 1      // Type 1: not bold/uppercase
  },
  spirits: {
    'Angels Envy burbon': 1,
    'Barenjager': 2,
    'Black Maple Hill whiskey': 3,
    'Den of Thieves chocolate whiskey': 1,
    'Dutch Courage gin': 2,
    'Fuel moonshine': 3,
    'Hanami gin': 1,
    'Jacques Cardin cognac': 2,
    'Market Alley gin': 3,
    'McKenzie Brew House vodka': 1,
    'Misunderstood ginger whiskey': 2,
    'Nicks & Bruce aged rum': 3,
    'Presidential Dram whiskey': 1,
    'Sailor Jerry rum': 2,
    'Seven Fathoms rum': 3,
    'Stoll & Wolfe whiskey': 1,
    'White Label whiskey': 2,
    'Woodford Reserve burbon': 3
  }
};

/**
 * Type 3: Apply heavy blur to make image unreadable
 */
async function applyPoorQuality(inputPath, outputPath) {
  await sharp(inputPath)
    .blur(8)           // Heavy Gaussian blur
    .modulate({
      brightness: 0.7, // Darken
      saturation: 0.5  // Reduce color
    })
    .jpeg({ quality: 15 }) // Very low quality compression
    .toFile(outputPath);
}

/**
 * Type 1 & 2: Create SVG overlay with bad warning text
 * Type 1: lowercase/non-bold "government warning"
 * Type 2: completely wrong wording
 */
async function applyBadWarningOverlay(inputPath, outputPath, defectType) {
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  
  const width = metadata.width || 800;
  const height = metadata.height || 600;
  
  // Calculate overlay dimensions (positioned at bottom)
  const overlayWidth = Math.floor(width * 0.9);
  const overlayHeight = Math.floor(height * 0.15);
  const fontSize = Math.floor(overlayHeight * 0.15);
  const headerSize = Math.floor(overlayHeight * 0.2);
  
  let headerText, warningText;
  
  if (defectType === 1) {
    // Type 1: Not bold, not uppercase
    headerText = 'government warning';
    warningText = `(1) According to the Surgeon General, women should not drink
alcoholic beverages during pregnancy because of the risk of birth defects.
(2) Consumption of alcoholic beverages impairs your ability to drive
a car or operate machinery, and may cause health problems.`;
  } else {
    // Type 2: Wrong wording entirely
    headerText = 'HEALTH NOTICE';
    warningText = `(1) Drinking alcohol may be harmful to your health.
Please drink responsibly and in moderation.
(2) Do not drink and drive. Alcohol affects coordination
and reaction time. Enjoy our products safely.`;
  }
  
  // Create SVG overlay
  const svgOverlay = `
    <svg width="${overlayWidth}" height="${overlayHeight}">
      <rect x="0" y="0" width="${overlayWidth}" height="${overlayHeight}" 
            fill="white" fill-opacity="0.95" rx="5"/>
      <text x="${overlayWidth/2}" y="${headerSize + 5}" 
            font-family="Arial, sans-serif" 
            font-size="${headerSize}px" 
            font-weight="${defectType === 1 ? 'normal' : 'bold'}"
            fill="black" text-anchor="middle">
        ${headerText}
      </text>
      <text x="15" y="${headerSize + fontSize + 15}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}px" 
            fill="black">
        ${warningText.split('\n').map((line, i) => 
          `<tspan x="15" dy="${i === 0 ? 0 : fontSize + 3}">${line.trim()}</tspan>`
        ).join('')}
      </text>
    </svg>
  `;
  
  await sharp(inputPath)
    .composite([{
      input: Buffer.from(svgOverlay),
      top: Math.floor(height - overlayHeight - 20),
      left: Math.floor((width - overlayWidth) / 2)
    }])
    .toFile(outputPath);
}

/**
 * Get base application name from filename
 */
function getApplicationName(filename) {
  // Remove extension and common suffixes like "front", "back", "other", "front2"
  return filename
    .replace(/\.(jpg|jpeg|png)$/i, '')
    .replace(/\s+(front\d*|back|other)$/i, '')
    .replace(/\s+\((front|back)\)$/i, '')
    .trim();
}

/**
 * Process a category folder
 */
async function processCategory(category, categoryAssignments) {
  const goodDir = path.join(TEST_DATA_DIR, `good ${category}`);
  const badDir = path.join(TEST_DATA_DIR, `bad ${category}`);
  
  if (!fs.existsSync(goodDir)) {
    console.log(`Skipping ${category}: source folder not found`);
    return;
  }
  
  const files = fs.readdirSync(goodDir).filter(f => 
    /\.(jpg|jpeg|png)$/i.test(f) && !f.startsWith('.')
  );
  
  console.log(`\nProcessing ${category} (${files.length} files)...`);
  
  for (const file of files) {
    const appName = getApplicationName(file);
    const defectType = categoryAssignments[appName];
    
    if (!defectType) {
      console.log(`  ⚠ No assignment for "${appName}" (${file})`);
      continue;
    }
    
    const inputPath = path.join(goodDir, file);
    const outputPath = path.join(badDir, file);
    
    try {
      if (defectType === 3) {
        await applyPoorQuality(inputPath, outputPath);
        console.log(`  ✓ ${file} → Type 3 (poor quality)`);
      } else {
        await applyBadWarningOverlay(inputPath, outputPath, defectType);
        console.log(`  ✓ ${file} → Type ${defectType} (bad warning text)`);
      }
    } catch (err) {
      console.error(`  ✗ Error processing ${file}:`, err.message);
    }
  }
}

async function main() {
  console.log('Generating bad test data for label verification...\n');
  console.log('Defect Types:');
  console.log('  1: "Government Warning" not bold/uppercase');
  console.log('  2: Wrong warning text/wording');
  console.log('  3: Poor image quality (blurry)');
  
  await processCategory('beer', assignments.beer);
  await processCategory('wine', assignments.wine);
  await processCategory('spirits', assignments.spirits);
  
  console.log('\n✅ Done! Bad test data generated.');
}

main().catch(console.error);
