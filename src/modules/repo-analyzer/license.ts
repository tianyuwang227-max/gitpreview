import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger';

const LICENSE_FILES = ['LICENSE', 'LICENSE.md', 'LICENCE', 'LICENCE.md', 'license', 'license.md'];

const LICENSE_PATTERNS: Record<string, RegExp[]> = {
  'MIT': [/MIT License/i, /MIT\s/i, /Permission is hereby granted, free of charge/i],
  'Apache-2.0': [/Apache License/i, /Version 2\.0/i],
  'GPL-3.0': [/GNU GENERAL PUBLIC LICENSE/i, /Version 3/i],
  'GPL-2.0': [/GNU GENERAL PUBLIC LICENSE/i, /Version 2/i],
  'BSD-3-Clause': [/BSD 3-Clause/i, /Redistribution and use in source and binary forms/i],
  'BSD-2-Clause': [/BSD 2-Clause/i],
  'ISC': [/ISC License/i],
  'LGPL': [/GNU Lesser General Public/i],
  'MPL': [/Mozilla Public License/i],
  'Unlicense': [/Unlicense/i, /public domain/i],
};

export async function detectLicense(repoPath: string): Promise<string> {
  logger.info('Detecting license');

  for (const fileName of LICENSE_FILES) {
    const filePath = path.join(repoPath, fileName);
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      for (const [license, patterns] of Object.entries(LICENSE_PATTERNS)) {
        if (patterns.some(pattern => pattern.test(content))) {
          return license;
        }
      }

      return 'Custom';
    } catch {
      continue;
    }
  }

  try {
    const packageJsonPath = path.join(repoPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    if (packageJson.license) {
      return packageJson.license;
    }
  } catch {
    // No package.json
  }

  return 'Not specified';
}
