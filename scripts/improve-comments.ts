#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// File patterns to check for comments
const FILE_PATTERNS = [
  'packages/**/*.{ts,js}',
  'examples/**/*.{ts,js}',
  'templates/**/*.{ts,js}',
  'scripts/**/*.{ts,js}',
  'e2e-tests/**/*.{ts,js}'
] as const;

// Comment patterns to check
const COMMENT_PATTERNS = {
  // Chinese characters in comments
  chineseInComments: /\/\/.*[\u4e00-\u9fff]|\/\*[\s\S]*?[\u4e00-\u9fff][\s\S]*?\*\//g,
  // TODO comments without proper format
  todoWithoutFormat: /\/\/\s*TODO\s*[^:]/gi,
  // FIXME comments without proper format
  fixmeWithoutFormat: /\/\/\s*FIXME\s*[^:]/gi,
  // Comments that are too long
  longComments: /\/\/.{100,}|\/\*[\s\S]{200,}?\*\//g,
  // Missing JSDoc for functions
  missingJSDoc: /^(export\s+)?(async\s+)?function\s+\w+|^(export\s+)?(async\s+)?\w+\s*[:=]\s*(async\s+)?\(/gm
} as const;

interface CommentIssue {
  file: string;
  line: number;
  type: string;
  message: string;
  suggestion?: string;
}

interface FileAnalysis {
  file: string;
  issues: CommentIssue[];
  totalLines: number;
  commentLines: number;
  codeLines: number;
}

function analyzeFile(filePath: string): FileAnalysis {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const issues: CommentIssue[] = [];
    
    let commentLines = 0;
    let codeLines = 0;
    let inMultiLineComment = false;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Count comment lines
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
        commentLines++;
      } else if (trimmedLine.includes('/*')) {
        inMultiLineComment = true;
        commentLines++;
      } else if (trimmedLine.includes('*/')) {
        inMultiLineComment = false;
        commentLines++;
      } else if (inMultiLineComment) {
        commentLines++;
      } else if (trimmedLine.length > 0) {
        codeLines++;
      }

      // Check for Chinese characters in comments
      if (COMMENT_PATTERNS.chineseInComments.test(line)) {
        issues.push({
          file: filePath,
          line: lineNumber,
          type: 'chinese-in-comments',
          message: 'Chinese characters found in comments',
          suggestion: 'Replace with English comments for better internationalization'
        });
      }

      // Check for TODO without proper format
      if (COMMENT_PATTERNS.todoWithoutFormat.test(line)) {
        issues.push({
          file: filePath,
          line: lineNumber,
          type: 'todo-format',
          message: 'TODO comment without proper format',
          suggestion: 'Use format: // TODO: description'
        });
      }

      // Check for FIXME without proper format
      if (COMMENT_PATTERNS.fixmeWithoutFormat.test(line)) {
        issues.push({
          file: filePath,
          line: lineNumber,
          type: 'fixme-format',
          message: 'FIXME comment without proper format',
          suggestion: 'Use format: // FIXME: description'
        });
      }

      // Check for long comments
      if (COMMENT_PATTERNS.longComments.test(line)) {
        issues.push({
          file: filePath,
          line: lineNumber,
          type: 'long-comment',
          message: 'Comment is too long',
          suggestion: 'Break long comments into multiple lines or use JSDoc'
        });
      }
    });

    return {
      file: filePath,
      issues,
      totalLines: lines.length,
      commentLines,
      codeLines
    };
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, (error as Error).message);
    return {
      file: filePath,
      issues: [],
      totalLines: 0,
      commentLines: 0,
      codeLines: 0
    };
  }
}

function generateReport(analyses: FileAnalysis[]): void {
  console.log('📊 Comment Quality Analysis Report\n');

  let totalFiles = 0;
  let filesWithIssues = 0;
  let totalIssues = 0;
  let totalLines = 0;
  let totalCommentLines = 0;
  let totalCodeLines = 0;

  const issueTypes = new Map<string, number>();

  analyses.forEach(analysis => {
    totalFiles++;
    totalLines += analysis.totalLines;
    totalCommentLines += analysis.commentLines;
    totalCodeLines += analysis.codeLines;

    if (analysis.issues.length > 0) {
      filesWithIssues++;
      totalIssues += analysis.issues.length;

      console.log(`❌ ${analysis.file}:`);
      analysis.issues.forEach(issue => {
        console.log(`   Line ${issue.line}: ${issue.message}`);
        if (issue.suggestion) {
          console.log(`     Suggestion: ${issue.suggestion}`);
        }
        
        // Count issue types
        const count = issueTypes.get(issue.type) || 0;
        issueTypes.set(issue.type, count + 1);
      });
      console.log('');
    } else {
      console.log(`✅ ${analysis.file}`);
    }
  });

  console.log('📈 Summary:');
  console.log(`   Total files analyzed: ${totalFiles}`);
  console.log(`   Files with issues: ${filesWithIssues}`);
  console.log(`   Total issues found: ${totalIssues}`);
  console.log(`   Total lines of code: ${totalCodeLines}`);
  console.log(`   Total comment lines: ${totalCommentLines}`);
  console.log(`   Comment ratio: ${((totalCommentLines / totalLines) * 100).toFixed(1)}%`);

  if (issueTypes.size > 0) {
    console.log('\n🔍 Issue Types:');
    issueTypes.forEach((count, type) => {
      console.log(`   ${type}: ${count}`);
    });
  }

  if (filesWithIssues === 0) {
    console.log('\n🎉 All files have good comment quality!');
  } else {
    console.log('\n💡 Recommendations:');
    console.log('   1. Replace Chinese comments with English');
    console.log('   2. Use proper TODO/FIXME format');
    console.log('   3. Break long comments into multiple lines');
    console.log('   4. Add JSDoc comments for public functions');
    console.log('   5. Use descriptive variable and function names');
  }
}

async function main(): Promise<void> {
  console.log('🔍 Analyzing comment quality across the project...\n');

  const analyses: FileAnalysis[] = [];

  for (const pattern of FILE_PATTERNS) {
    const files = await glob(pattern);
    for (const file of files) {
      const analysis = analyzeFile(file);
      analyses.push(analysis);
    }
  }

  generateReport(analyses);
}

if (require.main === module) {
  main().catch(console.error);
}

export { analyzeFile, generateReport }; 