import { screenshotService } from '../src/modules/screenshot-service/screenshot';
import path from 'path';
import fs from 'fs/promises';

const OUTPUT_DIR = path.join(__dirname, '..', 'projects', '.screenshots');

async function testScreenshot() {
  console.log('Starting screenshot test...');

  try {
    const result = await screenshotService.capture({
      url: 'https://github.com/octocat/Hello-World',
      width: 1280,
      height: 900,
      fullPage: false,
    });

    console.log('Screenshot result:', {
      success: result.success,
      imagePath: result.imagePath,
      url: result.url,
      metadata: result.metadata,
    });

    const stat = await fs.stat(result.imagePath);
    console.log('File exists:', stat.isFile());
    console.log('File size:', stat.size, 'bytes');

    console.log('Test passed!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await screenshotService.close();
  }
}

testScreenshot();
