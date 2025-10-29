class AIAnalysisService {
  async analyzeContent(content: string): Promise<{
    readabilityScore: number;
    sentiment: number;
    themes: string[];
    issues: string[];
    suggestions: string[];
  }> {
    return {
      readabilityScore: this.calculateReadability(content),
      sentiment: this.analyzeSentiment(content),
      themes: this.extractThemes(content),
      issues: this.findIssues(content),
      suggestions: this.generateSuggestions(content)
    };
  }

  async moderateContent(content: string): Promise<{
    isSafe: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    flags: string[];
  }> {
    const flags = [];
    if (this.containsViolence(content)) flags.push('violence');
    if (this.containsHate(content)) flags.push('hate');
    
    const riskLevel = flags.length > 1 ? 'high' : flags.length > 0 ? 'medium' : 'low';
    
    return {
      isSafe: riskLevel === 'low',
      riskLevel,
      flags
    };
  }

  private calculateReadability(content: string): number {
    const sentences = content.split(/[.!?]/).length;
    const words = content.split(/\\s+/).length;
    return Math.max(0, Math.min(100, 206.835 - (1.015 * words/sentences)));
  }

  private analyzeSentiment(content: string): number {
    const positive = ['good', 'great', 'love', 'happy', 'wonderful'];
    const negative = ['bad', 'hate', 'sad', 'terrible', 'awful'];
    const words = content.toLowerCase().split(/\\s+/);
    
    let score = 0;
    words.forEach(word => {
      if (positive.includes(word)) score += 1;
      if (negative.includes(word)) score -= 1;
    });
    
    return Math.max(-1, Math.min(1, score / words.length * 10));
  }

  private extractThemes(content: string): string[] {
    const themes = ['love', 'adventure', 'mystery', 'conflict', 'family'];
    return themes.filter(theme => 
      content.toLowerCase().includes(theme)
    );
  }

  private findIssues(content: string): string[] {
    const issues = [];
    if (content.split(/\\s+/).length < 10) issues.push('Too short');
    if (content.length > 10000) issues.push('Very long');
    return issues;
  }

  private generateSuggestions(content: string): string[] {
    const suggestions = [];
    const avgSentenceLength = content.split(/\\s+/).length / content.split(/[.!?]/).length;
    
    if (avgSentenceLength > 25) {
      suggestions.push('Consider shorter sentences for better readability');
    }
    if (content.split('said').length > 5) {
      suggestions.push('Try alternatives to \"said\" in dialogue');
    }
    
    return suggestions;
  }

  private containsViolence(content: string): boolean {
    return /\\b(kill|murder|violence|blood|weapon)\\b/i.test(content);
  }

  private containsHate(content: string): boolean {
    return /\\b(hate|racist|discrimination)\\b/i.test(content);
  }
}

export { AIAnalysisService };"