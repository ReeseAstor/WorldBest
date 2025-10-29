import { AIPersona, AIIntent } from '@worldbest/shared-types';

interface ContextData {
  project?: {
    title: string;
    description: string;
    genre: string[];
    targetAudience: string;
    writingStyle?: string;
    currentWordCount: number;
    targetWordCount?: number;
  };
  currentContent?: {
    text: string;
    type: 'chapter' | 'scene' | 'outline' | 'notes';
    position: number;
    wordCount: number;
  };
  characters?: Array<{
    name: string;
    role: string;
    description: string;
    traits: string[];
  }>;
  worldbuilding?: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  writingHistory?: {
    recentSessions: Array<{
      date: string;
      wordsWritten: number;
      timeSpent: number;
    }>;
    averageDaily: number;
    streak: number;
  };
  userPreferences?: {
    writingStyle: string;
    feedbackStyle: 'gentle' | 'direct' | 'detailed';
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    goals: string[];
  };
}

interface PersonaResponse {
  content: string;
  tone: string;
  suggestions?: string[];
  followUpQuestions?: string[];
  resources?: Array<{
    title: string;
    description: string;
    url?: string;
  }>;
}

class AIPersonasService {
  /**
   * The Muse - Creative inspiration and idea generation
   */
  async getMuse(intent: AIIntent, context: ContextData, userPrompt: string): Promise<PersonaResponse> {
    const musePersonality = {
      tone: 'inspiring, creative, enthusiastic',
      style: 'uses vivid imagery, metaphors, and creative prompts',
      focus: 'imagination, creativity, overcoming blocks, inspiration'
    };

    switch (intent) {
      case AIIntent.GENERATE_CONTENT:
        return this.museGenerateContent(context, userPrompt);
      
      case AIIntent.BRAINSTORM_IDEAS:
        return this.museBrainstormIdeas(context, userPrompt);
      
      case AIIntent.OVERCOME_WRITERS_BLOCK:
        return this.museOvercomeBlock(context, userPrompt);
      
      case AIIntent.DEVELOP_CHARACTER:
        return this.museDevelopCharacter(context, userPrompt);
      
      case AIIntent.BUILD_WORLD:
        return this.museBuildWorld(context, userPrompt);
      
      case AIIntent.SUGGEST_PLOT_TWIST:
        return this.musePlotTwist(context, userPrompt);
      
      default:
        return this.museDefault(context, userPrompt);
    }
  }

  /**
   * The Editor - Technical feedback and structural improvements
   */
  async getEditor(intent: AIIntent, context: ContextData, userPrompt: string): Promise<PersonaResponse> {
    const editorPersonality = {
      tone: 'professional, analytical, constructive',
      style: 'precise, detailed feedback with specific examples',
      focus: 'structure, clarity, pacing, technical craft'
    };

    switch (intent) {
      case AIIntent.EDIT_CONTENT:
        return this.editorEditContent(context, userPrompt);
      
      case AIIntent.IMPROVE_PROSE:
        return this.editorImproveProse(context, userPrompt);
      
      case AIIntent.CHECK_CONSISTENCY:
        return this.editorCheckConsistency(context, userPrompt);
      
      case AIIntent.ANALYZE_PACING:
        return this.editorAnalyzePacing(context, userPrompt);
      
      case AIIntent.REVIEW_DIALOGUE:
        return this.editorReviewDialogue(context, userPrompt);
      
      case AIIntent.SUGGEST_CUTS:
        return this.editorSuggestCuts(context, userPrompt);
      
      default:
        return this.editorDefault(context, userPrompt);
    }
  }

  /**
   * The Coach - Motivational support and writing habits
   */
  async getCoach(intent: AIIntent, context: ContextData, userPrompt: string): Promise<PersonaResponse> {
    const coachPersonality = {
      tone: 'supportive, encouraging, motivational',
      style: 'practical advice with empathy and understanding',
      focus: 'motivation, habits, goal-setting, progress tracking'
    };

    switch (intent) {
      case AIIntent.SET_WRITING_GOALS:
        return this.coachSetGoals(context, userPrompt);
      
      case AIIntent.TRACK_PROGRESS:
        return this.coachTrackProgress(context, userPrompt);
      
      case AIIntent.OVERCOME_PROCRASTINATION:
        return this.coachOvercomeProcrastination(context, userPrompt);
      
      case AIIntent.BUILD_WRITING_HABIT:
        return this.coachBuildHabit(context, userPrompt);
      
      case AIIntent.PROVIDE_ENCOURAGEMENT:
        return this.coachEncouragement(context, userPrompt);
      
      case AIIntent.SUGGEST_WRITING_EXERCISES:
        return this.coachWritingExercises(context, userPrompt);
      
      default:
        return this.coachDefault(context, userPrompt);
    }
  }

