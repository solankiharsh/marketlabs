/**
 * feat: add new feature
 * fix: bug fix
 * docs: documentation update
 * style: code style changes that do not affect logic (whitespace, formatting, missing semicolons, etc.)
 * refactor: code refactoring (neither new feature nor bug fix)
 * perf: performance or UX optimization
 * test: add or update tests
 * build: changes to the build system (e.g. gulp, webpack, rollup config)
 * ci: changes to CI configuration (e.g. Travis, Jenkins, GitLab CI, Circle)
 * chore: miscellaneous tasks (build process, dependency management, etc.)
 * revert: revert a previous commit
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'revert']
    ],
    'subject-full-stop': [0, 'never'],
    'subject-case': [0, 'never']
  }
}
