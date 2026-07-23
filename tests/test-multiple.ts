import { screenshotService } from '../src/modules/screenshot-service/screenshot';
import path from 'path';

const repos = [
  'https://github.com/facebook/react',
  'https://github.com/sveltejs/svelte',
  'https://github.com/expressjs/express',
];

async function testMultiple() {
  for (const url of repos) {
    console.log(`\nCapturing: ${url}`);

    try {
      const result = await screenshotService.capture({
        url,
        width: 1280,
        height: 900,
      });

      console.log('Saved:', result.imagePath);
      console.log('Size:', result.metadata.fileSize, 'bytes');
    } catch (error) {
      console.error('Failed:', error);
    }
  }

  await screenshotService.close();
  console.log('\nDone!');
}

testMultiple();