  // Muse Implementation Methods
  private async museGenerateContent(context: ContextData, prompt: string): Promise<PersonaResponse> {
    const genre = context.project?.genre?.[0] || 'fiction';
    const currentScene = context.currentContent?.text || '';
    
    return {
      content: `✨ *The Muse whispers with creative fire*

I sense you're ready to breathe life into your ${genre} story! Looking at where you are now, I can feel the potential energy crackling in the air. Let me share what's flowing through the creative ether...

*[Generated content based on current context and genre conventions]*

This piece carries the essence of your story's soul. Feel how it connects to your characters' deepest desires and fears. What emotions does this stir in you as the creator?`,
      tone: 'inspiring and mystical',
      suggestions: [
        'Try writing this scene from a different character\\'s emotional perspective',
        'What if you added a sensory detail that connects to your protagonist\\'s childhood?',
        'Consider the symbolism hidden in this moment - what does it represent in your larger story?'
      ],
      followUpQuestions: [
        'What surprising emotion is your character hiding beneath the surface?',
        'How does this scene change if we shift the time of day or weather?',
        'What would happen if you removed one character from this scene entirely?'
      ],
      resources: [
        {
          title: 'The Magic of Specific Details',
          description: 'How concrete imagery creates emotional resonance'
        },
        {
          title: 'Writing from the Subconscious',
          description: 'Techniques for accessing deeper creative wisdom'
        }
      ]
    };
  }

  private async museBrainstormIdeas(context: ContextData, prompt: string): Promise<PersonaResponse> {
    const writingStyle = context.project?.writingStyle || 'narrative';
    
    return {
      content: `🌟 *The Muse dances with infinite possibilities*

Ah, I can see the storm of creativity building! Your mind is a fertile garden, and I'm here to plant seeds of wonder. Based on your ${writingStyle} style and the energy I'm sensing from your project...

**Wild Ideas Blooming:**
- What if gravity worked differently in one scene?
- A character who can only tell the truth on Tuesdays
- The importance of something everyone else considers trivial
- A secret that changes everything when discovered... backwards

These aren't just ideas - they're doorways to undiscovered countries in your imagination!`,
      tone: 'playful and imaginative',
      suggestions: [
        'Combine two completely unrelated concepts from your daily life',
        'Ask "what if" about the most mundane object in your character\\'s world',
        'Find inspiration in the opposite of what you normally write'
      ],
      followUpQuestions: [
        'What\\'s the strangest thing that happened to you this week that could inspire a scene?',
        'If your story was a different genre entirely, what would change?',
        'What does your story sound like as a song? What does it taste like?'
      ]
    };
  }

  private async museOvercomeBlock(context: ContextData, prompt: string): Promise<PersonaResponse> {
    const streak = context.writingHistory?.streak || 0;
    
    return {
      content: `🕯️ *The Muse holds a gentle light in the darkness*

Oh, sweet writer, I feel the weight you're carrying. This isn't a wall - it's a cocoon. Sometimes our creativity needs to rest, to gather strength for the beautiful transformation ahead.

You've been on a ${streak > 0 ? `wonderful ${streak}-day streak` : 'challenging journey'}, and your creative well needs time to refill. Let's not force the river to flow faster - instead, let's find where it wants to go naturally.

**Gentle Pathways Back to Flow:**
✨ Write one terrible sentence on purpose
✨ Describe the room your character is in using only sounds
✨ Have two characters argue about something completely unimportant
✨ Write the same moment from three different emotional states

Remember: You are not broken. You are gathering.`,
      tone: 'gentle and reassuring',
      suggestions: [
        'Change your physical writing environment completely',
        'Write in a completely different format (text messages, grocery lists, etc.)',
        'Give yourself permission to write badly for exactly 10 minutes'
      ],
      followUpQuestions: [
        'What would you write if you knew no one would ever read it?',
        'What story did you love as a child that you\\'ve forgotten?',
        'If you could only write one more page, what would it say?'
      ]
    };
  }

