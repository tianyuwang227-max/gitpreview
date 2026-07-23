import { screenshotService } from '../src/modules/screenshot-service/screenshot';
import fs from 'fs/promises';
import path from 'path';

async function testVue() {
  console.log('Testing Vue.js repository...');

  try {
    const result = await screenshotService.capture({
      url: 'https://github.com/vuejs/vue',
      width: 1280,
      height: 900,
      fullPage: false,
    });

    console.log('Screenshot saved:', result.imagePath);
    console.log('File size:', result.metadata.fileSize, 'bytes');

    const fullPath = path.resolve(result.imagePath);
    console.log('Full path:', fullPath);
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await screenshotService.close();
  }
}

testVue();
