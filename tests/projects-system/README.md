# Projects System - Test Suite

Complete test suite for the Enhanced Projects/Workspaces System.

## Test Suites

### 1. Isolation Tests (`test-projects-isolation.ps1`)
Verifies complete context isolation between projects:
- File system isolation
- Content isolation (no cross-project contamination)
- Configuration isolation
- Directory structure isolation
- Task isolation
- Global registry validation
- Required files check

**Run:**
```powershell
.\tests\projects-system\test-projects-isolation.ps1
```

### 2. Functionality Tests (`test-projects-functionality.ps1`)
Tests core project management features:
- Project creation with templates
- Project listing
- Project status display
- Template system (all 6 templates)
- Project archiving
- Project restoration
- Configuration integrity

**Run:**
```powershell
.\tests\projects-system\test-projects-functionality.ps1
```

### 3. Master Test Runner (`run-all-tests.ps1`)
Runs all test suites and generates comprehensive report:
- Executes all test suites
- Generates pass/fail summary
- Saves test report to file
- Returns appropriate exit codes

**Run:**
```powershell
.\tests\projects-system\run-all-tests.ps1
```

## Test Coverage

### Isolation Verification (7 tests)
- ✓ File isolation (separate MEMORY.md files)
- ✓ Content isolation (no mention of other projects' technologies)
- ✓ Configuration isolation (independent tags, settings)
- ✓ Directory structure isolation (template-specific folders)
- ✓ Task isolation (different task lists)
- ✓ Global registry (all projects registered)
- ✓ Required files (all standard files present)

### Functionality Verification (7 tests)
- ✓ Project creation (with all required files)
- ✓ Project listing (shows active and archived)
- ✓ Project status (displays metadata correctly)
- ✓ Template system (all 6 templates work)
- ✓ Project archiving (marks as archived)
- ✓ Project restoration (restores from archive)
- ✓ Configuration integrity (valid JSON, required fields)

## Expected Results

All tests should pass with output like:

```
=== TEST SUMMARY ===
File Isolation: PASS
Content Isolation: PASS
Config Isolation: PASS
Directory Structure: PASS
Task Isolation: PASS
Global Registry: PASS
Required Files: PASS

Total Tests: 7
Passed: 7
Failed: 0

✓ ALL TESTS PASSED - System is ready for production
```

## Test Projects

The test suite uses these existing test projects:
- **web-app-redesign** - Web development (React) project
- **data-pipeline** - Data science (Airflow/Spark) project

These projects have intentionally different contexts to verify isolation.

## Running Tests

### Quick Verification
```powershell
# Run all tests at once
.\tests\projects-system\run-all-tests.ps1
```

### Individual Test Suites
```powershell
# Just isolation tests
.\tests\projects-system\test-projects-isolation.ps1

# Just functionality tests
.\tests\projects-system\test-projects-functionality.ps1
```

### Continuous Integration
The tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Test Projects System
  run: |
    pwsh -File tests/projects-system/run-all-tests.ps1
```

## Test Maintenance

### Adding New Tests
1. Create new test file: `test-projects-[feature].ps1`
2. Follow existing test structure
3. Add to `run-all-tests.ps1`
4. Update this README

### Test Project Updates
If test projects are modified:
1. Ensure they maintain isolation
2. Run full test suite to verify
3. Update expected results in documentation

## Troubleshooting

### Tests Fail After Project Changes
- Run isolation tests first to identify contamination
- Check if test projects still exist
- Verify projects-config.json is valid

### Template Tests Fail
- Check that all 6 templates are defined in projects-config.json
- Verify template folder structures in config

### Configuration Tests Fail
- Validate JSON syntax in projects-config.json
- Ensure all project CONFIG.json files are valid
- Check for required fields in config files

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed
- `-1` - Test suite encountered an error

## Test Reports

Test reports are saved to:
```
tests/projects-system/last-test-report.txt
```

View the last test run:
```powershell
Get-Content tests/projects-system/last-test-report.txt
```

## Requirements

- PowerShell 5.1 or later
- Write access to workspace directory
- Existing projects system installation

## Related Documentation

- **SKILL.md** - Complete system documentation
- **README.md** - Quick start guide
- **TESTING.md** - Manual verification procedures
- **INTEGRATION.md** - Integration guide

---

**Status:** Complete test coverage with 14 automated tests  
**Last Updated:** 2026-02-13  
**Version:** 1.0.0
