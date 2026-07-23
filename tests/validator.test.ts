import { validateGithubUrl } from '../src/modules/github-repo-manager/validator';

describe('validateGithubUrl', () => {
  it('should validate standard GitHub URL', () => {
    const result = validateGithubUrl('https://github.com/facebook/react');
    expect(result.valid).toBe(true);
    expect(result.owner).toBe('facebook');
    expect(result.repo).toBe('react');
  });

  it('should validate URL with .git suffix', () => {
    const result = validateGithubUrl('https://github.com/facebook/react.git');
    expect(result.valid).toBe(true);
    expect(result.owner).toBe('facebook');
    expect(result.repo).toBe('react');
  });

  it('should validate SSH URL', () => {
    const result = validateGithubUrl('git@github.com:facebook/react.git');
    expect(result.valid).toBe(true);
    expect(result.owner).toBe('facebook');
    expect(result.repo).toBe('react');
  });

  it('should reject invalid URL', () => {
    const result = validateGithubUrl('https://gitlab.com/owner/repo');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject empty string', () => {
    const result = validateGithubUrl('');
    expect(result.valid).toBe(false);
  });

  it('should handle URL with trailing slash', () => {
    const result = validateGithubUrl('https://github.com/facebook/react/');
    expect(result.valid).toBe(true);
    expect(result.owner).toBe('facebook');
    expect(result.repo).toBe('react');
  });
});