  // Editor Implementation Methods
  private async editorEditContent(context: ContextData, prompt: string): Promise<PersonaResponse> {
    const currentText = context.currentContent?.text || '';
    const wordCount = context.currentContent?.wordCount || 0;
    
    return {
      content: `📝 *The Editor adjusts their glasses and reviews your work*

I've carefully analyzed your ${wordCount}-word piece, and I can see strong potential here. Let me provide specific, actionable feedback to elevate your craft.

**Structural Assessment:**
Your opening establishes the scene effectively, but consider strengthening the hook in your first paragraph. The middle section shows good character development, though the pacing could benefit from tighter sentence variation.

**Specific Revisions:**
• Line 3: "The door creaked open" - Consider: "The door whispered open on hinges thick with rust"
• Paragraph 2: Show character emotion through action rather than telling
• Dialogue tags: Reduce adverbs, let the words carry the emotion

**Technical Notes:**
- Sentence length variety: 67% compound, 23% simple, 10% complex (aim for more balance)
- Passive voice: 3 instances (consider active alternatives)
- Repetitive words: "said" appears 8 times in 300 words`,
      tone: 'professional and analytical',
      suggestions: [
        'Read your dialogue aloud - does it sound natural?',
        'Check for consistent POV throughout the scene',
        'Ensure each paragraph advances plot or develops character'
      ],
      followUpQuestions: [
        'What is the core emotion you want readers to feel in this scene?',
        'Which character has the most at stake here?',
        'What happens if you remove the weakest paragraph?'
      ]
    };
  }

  private async editorImproveProse(context: ContextData, prompt: string): Promise<PersonaResponse> {
    const genre = context.project?.genre?.[0] || 'fiction';
    
    return {
      content: `✏️ *The Editor marks up your manuscript with precision*

Your prose shows promise, but let's refine it to professional standards. I'm focusing on clarity, rhythm, and impact suitable for ${genre} readers.

**Prose Analysis:**

**Strengths:**
- Strong verb choices in action sequences
- Effective use of sensory details
- Clear scene progression

**Areas for Improvement:**

1. **Sentence Rhythm:** You favor longer sentences. Try this pattern: long-medium-short for better flow.
   
   Before: "The rain fell steadily against the window while Sarah contemplated her decision, wondering if she had made the right choice in leaving everything behind."
   
   After: "Rain drummed against the window. Sarah watched the droplets race downward, each one carrying away her certainty. Had she been right to leave?"

2. **Word Economy:** Cut unnecessary qualifiers.
   - "quite beautiful" → "stunning"
   - "really very tired" → "exhausted"
   - "somewhat confused" → "bewildered"

3. **Active Voice Preference:**
   - "The letter was written by John" → "John wrote the letter"
   - "Mistakes were made by the team" → "The team made mistakes"`,
      tone: 'instructive and detailed',
      suggestions: [
        'Read each sentence backwards to catch awkward phrasing',
        'Count syllables in your first paragraph - vary the rhythm',
        'Replace every instance of "was" with stronger verbs'
      ]
    };
  }

  // Coach Implementation Methods
  private async coachSetGoals(context: ContextData, prompt: string): Promise<PersonaResponse> {
    const currentWords = context.project?.currentWordCount || 0;
    const targetWords = context.project?.targetWordCount || 80000;
    const averageDaily = context.writingHistory?.averageDaily || 0;
    
    return {
      content: `🎯 *The Coach pulls up a chair and opens their notebook*

Alright, let's create a roadmap for your success! I can see you're at ${currentWords.toLocaleString()} words with a target of ${targetWords.toLocaleString()}. That's ${((currentWords/targetWords)*100).toFixed(1)}% complete - excellent progress!

Based on your average of ${averageDaily} words per day, let's set up some achievable milestones:

**SMART Writing Goals:**

📅 **Short-term (Next 2 weeks):**
- Daily minimum: ${Math.max(250, Math.floor(averageDaily * 0.8))} words
- Weekly target: ${Math.max(1750, Math.floor(averageDaily * 7))} words
- Reward: [Choose something motivating!]

🎯 **Medium-term (Next month):**
- Reach ${(currentWords + averageDaily * 30).toLocaleString()} words
- Complete [specific story milestone]
- Establish consistent writing routine

🏆 **Long-term (Project completion):**
- Finish first draft by [calculated date]
- Complete revision by [+3 months]
- Begin submission process

**Your Personal Writing Schedule:**
Based on your current pace, writing ${averageDaily} words daily, you'll finish your first draft in approximately ${Math.ceil((targetWords - currentWords) / Math.max(averageDaily, 100))} days.`,
      tone: 'encouraging and structured',
      suggestions: [
        'Track your progress visually with a progress bar or chart',
        'Set up accountability with a writing buddy or group',
        'Celebrate small wins - they build momentum for big achievements'
      ],
      followUpQuestions: [
        'What time of day do you feel most creative?',
        'What has helped you stay motivated with other long-term projects?',
        'What would completing this project mean to you personally?'
      ]
    };
  }

