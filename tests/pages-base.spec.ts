import { test, expect } from '@playwright/test';
import { resolvePagesBase } from '../scripts/pages-base';

test('Pages paths follow metadata, Git remotes, root repositories, and custom domains', () => {
  expect(resolvePagesBase({}, 'https://github.com/family/wedding.git')).toBe('/wedding/');
  expect(resolvePagesBase({}, 'git@github.com:family/wedding.git')).toBe('/wedding/');
  expect(resolvePagesBase({}, 'ssh://git@github.com/family/wedding.git')).toBe('/wedding/');
  expect(resolvePagesBase({}, 'https://github.com/family/family.github.io.git')).toBe('/');
  expect(resolvePagesBase({ GITHUB_REPOSITORY: 'family/wedding' })).toBe('/wedding/');
  expect(resolvePagesBase({ PAGES_BASE_PATH: '' }, 'git@github.com:family/wedding.git')).toBe('/');
  expect(resolvePagesBase({ PAGES_BASE_PATH: '/actual-repository' })).toBe('/actual-repository/');
  expect(resolvePagesBase({}, 'git@github.com:family/wedding.git', true)).toBe('/');
  expect(resolvePagesBase({}, 'https://example.com/family/wedding.git')).toBe('./');
  expect(resolvePagesBase({})).toBe('./');
  expect(() => resolvePagesBase({ PAGES_BASE_PATH: '//unexpected-host/' })).toThrow();
});
