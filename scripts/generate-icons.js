/**
 * PWA Icon Generator Script
 *
 * This script generates all required PWA icon sizes from a source SVG.
 * Run with: node scripts/generate-icons.js
 *
 * Prerequisites: npm install sharp
 */

import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

async function generateIcons() {
  const inputSvg = join(__dirname, '../public/favicon.svg')
  const outputDir = join(__dirname, '../public/icons')

  // Create icons directory if it doesn't exist
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }

  console.log('Generating PWA icons...')

  for (const size of sizes) {
    const outputPath = join(outputDir, `icon-${size}x${size}.png`)

    try {
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath)

      console.log(`✓ Generated icon-${size}x${size}.png`)
    } catch (error) {
      console.error(`✗ Failed to generate icon-${size}x${size}.png:`, error.message)
    }
  }

  // Also generate apple touch icon
  const appleTouchIconPath = join(__dirname, '../public/apple-touch-icon.png')
  try {
    await sharp(inputSvg)
      .resize(180, 180)
      .png()
      .toFile(appleTouchIconPath)
    console.log('✓ Generated apple-touch-icon.png')
  } catch (error) {
    console.error('✗ Failed to generate apple-touch-icon.png:', error.message)
  }

  console.log('\nDone! Icons generated in public/icons/')
}

generateIcons().catch(console.error)
