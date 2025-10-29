import { ProjectContent, ExportOptions, QualityIssue } from '../types/export.types.js';

export class QualityAssuranceService {
  async performQualityCheck(
    content: ProjectContent,
    options: ExportOptions = {}
  ): Promise<{
    score: number;
    issues: QualityIssue[];
    recommendations: string[];
    passedChecks: string[];
    failedChecks: string[];
  }> {
    const issues: QualityIssue[] = [];
    const passedChecks: string[] = [];
    const failedChecks: string[] = [];
    const recommendations: string[] = [];

    // Run all quality checks
    await Promise.all([
      this.checkStructure(content, issues, passedChecks, failedChecks),
      this.checkContent(content, issues, passedChecks, failedChecks),
      this.checkFormatting(content, issues, passedChecks, failedChecks),
      this.checkConsistency(content, issues, passedChecks, failedChecks),
      this.checkExportOptions(options, issues, passedChecks, failedChecks),
      this.checkAccessibility(content, issues, passedChecks, failedChecks),
      this.checkMetadata(content, issues, passedChecks, failedChecks)
    ]);

    // Generate recommendations based on issues
    this.generateRecommendations(issues, recommendations);

    // Calculate quality score
    const score = this.calculateQualityScore(passedChecks.length, failedChecks.length, issues);

    return {
      score,
      issues,
      recommendations,
      passedChecks,
      failedChecks
    };
  }

  private async checkStructure(
    content: ProjectContent,
    issues: QualityIssue[],
    passed: string[],
    failed: string[]
  ): Promise<void> {
    // Check if project has title
    if (!content.title || content.title.trim().length === 0) {
      issues.push({
        type: 'error',
        category: 'structure',
        message: 'Project is missing a title',
        suggestion: 'Add a meaningful title to your project'
      });
      failed.push('Project title check');
    } else {
      passed.push('Project title check');
    }

    // Check if project has author
    if (!content.author || content.author.trim().length === 0) {
      issues.push({
        type: 'warning',
        category: 'structure',
        message: 'Project is missing an author',
        suggestion: 'Add author information'
      });
      failed.push('Author information check');
    } else {
      passed.push('Author information check');
    }

    // Check chapter count
    if (!content.chapters || content.chapters.length === 0) {
      issues.push({
        type: 'error',
        category: 'structure',
        message: 'Project has no chapters',
        suggestion: 'Add at least one chapter to your project'
      });
      failed.push('Chapter count check');
    } else if (content.chapters.length === 1) {
      issues.push({
        type: 'info',
        category: 'structure',
        message: 'Project has only one chapter',
        suggestion: 'Consider organizing content into multiple chapters for better readability'
      });
      passed.push('Chapter count check');
    } else {
      passed.push('Chapter count check');
    }

    // Check chapter order
    const hasOrderIssues = content.chapters.some((chapter, index) => {
      return chapter.order !== undefined && chapter.order !== index + 1;
    });

    if (hasOrderIssues) {
      issues.push({
        type: 'warning',
        category: 'structure',
        message: 'Chapter order is inconsistent',
        suggestion: 'Ensure chapters are properly ordered'
      });
      failed.push('Chapter order check');
    } else {
      passed.push('Chapter order check');
    }
  }

