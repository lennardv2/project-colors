# Change Log

All notable changes to the "project-colors" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.1.2] - 2025-08-05

### Fixed
- Fixed extension activation error on remote SSH environments where workspace files don't have settings property
- Fixed colorization toggles not immediately removing colors when unchecked (title bar, activity bar, status bar, etc.)
- Fixed workspace name color staying brown instead of using selected project color when "colorize workspace name" is enabled

## [1.1.1] - 2025-08-05

### Fixed
- Fixed random color only being applied at startup when no existing color is present
- Fixed debounce on project name to work consistently across all settings (especially color picker)
- Fixed workspace configuration registration error for projectColors.workspaces
- Fixed random color not being displayed correctly in project settings color picker on startup
- Fixed status bar color not being applied on startup when "color status bar" is enabled by default

## [Unreleased]

- Initial release