import { PrismaClient } from '@worldbest/database';
import { ProjectTemplate } from '../services/template-service';

const prisma = new PrismaClient();

const defaultTemplates: Omit<ProjectTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usage'>[] = [
  {
    name: "Classic Novel Structure",
    description: "A traditional three-act novel structure perfect for character-driven stories. Includes setup for protagonist journey, character development arcs, and satisfying resolution.",
    category: "Novel",
    subcategory: "Literary Fiction",
    tags: ["three-act", "character-driven", "classic", "beginner-friendly"],
    structure: {
      chapters: [
        {
          title: "Opening Hook",
          description: "Introduce your protagonist and world while establishing the central conflict",
          order: 1,
          estimatedWordCount: 3000,
          notes: "Focus on voice and setting. End with an inciting incident.",
          sections: [
            { title: "Character Introduction", content: "", order: 1, type: "prose" },
            { title: "World Building", content: "", order: 2, type: "description" },
            { title: "Inciting Incident", content: "", order: 3, type: "action" }
          ]
        },
        {
          title: "Plot Development",
          description: "Develop the central conflict and introduce complications",
          order: 2,
          estimatedWordCount: 4000,
          notes: "Deepen character relationships and raise stakes"
        },
        {
          title: "Midpoint Turn",
          description: "Major revelation or reversal that changes everything",
          order: 3,
          estimatedWordCount: 3500,
          notes: "This should be a point of no return for your protagonist"
        },
        {
          title: "Rising Action",
          description: "Complications multiply as protagonist struggles toward goal",
          order: 4,
          estimatedWordCount: 4000
        },
        {
          title: "Climax",
          description: "The final confrontation or moment of truth",
          order: 5,
          estimatedWordCount: 3000,
          notes: "All threads should come together here"
        },
        {
          title: "Resolution",
          description: "Tie up loose ends and show the new normal",
          order: 6,
          estimatedWordCount: 2500
        }
      ],
      characters: [
        {
          name: "Protagonist",
          description: "The main character whose journey drives the story",
          role: "protagonist",
          attributes: {
            goals: "What does your protagonist want more than anything?",
            conflicts: "What internal and external obstacles stand in their way?",
            personality: ["determined", "flawed", "relatable"]
          },
          relationships: []
        },
        {
          name: "Antagonist",
          description: "The force opposing your protagonist",
          role: "antagonist",
          attributes: {
            goals: "What does the antagonist want that conflicts with the protagonist?",
            personality: ["intelligent", "motivated", "not purely evil"]
          },
          relationships: [
            { characterName: "Protagonist", relationship: "opposition", description: "Direct conflict over the central goal" }
          ]
        },
        {
          name: "Supporting Character",
          description: "A key ally or friend who helps the protagonist",
          role: "supporting",
          attributes: {
            personality: ["loyal", "helpful", "has own goals"]
          },
          relationships: [
            { characterName: "Protagonist", relationship: "ally", description: "Provides support and guidance" }
          ]
        }
      ],
      worldbuilding: [
        {
          name: "Primary Setting",
          type: "location",
          description: "The main location where your story takes place",
          details: {
            geography: "Describe the physical characteristics",
            culture: "What are the social norms and customs?",
            atmosphere: "What mood does this place evoke?"
          },
          connections: []
        }
      ],
      plotlines: [
        {
          name: "Main Plot",
          description: "The central story arc",
          type: "main",
          structure: [
            { name: "Setup", description: "Establish normal world and protagonist", order: 1, estimatedChapters: [1] },
            { name: "Inciting Incident", description: "The event that starts the story", order: 2, estimatedChapters: [1, 2] },
            { name: "Rising Action", description: "Complications and obstacles", order: 3, estimatedChapters: [2, 3, 4] },
            { name: "Climax", description: "Final confrontation", order: 4, estimatedChapters: [5] },
            { name: "Resolution", description: "Aftermath and new normal", order: 5, estimatedChapters: [6] }
          ]
        }
      ],
      settings: {
        genre: ["Literary Fiction"],
        targetWordCount: 80000,
        targetAudience: "Adult",
        pov: "third-limited",
        tense: "past"
      }
    },
    metadata: {
      difficulty: "beginner",
      estimatedCompletionTime: "6-12 months",
      features: ["Character development framework", "Three-act structure", "Chapter templates", "Character relationship mapping"],
      inspiration: "Based on classic storytelling principles used by successful authors",
      tips: [
        "Focus on one main character's journey",
        "Make sure each chapter advances the plot or develops character",
        "Keep the central conflict clear throughout"
      ]
    },
    isPublic: true,
    isOfficial: true,
    createdBy: "system"
  },
  {
    name: "Fantasy Epic Series",
    description: "A comprehensive template for multi-book fantasy series with detailed world-building, magic systems, and complex character arcs.",
    category: "Fantasy",
    subcategory: "Epic Fantasy",
    tags: ["world-building", "magic-system", "series", "complex"],
    structure: {
      chapters: [
        {
          title: "Prologue: The Ancient Threat",
          description: "Establish the historical background and foreshadow the coming conflict",
          order: 1,
          estimatedWordCount: 2000,
          tags: ["prologue", "world-building", "foreshadowing"]
        },
        {
          title: "The Ordinary World",
          description: "Introduce protagonist in their normal life before adventure begins",
          order: 2,
          estimatedWordCount: 4000
        },
        {
          title: "The Call to Adventure",
          description: "The inciting incident that pulls protagonist into the larger conflict",
          order: 3,
          estimatedWordCount: 3500
        },
        {
          title: "Crossing the Threshold",
          description: "Protagonist leaves familiar world and enters the realm of adventure",
          order: 4,
          estimatedWordCount: 4000
        },
        {
          title: "Allies and Enemies",
          description: "Introduce key supporting characters and establish relationships",
          order: 5,
          estimatedWordCount: 4500
        }
      ],
      characters: [
        {
          name: "The Chosen One",
          description: "Unlikely hero destined to save the world",
          role: "protagonist",
          attributes: {
            background: "Humble origins, unaware of true destiny",
            goals: "Initially: survive and protect loved ones. Later: save the world",
            conflicts: "Self-doubt, lack of training, overwhelming responsibility"
          },
          relationships: []
        },
        {
          name: "The Mentor",
          description: "Wise guide who trains the protagonist",
          role: "supporting",
          attributes: {
            background: "Former hero or scholar with deep knowledge",
            personality: ["wise", "patient", "secretive about past"]
          },
          relationships: [
            { characterName: "The Chosen One", relationship: "mentor", description: "Guides and trains the protagonist" }
          ]
        },
        {
          name: "The Dark Lord",
          description: "Ancient evil threatening to destroy the world",
          role: "antagonist",
          attributes: {
            goals: "Conquer or destroy the world",
            background: "Once good but corrupted by power or betrayal",
            personality: ["powerful", "intelligent", "ruthless"]
          },
          relationships: []
        }
      ],
      worldbuilding: [
        {
          name: "The Magic System",
          type: "magic",
          description: "How magic works in this world",
          details: {
            source: "Where does magical power come from?",
            rules: "What are the limitations and costs?",
            users: "Who can use magic and how do they learn?",
            effects: "What can magic accomplish?"
          },
          connections: []
        },
        {
          name: "The Five Kingdoms",
          type: "politics",
          description: "The major political powers in the world",
          details: {
            structure: "How are the kingdoms organized?",
            relationships: "Alliances, wars, trade agreements",
            rulers: "Who leads each kingdom?"
          },
          connections: [
            { elementName: "The Magic System", connectionType: "governance", description: "How kingdoms regulate magic use" }
          ]
        },
        {
          name: "Ancient History",
          type: "history",
          description: "The historical events that shaped the current world",
          details: {
            creation: "How was the world created?",
            wars: "What major conflicts occurred?",
            prophecies: "What ancient predictions drive current events?"
          },
          connections: []
        }
      ],
      plotlines: [
        {
          name: "Hero's Journey",
          type: "main",
          description: "The protagonist's growth from ordinary person to hero",
          structure: [
            { name: "Call to Adventure", order: 1, estimatedChapters: [1, 2, 3] },
            { name: "Refusal of the Call", order: 2, estimatedChapters: [3, 4] },
            { name: "Meeting the Mentor", order: 3, estimatedChapters: [4, 5] },
            { name: "Tests and Trials", order: 4, estimatedChapters: [6, 7, 8, 9, 10] },
            { name: "The Ordeal", order: 5, estimatedChapters: [11, 12] },
            { name: "Return Transformed", order: 6, estimatedChapters: [13, 14, 15] }
          ]
        },
        {
          name: "Romance Subplot",
          type: "romance",
          description: "Romantic relationship that develops throughout the story",
          structure: [
            { name: "Meeting", order: 1, estimatedChapters: [5] },
            { name: "Conflict and Tension", order: 2, estimatedChapters: [7, 9] },
            { name: "Growing Closer", order: 3, estimatedChapters: [10, 11] },
            { name: "Crisis and Separation", order: 4, estimatedChapters: [12] },
            { name: "Reunion and Commitment", order: 5, estimatedChapters: [14] }
          ]
        }
      ],
      settings: {
        genre: ["Fantasy", "Epic Fantasy", "Adventure"],
        targetWordCount: 120000,
        targetAudience: "Young Adult/Adult",
        pov: "third-limited",
        tense: "past",
        customFields: [
          { name: "Magic Level", type: "select", options: ["Low", "Medium", "High"], required: true },
          { name: "Tech Level", type: "select", options: ["Medieval", "Renaissance", "Industrial"], required: true },
          { name: "Tone", type: "select", options: ["Dark", "Heroic", "Grimdark", "Hopeful"], required: true }
        ]
      }
    },
    metadata: {
      difficulty: "advanced",
      estimatedCompletionTime: "1-2 years",
      prerequisites: ["Experience with world-building", "Understanding of character arcs"],
      features: [
        "Detailed magic system framework",
        "Political structure templates",
        "Multi-book series planning",
        "Complex character relationship mapping",
        "Historical timeline tools"
      ],
      inspiration: "Inspired by works like Lord of the Rings, Wheel of Time, and A Song of Ice and Fire",
      exampleWorks: ["The Lord of the Rings", "The Wheel of Time", "The Stormlight Archive"],
      tips: [
        "Plan your magic system's rules early and stick to them",
        "Create a detailed timeline of historical events",
        "Keep track of character relationships with diagrams",
        "Plan the overall series arc before writing book one"
      ],
      warnings: [
        "This is a complex template requiring significant planning",
        "Consider starting with a simpler fantasy template first",
        "World-building can become overwhelming - stay focused on your story"
      ]
    },
    isPublic: true,
    isOfficial: true,
    createdBy: "system"
  },
  {
    name: "Mystery/Thriller Novel",
    description: "A structured approach to writing compelling mysteries with proper clue placement, red herrings, and satisfying reveals.",
    category: "Mystery",
    subcategory: "Detective Fiction",
    tags: ["clues", "investigation", "suspense", "plot-driven"],
    structure: {
      chapters: [
        {
          title: "The Crime",
          description: "Establish the central mystery that will drive the entire story",
          order: 1,
          estimatedWordCount: 3000,
          notes: "Include the crime scene, initial discovery, and key evidence"
        },
        {
          title: "The Detective Arrives",
          description: "Introduce your protagonist investigator and their initial assessment",
          order: 2,
          estimatedWordCount: 3500
        },
        {
          title: "Initial Investigation",
          description: "First interviews, evidence gathering, and establishing suspects",
          order: 3,
          estimatedWordCount: 4000
        },
        {
          title: "Red Herrings",
          description: "Introduce false leads and misleading evidence",
          order: 4,
          estimatedWordCount: 3500,
          notes: "Plant clues that point in the wrong direction"
        },
        {
          title: "Deeper Investigation",
          description: "Uncover hidden connections and darker secrets",
          order: 5,
          estimatedWordCount: 4000
        },
        {
          title: "The Revelation",
          description: "The detective puts together the final pieces",
          order: 6,
          estimatedWordCount: 3000
        },
        {
          title: "Confrontation",
          description: "The final confrontation with the true perpetrator",
          order: 7,
          estimatedWordCount: 3500
        }
      ],
      characters: [
        {
          name: "Detective/Investigator",
          description: "The protagonist who solves the mystery",
          role: "protagonist",
          attributes: {
            background: "Professional investigator or amateur sleuth",
            personality: ["observant", "logical", "persistent", "has personal flaws"],
            goals: "Solve the mystery and bring justice"
          },
          relationships: []
        },
        {
          name: "The Victim",
          description: "The person at the center of the mystery",
          role: "minor",
          attributes: {
            background: "Complex past that provides motive for murder",
            personality: ["had secrets", "multiple connections to suspects"]
          },
          relationships: []
        },
        {
          name: "Primary Suspect",
          description: "The most obvious suspect (usually a red herring)",
          role: "supporting",
          attributes: {
            personality: ["appears guilty", "has motive", "hides something"]
          },
          relationships: [
            { characterName: "The Victim", relationship: "enemy", description: "Had clear conflict with victim" }
          ]
        },
        {
          name: "The Real Culprit",
          description: "The actual perpetrator",
          role: "antagonist",
          attributes: {
            personality: ["appears innocent", "clever", "good at hiding motives"]
          },
          relationships: [
            { characterName: "The Victim", relationship: "hidden connection", description: "Secret motive for the crime" }
          ]
        }
      ],
      worldbuilding: [
        {
          name: "Crime Scene",
          type: "location",
          description: "Where the central crime took place",
          details: {
            layout: "Detailed physical description",
            evidence: "What clues are present?",
            access: "Who could have entered?"
          },
          connections: []
        },
        {
          name: "Investigation Setting",
          type: "location",
          description: "The broader area where investigation takes place",
          details: {
            community: "Small town, big city, closed community?",
            law_enforcement: "What investigative resources are available?",
            social_dynamics: "How do people interact and keep secrets?"
          },
          connections: []
        }
      ],
      plotlines: [
        {
          name: "Investigation Arc",
          type: "main",
          description: "The progression of the investigation",
          structure: [
            { name: "Crime Discovery", order: 1, estimatedChapters: [1] },
            { name: "Initial Investigation", order: 2, estimatedChapters: [2, 3] },
            { name: "False Leads", order: 3, estimatedChapters: [4, 5] },
            { name: "Breakthrough", order: 4, estimatedChapters: [6] },
            { name: "Final Confrontation", order: 5, estimatedChapters: [7] }
          ]
        },
        {
          name: "Personal Stakes",
          type: "character-arc",
          description: "The detective's personal investment in the case",
          structure: [
            { name: "Professional Interest", order: 1, estimatedChapters: [1, 2] },
            { name: "Personal Connection Revealed", order: 2, estimatedChapters: [3, 4] },
            { name: "Stakes Escalate", order: 3, estimatedChapters: [5, 6] },
            { name: "Personal Resolution", order: 4, estimatedChapters: [7] }
          ]
        }
      ],
      settings: {
        genre: ["Mystery", "Crime", "Thriller"],
        targetWordCount: 75000,
        targetAudience: "Adult",
        pov: "third-limited",
        tense: "past",
        customFields: [
          { name: "Investigation Type", type: "select", options: ["Police Procedural", "Amateur Sleuth", "Private Detective", "Cozy Mystery"], required: true },
          { name: "Crime Type", type: "select", options: ["Murder", "Theft", "Kidnapping", "Fraud", "Other"], required: true },
          { name: "Setting Era", type: "select", options: ["Historical", "Contemporary", "Near Future"], required: true }
        ]
      }
    },
    metadata: {
      difficulty: "intermediate",
      estimatedCompletionTime: "6-10 months",
      prerequisites: ["Understanding of plot structure", "Research skills for crime/investigation"],
      features: [
        "Clue placement framework",
        "Red herring planning",
        "Suspect development tools",
        "Investigation timeline",
        "Evidence tracking system"
      ],
      inspiration: "Based on classic mystery structure from Agatha Christie to modern crime fiction",
      exampleWorks: ["Agatha Christie novels", "Tana French mysteries", "Louise Penny Inspector Gamache series"],
      tips: [
        "Work backwards from the solution to plant clues",
        "Make sure the solution is fair - all clues should be available to readers",
        "Red herrings should be plausible but not more interesting than the real solution",
        "Give your detective a personal stake in solving the case"
      ],
      warnings: [
        "Research is crucial for realistic investigative procedures",
        "Don't make the mystery so complex that readers can't follow it",
        "Avoid introducing the real culprit too late in the story"
      ]
    },
    isPublic: true,
    isOfficial: true,
    createdBy: "system"
  },
  {
    name: "Romance Novel",
    description: "A template for writing compelling romance novels with strong character development, emotional arcs, and satisfying relationships.",
    category: "Romance",
    subcategory: "Contemporary Romance",
    tags: ["relationship", "emotional", "character-driven", "HEA"],
    structure: {
      chapters: [
        {
          title: "Meet Cute",
          description: "The first meeting between the romantic leads",
          order: 1,
          estimatedWordCount: 3000,
          notes: "Should establish chemistry and hint at potential conflict"
        },
        {
          title: "Getting to Know You",
          description: "Characters spend time together and attraction grows",
          order: 2,
          estimatedWordCount: 4000
        },
        {
          title: "First Kiss",
          description: "The relationship becomes romantic",
          order: 3,
          estimatedWordCount: 3500,
          notes: "Usually around 25% mark"
        },
        {
          title: "Deepening Connection",
          description: "Emotional intimacy develops alongside physical attraction",
          order: 4,
          estimatedWordCount: 4000
        },
        {
          title: "The Black Moment",
          description: "Major conflict threatens to end the relationship",
          order: 5,
          estimatedWordCount: 3000,
          notes: "This should feel like they can't possibly get back together"
        },
        {
          title: "Grand Gesture",
          description: "One or both characters fight for their love",
          order: 6,
          estimatedWordCount: 2500
        },
        {
          title: "Happily Ever After",
          description: "Conflict resolved, commitment made",
          order: 7,
          estimatedWordCount: 2000
        }
      ],
      characters: [
        {
          name: "Love Interest #1",
          description: "First romantic protagonist",
          role: "protagonist",
          attributes: {
            background: "What shaped them into who they are?",
            goals: "What do they want in life (besides love)?",
            conflicts: "What internal fears/wounds prevent them from love?",
            personality: ["attractive qualities", "relatable flaws", "growth potential"]
          },
          relationships: []
        },
        {
          name: "Love Interest #2",
          description: "Second romantic protagonist",
          role: "protagonist",
          attributes: {
            background: "Complementary but different from Love Interest #1",
            goals: "Should initially conflict with LI#1's goals",
            conflicts: "Different but compatible emotional wounds",
            personality: ["attractive to LI#1", "has own agency", "grows throughout story"]
          },
          relationships: [
            { characterName: "Love Interest #1", relationship: "romantic tension", description: "Strong attraction with obstacles" }
          ]
        },
        {
          name: "Best Friend/Confidant",
          description: "Provides advice and support",
          role: "supporting",
          attributes: {
            personality: ["loyal", "wise", "sometimes wrong"]
          },
          relationships: []
        }
      ],
      worldbuilding: [
        {
          name: "Setting",
          type: "location",
          description: "Where the romance unfolds",
          details: {
            atmosphere: "Romantic, cozy, or dramatic?",
            opportunities: "Places for characters to meet and spend time",
            obstacles: "How does setting create romantic tension?"
          },
          connections: []
        }
      ],
      plotlines: [
        {
          name: "Romantic Arc",
          type: "romance",
          description: "The development of the central relationship",
          structure: [
            { name: "Attraction", order: 1, estimatedChapters: [1] },
            { name: "Getting to Know Each Other", order: 2, estimatedChapters: [2, 3] },
            { name: "Falling in Love", order: 3, estimatedChapters: [3, 4] },
            { name: "Commitment Issues", order: 4, estimatedChapters: [5] },
            { name: "Declaration of Love", order: 5, estimatedChapters: [6, 7] }
          ]
        },
        {
          name: "External Plot",
          type: "subplot",
          description: "The non-romantic conflict that brings characters together",
          structure: [
            { name: "Setup", order: 1, estimatedChapters: [1, 2] },
            { name: "Complications", order: 2, estimatedChapters: [3, 4] },
            { name: "Crisis", order: 3, estimatedChapters: [5] },
            { name: "Resolution", order: 4, estimatedChapters: [6, 7] }
          ]
        }
      ],
      settings: {
        genre: ["Romance", "Contemporary Romance"],
        targetWordCount: 70000,
        targetAudience: "Adult",
        pov: "third-limited",
        tense: "past",
        customFields: [
          { name: "Heat Level", type: "select", options: ["Sweet", "Sensual", "Steamy"], required: true },
          { name: "Trope", type: "multiselect", options: ["Enemies to Lovers", "Friends to Lovers", "Second Chance", "Fake Dating", "Grumpy/Sunshine"] },
          { name: "Setting Type", type: "select", options: ["Small Town", "Big City", "Workplace", "Holiday", "Other"] }
        ]
      }
    },
    metadata: {
      difficulty: "beginner",
      estimatedCompletionTime: "4-8 months",
      features: [
        "Romantic arc framework",
        "Emotional beat planning",
        "Character chemistry tools",
        "Conflict/tension planning",
        "HEA structure"
      ],
      inspiration: "Based on successful romance novel structure and reader expectations",
      exampleWorks: ["Pride and Prejudice", "The Hating Game", "Beach Read"],
      tips: [
        "Focus on emotional journey as much as external plot",
        "Make sure both characters have agency and growth",
        "Build sexual and emotional tension throughout",
        "The black moment should feel insurmountable"
      ]
    },
    isPublic: true,
    isOfficial: true,
    createdBy: "system"
  }
];

async function seedTemplates() {
  console.log('Starting template seeding...');
  
  try {
    // Clear existing templates if needed
    console.log('Clearing existing templates...');
    await prisma.projectTemplate.deleteMany({
      where: { isOfficial: true }
    });

    // Insert default templates
    console.log('Inserting default templates...');
    for (const template of defaultTemplates) {
      await prisma.projectTemplate.create({
        data: {
          id: require('uuid').v4(),
          name: template.name,
          description: template.description,
          category: template.category,
          subcategory: template.subcategory,
          tags: template.tags,
          structure: JSON.stringify(template.structure),
          metadata: JSON.stringify(template.metadata),
          isPublic: template.isPublic,
          isOfficial: template.isOfficial,
          createdBy: template.createdBy,
          totalUses: 0,
          rating: 0,
          reviewCount: 0
        }
      });
      console.log(`✓ Created template: ${template.name}`);
    }

    console.log('✅ Template seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedTemplates()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedTemplates, defaultTemplates };