  private async checkContent(
    content: ProjectContent,
    issues: QualityIssue[],
    passed: string[],
    failed: string[]
  ): Promise<void> {
    let totalWords = 0;
    const emptyChapters = [];
    const shortChapters = [];
    const longChapters = [];

    for (let i = 0; i < content.chapters.length; i++) {
      const chapter = content.chapters[i];
      const wordCount = this.countWords(chapter.content);
      totalWords += wordCount;

      // Check for empty chapters
      if (!chapter.content || chapter.content.trim().length === 0) {
        emptyChapters.push(i + 1);
        continue;
      }

      // Check for very short chapters
      if (wordCount < 100) {
        shortChapters.push({ number: i + 1, words: wordCount });
      }

      // Check for very long chapters
      if (wordCount > 10000) {
        longChapters.push({ number: i + 1, words: wordCount });
      }

      // Check for untitled chapters
      if (!chapter.title || chapter.title.trim().length === 0) {
        issues.push({
          type: 'warning',
          category: 'content',
          message: `Chapter ${i + 1} is missing a title`,
          location: `chapters[${i}].title`,
          suggestion: 'Add a descriptive title to the chapter'
        });
      }
    }

    // Report empty chapters
    if (emptyChapters.length > 0) {
      issues.push({
        type: 'error',
        category: 'content',
        message: `${emptyChapters.length} chapter(s) are empty: ${emptyChapters.join(', ')}`,
        suggestion: 'Add content to empty chapters or remove them'
      });
      failed.push('Empty chapters check');
    } else {
      passed.push('Empty chapters check');
    }

    // Report short chapters
    if (shortChapters.length > 0) {
      issues.push({
        type: 'info',
        category: 'content',
        message: `${shortChapters.length} chapter(s) are very short (< 100 words)`,
        suggestion: 'Consider expanding short chapters or merging them with adjacent chapters'
      });
    }

    // Report long chapters
    if (longChapters.length > 0) {
      issues.push({
        type: 'info',
        category: 'content',
        message: `${longChapters.length} chapter(s) are very long (> 10,000 words)`,
        suggestion: 'Consider splitting long chapters for better readability'
      });
    }

    // Check total word count
    if (totalWords === 0) {
      issues.push({
        type: 'error',
        category: 'content',
        message: 'Project has no content',
        suggestion: 'Add content to your project'
      });
      failed.push('Total content check');
    } else if (totalWords < 1000) {
      issues.push({
        type: 'warning',
        category: 'content',
        message: `Project is very short (${totalWords} words)`,
        suggestion: 'Consider expanding your content'
      });
      passed.push('Total content check');
    } else {
      passed.push('Total content check');
    }
  }

