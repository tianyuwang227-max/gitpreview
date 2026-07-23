import fs from 'fs/promises';
import path from 'path';
import { ReadmeInfo, ReadmeSection } from './types';
import { logger } from '../../utils/logger';

export async function analyzeReadme(repoPath: string): Promise<ReadmeInfo> {
  logger.info('Analyzing README');

  const readmePath = await findReadme(repoPath);

  if (!readmePath) {
    return {
      content: '',
      summary: 'No README found',
      hasImages: false,
      hasBadges: false,
      sections: [],
    };
  }

  const content = await fs.readFile(readmePath, 'utf-8');
  const sections = extractSections(content);
  const summary = generateSummary(content, sections);

  return {
    content,
    summary,
    hasImages: content.includes('!['),
    hasBadges: content.includes('shields.io') || content.includes('badge'),
    sections,
  };
}

async function findReadme(repoPath: string): Promise<string | null> {
  const names = ['README.md', 'readme.md', 'README.MD', 'Readme.md', 'README'];

  for (const name of names) {
    const filePath = path.join(repoPath, name);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      continue;
    }
  }

  return null;
}

function extractSections(content: string): ReadmeSection[] {
  const sections: ReadmeSection[] = [];
  const lines = content.split('\n');
  let currentSection: ReadmeSection | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)/);

    if (headerMatch) {
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        title: headerMatch[2].trim(),
        level: headerMatch[1].length,
        content: '',
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

function generateSummary(content: string, sections: ReadmeSection[]): string {
  const firstParagraph = content.split('\n\n').find(p => {
    const trimmed = p.trim();
    return trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('!') && !trimmed.startsWith('[');
  });

  if (firstParagraph && firstParagraph.length > 50) {
    return firstParagraph.trim().substring(0, 300) + (firstParagraph.length > 300 ? '...' : '');
  }

  const descriptionSection = sections.find(s =>
    s.title.toLowerCase().includes('description') ||
    s.title.toLowerCase().includes('about') ||
    s.title.toLowerCase().includes('overview')
  );

  if (descriptionSection) {
    const desc = descriptionSection.content.trim();
    return desc.substring(0, 300) + (desc.length > 300 ? '...' : '');
  }

  return sections.length > 0 ? `Project with ${sections.length} documented sections` : 'No description available';
}
