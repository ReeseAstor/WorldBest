import { ExportOptions, ProjectContent } from '../../types/export.types.js';
import { promises as fs } from 'fs';

export class JSONProcessor {
  async process(
    content: ProjectContent,
    options: ExportOptions,
    outputPath: string
  ): Promise<{ filePath: string }> {
    const jsonData = this.formatContent(content, options);
    const jsonString = JSON.stringify(jsonData, null, 2);
    
    await fs.writeFile(outputPath, jsonString, 'utf8');
    return { filePath: outputPath };
  }

  async generatePreview(
    content: ProjectContent,
    options: ExportOptions,
    outputPath: string
  ): Promise<{ filePath: string }> {
    const previewContent = {
      ...content,
      chapters: content.chapters.slice(0, 2)
    };
    return this.process(previewContent, options, outputPath);
  }

  private formatContent(content: ProjectContent, options: ExportOptions): any {
    const exportData: any = {
      metadata: {
        title: content.title,
        author: content.author,
        description: content.description,
        language: content.settings.language,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        format: 'worldbest-json'
      },
      project: {
        id: content.id,
        settings: content.settings,
        statistics: this.calculateStatistics(content),
        customMetadata: content.metadata
      },
      chapters: content.chapters.map(chapter => this.formatChapter(chapter, options)),
      exportOptions: this.sanitizeOptions(options)
    };

    // Include additional data based on options
    if (options.includeMetadata) {
      exportData.detailed = {
        wordCounts: this.getWordCounts(content),
        chapterSummary: this.getChapterSummary(content),
        exportHistory: this.getExportHistory(content.id)
      };
    }

    return exportData;
  }

  private formatChapter(chapter: any, options: ExportOptions): any {
    const formattedChapter: any = {
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      content: {
        raw: chapter.content,
        formatted: this.formatText(chapter.content),
        wordCount: chapter.wordCount || this.countWords(chapter.content),
        characterCount: chapter.content.length,
        paragraphCount: this.countParagraphs(chapter.content)
      },
      timestamps: {
        created: chapter.createdAt,
        lastModified: chapter.lastModified || chapter.updatedAt
      }
    };

    if (options.includeMetadata && chapter.metadata) {
      formattedChapter.metadata = chapter.metadata;
    }

    if (options.includeComments && chapter.comments) {
      formattedChapter.comments = chapter.comments.map((comment: any) => ({
        id: comment.id,
        author: comment.author,
        content: comment.content,
        timestamp: comment.createdAt,
        resolved: comment.resolved || false
      }));
    }

    return formattedChapter;
  }

  private formatText(text: string): any {
    const lines = text.split('\n');
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    
    return {
      paragraphs: paragraphs.map(p => p.trim()),
      structure: this.analyzeStructure(text),
      formatting: this.extractFormatting(text)
    };
  }