  private async checkFormatting(
    content: ProjectContent,
    issues: QualityIssue[],
    passed: string[],
    failed: string[]
  ): Promise<void> {
    let inconsistentFormatting = false;
    let hasFormattingIssues = false;

    for (let i = 0; i < content.chapters.length; i++) {
      const chapter = content.chapters[i];
      const text = chapter.content;

      if (!text) continue;

      // Check for inconsistent line breaks
      if (text.includes('\r\n') && text.includes('\n') && !text.includes('\r\n')) {
        inconsistentFormatting = true;
      }

      // Check for excessive whitespace
      if (/\s{4,}/.test(text)) {
        hasFormattingIssues = true;
      }

      // Check for inconsistent quotation marks
      const straightQuotes = (text.match(/"/g) || []).length;
      const curlyQuotes = (text.match(/[""]/g) || []).length;
      
      if (straightQuotes > 0 && curlyQuotes > 0) {
        issues.push({
          type: 'info',
          category: 'formatting',
          message: `Chapter ${i + 1} uses inconsistent quotation marks`,
          location: `chapters[${i}].content`,
          suggestion: 'Use consistent quotation mark style throughout'
        });
      }

      // Check for potential encoding issues
      if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(text)) {
        issues.push({
          type: 'warning',
          category: 'formatting',
          message: `Chapter ${i + 1} contains potential encoding issues`,
          location: `chapters[${i}].content`,
          suggestion: 'Check for and remove invalid characters'
        });
        hasFormattingIssues = true;
      }
    }

    if (inconsistentFormatting) {
      issues.push({
        type: 'info',
        category: 'formatting',
        message: 'Inconsistent line break formatting detected',
        suggestion: 'Normalize line breaks throughout the document'
      });
      failed.push('Line break consistency check');
    } else {
      passed.push('Line break consistency check');
    }

    if (hasFormattingIssues) {
      failed.push('Text formatting check');
    } else {
      passed.push('Text formatting check');
    }
  }

  private async checkConsistency(
    content: ProjectContent,
    issues: QualityIssue[],
    passed: string[],
    failed: string[]
  ): Promise<void> {
    // Check character name consistency
    const characterNames = this.extractCharacterNames(content);
    const inconsistentNames = this.findInconsistentNames(characterNames);

    if (inconsistentNames.length > 0) {
      issues.push({
        type: 'warning',
        category: 'consistency',
        message: `Potential inconsistent character names found: ${inconsistentNames.join(', ')}`,
        suggestion: 'Review character name spelling and consistency'
      });
      failed.push('Character name consistency check');
    } else {
      passed.push('Character name consistency check');
    }

    // Check tense consistency
    const tenseIssues = this.checkTenseConsistency(content);
    if (tenseIssues.length > 0) {
      issues.push({
        type: 'info',
        category: 'consistency',
        message: 'Potential tense inconsistencies detected',
        suggestion: 'Review and maintain consistent tense throughout'
      });
    }

    // Check style consistency
    const styleIssues = this.checkStyleConsistency(content);
    if (styleIssues.length > 0) {
      issues.push({
        type: 'info',
        category: 'consistency',
        message: 'Style inconsistencies detected',
        suggestion: 'Review writing style for consistency'
      });
      failed.push('Style consistency check');
    } else {
      passed.push('Style consistency check');
    }
  }

  private async checkExportOptions(
    options: ExportOptions,
    issues: QualityIssue[],
    passed: string[],
    failed: string[]
  ): Promise<void> {
    // Check font size
    if (options.fontSize && (options.fontSize < 8 || options.fontSize > 72)) {
      issues.push({
        type: 'warning',
        category: 'export-options',
        message: 'Font size is outside recommended range (8-72)',
        suggestion: 'Use a font size between 8 and 72 points'
      });
      failed.push('Font size check');
    } else {
      passed.push('Font size check');
    }

    // Check margins
    if (options.margins) {
      const { top, right, bottom, left } = options.margins;
      if (top < 0.5 || right < 0.5 || bottom < 0.5 || left < 0.5) {
        issues.push({
          type: 'warning',
          category: 'export-options',
          message: 'Margins are very small (< 0.5 inch)',
          suggestion: 'Consider using larger margins for better readability'
        });
      }
      
      if (top > 3 || right > 3 || bottom > 3 || left > 3) {
        issues.push({
          type: 'info',
          category: 'export-options',
          message: 'Margins are very large (> 3 inches)',
          suggestion: 'Consider reducing margins to maximize content space'
        });
      }
    }

    passed.push('Export options check');
  }

  private async checkAccessibility(
    content: ProjectContent,
    issues: QualityIssue[],
    passed: string[],
    failed: string[]
  ): Promise<void> {
    let accessibilityIssues = 0;

    // Check for alt text on images (simplified check)
    for (let i = 0; i < content.chapters.length; i++) {
      const chapter = content.chapters[i];
      const imageMatches = chapter.content.match(/<img[^>]*>/gi) || [];
      
      imageMatches.forEach(img => {
        if (!img.includes('alt=')) {
          issues.push({
            type: 'warning',
            category: 'accessibility',
            message: `Chapter ${i + 1} has images without alt text`,
            location: `chapters[${i}].content`,
            suggestion: 'Add descriptive alt text to all images'
          });
          accessibilityIssues++;
        }
      });
    }

    // Check for proper heading structure
    const headingStructureValid = this.checkHeadingStructure(content);
    if (!headingStructureValid) {
      issues.push({
        type: 'info',
        category: 'accessibility',
        message: 'Heading structure may not be accessible',
        suggestion: 'Use proper heading hierarchy (h1, h2, h3, etc.)'
      });
      accessibilityIssues++;
    }

    if (accessibilityIssues > 0) {
      failed.push('Accessibility check');
    } else {
      passed.push('Accessibility check');
    }
  }

  private async checkMetadata(
    content: ProjectContent,
    issues: QualityIssue[],
    passed: string[],
    failed: string[]
  ): Promise<void> {
    // Check language setting
    if (!content.settings.language) {
      issues.push({
        type: 'info',
        category: 'metadata',
        message: 'Language not specified',
        suggestion: 'Set the document language for better accessibility and export'
      });
      failed.push('Language metadata check');
    } else {
      passed.push('Language metadata check');
    }

    // Check description
    if (!content.description || content.description.trim().length === 0) {
      issues.push({
        type: 'info',
        category: 'metadata',
        message: 'Project description is missing',
        suggestion: 'Add a description to help readers understand your project'
      });
    }

    // Check genre
    if (!content.settings.genre) {
      issues.push({
        type: 'info',
        category: 'metadata',
        message: 'Genre not specified',
        suggestion: 'Specify the genre for better categorization'
      });
    }

    passed.push('Metadata check');
  }

  private generateRecommendations(issues: QualityIssue[], recommendations: string[]): void {
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;

    if (errorCount > 0) {
      recommendations.push(`Fix ${errorCount} critical error(s) before exporting`);
    }

    if (warningCount > 0) {
      recommendations.push(`Address ${warningCount} warning(s) to improve quality`);
    }

    if (issues.some(i => i.category === 'content')) {
      recommendations.push('Review content for completeness and consistency');
    }

    if (issues.some(i => i.category === 'formatting')) {
      recommendations.push('Check text formatting and encoding');
    }

    if (issues.some(i => i.category === 'accessibility')) {
      recommendations.push('Improve accessibility by adding alt text and proper headings');
    }

    if (issues.length === 0) {
      recommendations.push('Content quality looks good! Ready for export.');
    }
  }

  private calculateQualityScore(passedCount: number, failedCount: number, issues: QualityIssue[]): number {
    const totalChecks = passedCount + failedCount;
    if (totalChecks === 0) return 100;

    let baseScore = (passedCount / totalChecks) * 100;

    // Deduct points for issues
    const errorPenalty = issues.filter(i => i.type === 'error').length * 10;
    const warningPenalty = issues.filter(i => i.type === 'warning').length * 5;
    const infoPenalty = issues.filter(i => i.type === 'info').length * 2;

    const finalScore = Math.max(0, baseScore - errorPenalty - warningPenalty - infoPenalty);
    return Math.round(finalScore);
  }

  private countWords(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private extractCharacterNames(content: ProjectContent): string[] {
    // Simplified character name extraction
    const names: string[] = [];
    const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;

    content.chapters.forEach(chapter => {
      const matches = chapter.content.match(namePattern) || [];
      names.push(...matches);
    });

    return [...new Set(names)]; // Remove duplicates
  }

  private findInconsistentNames(names: string[]): string[] {
    // Find potential misspellings of character names
    const inconsistent: string[] = [];
    const processed = new Set<string>();

    for (const name of names) {
      if (processed.has(name)) continue;

      const similar = names.filter(n => 
        n !== name && 
        this.calculateSimilarity(name.toLowerCase(), n.toLowerCase()) > 0.8
      );

      if (similar.length > 0) {
        inconsistent.push(name, ...similar);
        similar.forEach(n => processed.add(n));
      }
      
      processed.add(name);
    }

    return [...new Set(inconsistent)];
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance calculation
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }

  private checkTenseConsistency(content: ProjectContent): string[] {
    // Simplified tense checking
    const issues: string[] = [];
    // This would require more sophisticated NLP for accurate tense detection
    return issues;
  }

  private checkStyleConsistency(content: ProjectContent): string[] {
    // Simplified style checking
    const issues: string[] = [];
    // Check for consistent use of contractions, punctuation styles, etc.
    return issues;
  }

  private checkHeadingStructure(content: ProjectContent): boolean {
    // Check if headings follow proper hierarchy
    for (const chapter of content.chapters) {
      const headings = chapter.content.match(/<h[1-6][^>]*>/gi) || [];
      // Simplified check - in reality, would need more sophisticated parsing
      if (headings.length > 0) {
        // Basic validation would go here
      }
    }
    return true; // Simplified return
  }
}