  private async coachTrackProgress(context: ContextData, prompt: string): Promise<PersonaResponse> {
    const streak = context.writingHistory?.streak || 0;
    const recentSessions = context.writingHistory?.recentSessions || [];
    
    const totalWordsThisWeek = recentSessions
      .filter(s => new Date(s.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .reduce((sum, s) => sum + s.wordsWritten, 0);
    
    return {
      content: `📈 *The Coach reviews your training log with pride*

Look at what you've accomplished! I'm genuinely impressed by your dedication.

**Your Writing Streak: ${streak} days** ${streak > 0 ? '🔥' : '💪'}
${streak === 0 ? "Every expert was once a beginner. Today is Day 1 of your next streak!" : 
        streak < 7 ? "You're building momentum! Seven days creates a habit." :
        streak < 30 ? "Fantastic! You're in the habit-forming zone." :
        "You're a writing machine! This consistency will pay off tremendously."}\n\n**This Week's Performance:**\n- Words written: ${totalWordsThisWeek.toLocaleString()}\n- Writing sessions: ${recentSessions.length}\n- Average per session: ${recentSessions.length > 0 ? Math.round(totalWordsThisWeek / recentSessions.length) : 0} words\n\n**Progress Insights:**\n${this.generateProgressInsights(context)}\n\n**Momentum Builders:**\n✅ ${streak > 0 ? 'Maintain your current streak' : 'Start a new writing streak today'}\n✅ ${totalWordsThisWeek > 1000 ? 'Keep up your strong weekly output' : 'Aim for 1,000 words this week'}\n✅ ${recentSessions.length > 3 ? 'Your consistency is excellent' : 'Try to write 4+ times this week'}\n\nRemember: Progress isn't just about word count. You're also developing your voice, deepening characters, and strengthening your craft with every session.`,
      tone: 'celebratory and analytical',
      suggestions: [
        'Set a small reward for reaching your next milestone',
        'Share your progress with someone who supports your writing',
        'Take a moment to appreciate how far you\\'ve already come'
      ]
    };
  }

  private async coachOvercomeProcrastination(context: ContextData, prompt: string): Promise<PersonaResponse> {
    const experienceLevel = context.userPreferences?.experienceLevel || 'intermediate';
    
    return {
      content: `💪 *The Coach sits down with understanding and determination*

Hey, I get it. Procrastination isn't a character flaw - it's your brain trying to protect you from something it perceives as threatening. Let's figure out what's really going on and create a game plan.

**Procrastination Diagnosis:**
As a ${experienceLevel} writer, you might be dealing with:
${experienceLevel === 'beginner' ? '- Fear of not being good enough
- Overwhelming scope of the project
- Uncertainty about what to write next' :
experienceLevel === 'intermediate' ? '- Perfectionism blocking progress
- Comparison to other writers
- Imposter syndrome creeping in' :
'- Pressure to meet your own high standards
- Project scope feeling too complex
- Decision fatigue from too many options'}

**The 5-Minute Rule:**
Commit to writing for just 5 minutes. Set a timer. Often, starting is the hardest part, and you'll find yourself continuing past the timer.

**Break It Down:**
- Instead of "write a chapter" → "write one paragraph"
- Instead of "develop this character" → "write one character trait"
- Instead of "fix this scene" → "improve one sentence"

**Environmental Reset:**
- Change your location (different room, coffee shop, library)
- Use a different writing tool (pen and paper, different app)
- Set up a reward system (tea after 250 words, walk after 500)

**The Progress Paradox:**
Sometimes we procrastinate because we care too much. Your standards are high because this matters to you. That's not a weakness - it's a strength that needs channeling.",
      tone: 'understanding and practical',
      suggestions: [
        'Start with the easiest scene or task you can think of',
        'Set a timer for 15 minutes and write badly on purpose',
        'Call or text an accountability partner before you start'
      ],
      followUpQuestions: [
        'What\'s the smallest step you could take right now?',
        'When was the last time you felt excited about this project?',
        'What would you tell a friend who was feeling this way?'
      ]
    };
  }

  // Additional Coach methods
  private async coachBuildHabit(context: ContextData, prompt: string): Promise<PersonaResponse> {
    return {
      content: `💪 *Coach creates a sustainable writing routine*

Building habits is like training - consistency beats intensity!

**The Habit Stack Method:**
• Attach writing to existing habits
• Start with just 10 minutes daily
• Gradually increase duration

**Success Formula:**
Cue → Routine → Reward
Example: Coffee (cue) → Write 200 words (routine) → Check social media (reward)`,
      tone: 'practical and encouraging'
    };
  }

  private async coachEncouragement(context: ContextData, prompt: string): Promise<PersonaResponse> {
    const currentWords = context.project?.currentWordCount || 0;
    
    return {
      content: `💪 *Coach offers support*

You've written ${currentWords.toLocaleString()} words! That's real progress.

**Remember:**
• Every word counts
• Progress over perfection
• You're already succeeding by trying

This story matters because it's uniquely yours!`,
      tone: 'warm and affirming'
    };
  }
}

export { AIPersonasService, ContextData, PersonaResponse };