  private analyzeStructure(text: string): any {
    const headings = [];
    const lines = text.split('\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.match(/^#{1,6}\s/)) {
        const level = (trimmed.match(/^#+/) || [''])[0].length;
        const title = trimmed.replace(/^#+\s*/, '');
        headings.push({
          level,
          title,
          lineNumber: index + 1
        });
      }
    });

    return {
      headings,
      totalLines: lines.length,
      emptyLines: lines.filter(line => line.trim().length === 0).length,
      hasDialogue: /["'].*?["']/.test(text),
      hasLists: /^\s*[-*+]\s/.test(text) || /^\s*\d+\.\s/.test(text)
    };
  }

  private extractFormatting(text: string): any {
    return {
      bold: (text.match(/\*\*(.*?)\*\*/g) || []).map(match => match.slice(2, -2)),
      italic: (text.match(/\*(.*?)\*/g) || []).map(match => match.slice(1, -1)),
      quotes: (text.match(/"(.*?)"/g) || []).map(match => match.slice(1, -1)),
      emphasis: {
        boldCount: (text.match(/\*\*(.*?)\*\*/g) || []).length,
        italicCount: (text.match(/\*(.*?)\*/g) || []).length,
        quoteCount: (text.match(/"(.*?)"/g) || []).length
      }
    };
  }

  private calculateStatistics(content: ProjectContent): any {
    const totalWords = content.chapters.reduce((sum, chapter) => 
      sum + (chapter.wordCount || this.countWords(chapter.content)), 0
    );
    
    const totalCharacters = content.chapters.reduce((sum, chapter) => 
      sum + chapter.content.length, 0
    );

    const avgWordsPerChapter = Math.round(totalWords / content.chapters.length);
    const avgCharactersPerChapter = Math.round(totalCharacters / content.chapters.length);

    return {
      totalWords,
      totalCharacters,
      totalChapters: content.chapters.length,
      averageWordsPerChapter: avgWordsPerChapter,
      averageCharactersPerChapter: avgCharactersPerChapter,
      estimatedReadingTime: Math.round(totalWords / 200), // minutes at 200 WPM
      longestChapter: this.findLongestChapter(content.chapters),
      shortestChapter: this.findShortestChapter(content.chapters)
    };
  }

  private getWordCounts(content: ProjectContent): any[] {
    return content.chapters.map(chapter => ({
      chapterId: chapter.id,
      title: chapter.title,
      wordCount: chapter.wordCount || this.countWords(chapter.content),
      characterCount: chapter.content.length,
      paragraphCount: this.countParagraphs(chapter.content)
    }));
  }

  private getChapterSummary(content: ProjectContent): any[] {
    return content.chapters.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      preview: this.getPreview(chapter.content, 200),
      tags: this.extractTags(chapter.content),
      complexity: this.calculateComplexity(chapter.content)
    }));
  }

  private getExportHistory(projectId: string): any[] {
    // This would typically query a database
    return [];
  }

  private sanitizeOptions(options: ExportOptions): any {
    const sanitized = { ...options };
    delete sanitized.password; // Don't include password in export
    return sanitized;
  }

  private countWords(text: string): number {
    return text
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  private countParagraphs(text: string): number {
    return text.split('\n\n').filter(p => p.trim().length > 0).length;
  }

  private findLongestChapter(chapters: any[]): any {
    return chapters.reduce((longest, chapter) => {
      const currentLength = chapter.wordCount || this.countWords(chapter.content);
      const longestLength = longest.wordCount || this.countWords(longest.content);
      return currentLength > longestLength ? chapter : longest;
    });
  }

  private findShortestChapter(chapters: any[]): any {
    return chapters.reduce((shortest, chapter) => {
      const currentLength = chapter.wordCount || this.countWords(chapter.content);
      const shortestLength = shortest.wordCount || this.countWords(shortest.content);
      return currentLength < shortestLength ? chapter : shortest;
    });
  }

  private getPreview(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }

  private extractTags(text: string): string[] {
    // Extract potential tags from content (hashtags, keywords, etc.)
    const hashtags = (text.match(/#\w+/g) || []).map(tag => tag.slice(1));
    const keywords = this.extractKeywords(text);
    return [...new Set([...hashtags, ...keywords])];
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4);
    
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    return Array.from(wordCount.entries())
      .filter(([_, count]) => count > 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private calculateComplexity(text: string): any {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = this.calculateAvgSyllables(words);

    // Flesch Reading Ease approximation
    const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

    return {
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 100) / 100,
      avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
      fleschReadingEase: Math.round(fleschScore * 100) / 100,
      readingLevel: this.getReadingLevel(fleschScore),
      sentenceCount: sentences.length,
      complexWords: words.filter(word => this.countSyllables(word) > 2).length
    };
  }

  private calculateAvgSyllables(words: string[]): number {
    const totalSyllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    return totalSyllables / words.length;
  }

  private countSyllables(word: string): number {
    // Simple syllable counting
    const vowels = 'aeiouy';
    let count = 0;
    let prevWasVowel = false;

    for (const char of word.toLowerCase()) {
      const isVowel = vowels.includes(char);
      if (isVowel && !prevWasVowel) {
        count++;
      }
      prevWasVowel = isVowel;
    }

    return Math.max(1, count);
  }

  private getReadingLevel(fleschScore: number): string {
    if (fleschScore >= 90) return 'Very Easy';
    if (fleschScore >= 80) return 'Easy';
    if (fleschScore >= 70) return 'Fairly Easy';
    if (fleschScore >= 60) return 'Standard';
    if (fleschScore >= 50) return 'Fairly Difficult';
    if (fleschScore >= 30) return 'Difficult';
    return 'Very Difficult';
  }
}