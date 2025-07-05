#!/usr/bin/env tsx

import chalk from 'chalk';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface CoverageData {
  total: number;
  covered: number;
  percentage: number;
}

interface PackageCoverage {
  name: string;
  files: CoverageData;
  lines: CoverageData;
  functions: CoverageData;
  branches: CoverageData;
}

function runTests(): void {
  console.log(chalk.blue('🧪 Running tests with coverage...'));

  try {
    execSync('pnpm test:coverage', { stdio: 'inherit' });
    console.log(chalk.green('✅ Tests completed successfully'));
  } catch (error) {
    console.error(chalk.red('❌ Tests failed'));
    process.exit(1);
  }
}

function parseCoverageData(): PackageCoverage[] {
  const coveragePath = join(process.cwd(), 'coverage', 'coverage-summary.json');

  try {
    const coverageData = JSON.parse(readFileSync(coveragePath, 'utf-8'));
    const packages: PackageCoverage[] = [];

    Object.entries(coverageData).forEach(([filePath, data]: [string, any]) => {
      if (filePath === 'total') return;

      const packageName = filePath.split('/')[1] || 'root';
      const existingPackage = packages.find((p) => p.name === packageName);

      const coverage: PackageCoverage = {
        name: packageName,
        files: data.files,
        lines: data.lines,
        functions: data.functions,
        branches: data.branches,
      };

      if (existingPackage) {
        // Merge coverage data
        existingPackage.files.total += data.files.total;
        existingPackage.files.covered += data.files.covered;
        existingPackage.lines.total += data.lines.total;
        existingPackage.lines.covered += data.lines.covered;
        existingPackage.functions.total += data.functions.total;
        existingPackage.functions.covered += data.functions.covered;
        existingPackage.branches.total += data.branches.total;
        existingPackage.branches.covered += data.branches.covered;
      } else {
        packages.push(coverage);
      }
    });

    // Calculate percentages
    packages.forEach((pkg) => {
      pkg.files.percentage = (pkg.files.covered / pkg.files.total) * 100;
      pkg.lines.percentage = (pkg.lines.covered / pkg.lines.total) * 100;
      pkg.functions.percentage =
        (pkg.functions.covered / pkg.functions.total) * 100;
      pkg.branches.percentage =
        (pkg.branches.covered / pkg.branches.total) * 100;
    });

    return packages;
  } catch (error) {
    console.error(chalk.red('❌ Failed to parse coverage data'));
    return [];
  }
}

function generateReport(packages: PackageCoverage[]): void {
  const report = `
# Dubhe Test Coverage Report

Generated on: ${new Date().toISOString()}

## 📊 Overall Coverage

${packages
  .map(
    (pkg) => `
### ${pkg.name}

| Metric | Covered | Total | Percentage |
|--------|---------|-------|------------|
| Files | ${pkg.files.covered} | ${pkg.files.total} | ${pkg.files.percentage.toFixed(1)}% |
| Lines | ${pkg.lines.covered} | ${pkg.lines.total} | ${pkg.lines.percentage.toFixed(1)}% |
| Functions | ${pkg.functions.covered} | ${pkg.functions.total} | ${pkg.functions.percentage.toFixed(1)}% |
| Branches | ${pkg.branches.covered} | ${pkg.branches.total} | ${pkg.branches.percentage.toFixed(1)}% |
`
  )
  .join('')}

## 🎯 Coverage Goals

- **Lines**: Target 80%+ coverage
- **Functions**: Target 85%+ coverage  
- **Branches**: Target 70%+ coverage
- **Files**: Target 90%+ coverage

## 📈 Recommendations

${generateRecommendations(packages)}

## 🔧 Commands

\`\`\`bash
# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Run specific package tests
pnpm --filter @0xobelisk/sui-client test
\`\`\`
`;

  const reportPath = join(process.cwd(), 'COVERAGE_REPORT.md');
  writeFileSync(reportPath, report);
  console.log(chalk.green(`📄 Coverage report generated: ${reportPath}`));
}

function generateRecommendations(packages: PackageCoverage[]): string {
  const recommendations: string[] = [];

  packages.forEach((pkg) => {
    if (pkg.lines.percentage < 80) {
      recommendations.push(
        `- **${pkg.name}**: Increase line coverage (currently ${pkg.lines.percentage.toFixed(1)}%)`
      );
    }
    if (pkg.functions.percentage < 85) {
      recommendations.push(
        `- **${pkg.name}**: Increase function coverage (currently ${pkg.functions.percentage.toFixed(1)}%)`
      );
    }
    if (pkg.branches.percentage < 70) {
      recommendations.push(
        `- **${pkg.name}**: Increase branch coverage (currently ${pkg.branches.percentage.toFixed(1)}%)`
      );
    }
  });

  if (recommendations.length === 0) {
    return '- ✅ All packages meet coverage goals!';
  }

  return recommendations.join('\n');
}

function displaySummary(packages: PackageCoverage[]): void {
  console.log(chalk.blue('\n📊 Coverage Summary'));
  console.log(chalk.blue('='.repeat(50)));

  packages.forEach((pkg) => {
    const lineColor = pkg.lines.percentage >= 80 ? chalk.green : chalk.yellow;
    const functionColor =
      pkg.functions.percentage >= 85 ? chalk.green : chalk.yellow;
    const branchColor =
      pkg.branches.percentage >= 70 ? chalk.green : chalk.yellow;

    console.log(chalk.bold(`\n${pkg.name}:`));
    console.log(
      `  Lines: ${lineColor(`${pkg.lines.percentage.toFixed(1)}%`)} (${pkg.lines.covered}/${pkg.lines.total})`
    );
    console.log(
      `  Functions: ${functionColor(`${pkg.functions.percentage.toFixed(1)}%`)} (${pkg.functions.covered}/${pkg.functions.total})`
    );
    console.log(
      `  Branches: ${branchColor(`${pkg.branches.percentage.toFixed(1)}%`)} (${pkg.branches.covered}/${pkg.branches.total})`
    );
  });

  const totalLines = packages.reduce((sum, pkg) => sum + pkg.lines.covered, 0);
  const totalLinesTotal = packages.reduce(
    (sum, pkg) => sum + pkg.lines.total,
    0
  );
  const overallPercentage = (totalLines / totalLinesTotal) * 100;

  console.log(chalk.blue('\n' + '='.repeat(50)));
  console.log(chalk.bold(`Overall Coverage: ${overallPercentage.toFixed(1)}%`));
  console.log(chalk.blue('='.repeat(50)));
}

function main(): void {
  console.log(chalk.blue('🚀 Dubhe Test Coverage Report Generator'));
  console.log(chalk.blue('='.repeat(50)));

  runTests();
  const packages = parseCoverageData();

  if (packages.length === 0) {
    console.error(chalk.red('❌ No coverage data found'));
    process.exit(1);
  }

  displaySummary(packages);
  generateReport(packages);

  console.log(chalk.green('\n✅ Coverage report generation completed!'));
}

if (require.main === module) {
  main();
}
