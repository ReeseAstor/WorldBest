import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Clean existing data
    await prisma.$transaction([
      prisma.notification.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.moderationReport.deleteMany(),
      prisma.importJob.deleteMany(),
      prisma.exportJob.deleteMany(),
      prisma.fineTuneJob.deleteMany(),
      prisma.promptTemplate.deleteMany(),
      prisma.aIGeneration.deleteMany(),
      prisma.referral.deleteMany(),
      prisma.userCredit.deleteMany(),
      prisma.usage.deleteMany(),
      prisma.lineItem.deleteMany(),
      prisma.invoice.deleteMany(),
      prisma.subscriptionAddon.deleteMany(),
      prisma.subscription.deleteMany(),
      prisma.styleProfile.deleteMany(),
      prisma.era.deleteMany(),
      prisma.timelineEvent.deleteMany(),
      prisma.timeline.deleteMany(),
      prisma.economy.deleteMany(),
      prisma.language.deleteMany(),
      prisma.locationCulture.deleteMany(),
      prisma.culture.deleteMany(),
      prisma.location.deleteMany(),
      prisma.relationship.deleteMany(),
      prisma.secret.deleteMany(),
      prisma.character.deleteMany(),
      prisma.placeholder.deleteMany(),
      prisma.textVersion.deleteMany(),
      prisma.sceneCharacter.deleteMany(),
      prisma.scene.deleteMany(),
      prisma.chapter.deleteMany(),
      prisma.book.deleteMany(),
      prisma.projectCollaborator.deleteMany(),
      prisma.project.deleteMany(),
      prisma.teamMember.deleteMany(),
      prisma.team.deleteMany(),
      prisma.apiKey.deleteMany(),
      prisma.session.deleteMany(),
      prisma.userAchievement.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    console.log('✅ Cleaned existing data');

    // Create demo users
    const users = await Promise.all([
      createUser('demo@worldbest.ai', 'Demo User', 'demo123', 'story_starter'),
      createUser('author@worldbest.ai', 'Jane Author', 'author123', 'solo_author'),
      createUser('pro@worldbest.ai', 'Pro Creator', 'pro123', 'pro_creator'),
      createUser('team@worldbest.ai', 'Team Lead', 'team123', 'studio_team'),
    ]);

    console.log('✅ Created demo users');

    // Create a demo team
    const team = await prisma.team.create({
      data: {
        name: 'Story Studios',
        slug: 'story-studios',
        description: 'A creative writing team',
        ownerId: users[3].id,
        plan: 'studio_team',
        billingEmail: 'billing@storystudios.com',
        seatsLimit: 5,
        seatsUsed: 2,
        members: {
          create: [
            {
              userId: users[3].id,
              role: 'owner',
              permissions: ['all'],
              status: 'active',
              invitedBy: users[3].id,
              joinedAt: new Date(),
            },
            {
              userId: users[2].id,
              role: 'editor',
              permissions: ['read', 'write', 'comment'],
              status: 'active',
              invitedBy: users[3].id,
              joinedAt: new Date(),
            },
          ],
        },
      },
    });

    console.log('✅ Created demo team');

    // Create style profiles
    const styleProfiles = await Promise.all([
      prisma.styleProfile.create({
        data: {
          userId: users[1].id,
          name: 'Contemporary Fiction',
          toneFormality: 3,
          toneHumor: 2,
          toneDarkness: 2,
          toneRomance: 3,
          toneAction: 2,
          overallPace: 'moderate',
          dialogueDensity: 'balanced',
          descriptionDetail: 'moderate',
          chapterLength: 'medium',
          vocabComplexity: 'moderate',
          preferredWords: ['vivid', 'compelling', 'nuanced'],
          avoidedWords: ['very', 'really', 'just'],
          useProfanity: false,
          dialectPrefs: ['standard'],
          tabooList: [],
          inspirationAuthors: ['Margaret Atwood', 'Kazuo Ishiguro'],
          exampleExcerpts: [],
        },
      }),
      prisma.styleProfile.create({
        data: {
          userId: users[2].id,
          name: 'Epic Fantasy',
          toneFormality: 4,
          toneHumor: 1,
          toneDarkness: 3,
          toneRomance: 2,
          toneAction: 5,
          overallPace: 'fast',
          dialogueDensity: 'sparse',
          descriptionDetail: 'rich',
          chapterLength: 'long',
          vocabComplexity: 'complex',
          preferredWords: ['ancient', 'mystical', 'formidable'],
          avoidedWords: ['okay', 'awesome', 'cool'],
          useProfanity: false,
          dialectPrefs: ['archaic', 'formal'],
          tabooList: [],
          inspirationAuthors: ['Brandon Sanderson', 'Patrick Rothfuss'],
          exampleExcerpts: [],
        },
      }),
    ]);

    console.log('✅ Created style profiles');

    // Create demo projects
    for (const user of users.slice(1)) {
      const project = await createDemoProject(user.id, styleProfiles[0].id);
      console.log(`✅ Created demo project for ${user.email}`);
    }

    // Create team project
    const teamProject = await createDemoProject(users[3].id, styleProfiles[1].id, team.id);
    console.log('✅ Created team project');

    // Create subscriptions
    for (const user of users) {
      await createSubscription(user.id, user.plan as string);
    }

    console.log('✅ Created subscriptions');

    // Create prompt templates
    await createPromptTemplates();
    console.log('✅ Created prompt templates');

    console.log('🎉 Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createUser(email: string, displayName: string, password: string, plan: string) {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  return prisma.user.create({
    data: {
      email,
      username: email.split('@')[0],
      displayName,
      passwordHash: hashedPassword,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      plan,
      billingCustomerId: `cus_${faker.string.alphanumeric(14)}`,
    },
  });
}

async function createDemoProject(userId: string, styleProfileId: string, teamId?: string) {
  const genres = ['Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Thriller'];
  const genre = faker.helpers.arrayElement(genres);

  const project = await prisma.project.create({
    data: {
      ownerId: userId,
      teamId,
      title: faker.company.catchPhrase(),
      synopsis: faker.lorem.paragraph(3),
      genre,
      styleProfileId,
      defaultLanguage: 'en-US',
      contentRating: 'PG-13',
      draftModel: 'gpt-4',
      polishModel: 'gpt-4',
      books: {
        create: [
          {
            title: 'Book One: ' + faker.company.catchPhrase(),
            order: 1,
            blurb: faker.lorem.paragraph(2),
            targetWordCount: 80000,
            status: 'drafting',
            chapters: {
              create: Array.from({ length: 5 }, (_, i) => ({
                number: i + 1,
                title: `Chapter ${i + 1}: ${faker.company.catchPhrase()}`,
                summary: faker.lorem.paragraph(),
                targetWordCount: 3000,
                status: i === 0 ? 'complete' : 'outlined',
                scenes: {
                  create: Array.from({ length: 3 }, (_, j) => ({
                    title: faker.company.catchPhrase(),
                    mood: faker.helpers.arrayElement(['tense', 'romantic', 'mysterious', 'action-packed']),
                    conflict: faker.lorem.sentence(),
                    resolution: j === 2 ? faker.lorem.sentence() : null,
                  })),
                },
              })),
            },
          },
        ],
      },
      characters: {
        create: Array.from({ length: 5 }, () => createCharacterData()),
      },
      locations: {
        create: Array.from({ length: 3 }, () => createLocationData()),
      },
    },
    include: {
      books: {
        include: {
          chapters: {
            include: {
              scenes: true,
            },
          },
        },
      },
      characters: true,
      locations: true,
    },
  });

  // Add relationships between characters
  const characters = project.characters;
  if (characters.length >= 2) {
    await prisma.relationship.create({
      data: {
        characterId: characters[0].id,
        relatedCharId: characters[1].id,
        relationshipType: 'friend',
        description: 'Childhood friends who grew up together',
        dynamics: 'Supportive but sometimes competitive',
        tensionPoints: ['Different life goals', 'Past romantic interest'],
      },
    });
  }

  // Add text versions to scenes
  const scenes = project.books[0].chapters.flatMap((c: any) => c.scenes);
  for (const scene of scenes.slice(0, 3)) {
    await prisma.textVersion.create({
      data: {
        sceneId: scene.id,
        authorId: userId,
        content: faker.lorem.paragraphs(5, '\n\n'),
        summary: faker.lorem.paragraph(),
        semanticHash: faker.string.alphanumeric(32),
        wordCount: faker.number.int({ min: 500, max: 2000 }),
        aiGenerated: false,
      },
    });
  }

  return project;
}

function createCharacterData() {
  return {
    name: faker.person.fullName(),
    aliases: [faker.person.firstName()],
    age: faker.number.int({ min: 18, max: 65 }),
    gender: faker.helpers.arrayElement(['male', 'female', 'non-binary']),
    mbti: faker.helpers.arrayElement(['INTJ', 'ENFP', 'ISTP', 'ESFJ', 'INFJ', 'ENTP']),
    height: faker.helpers.arrayElement(['tall', 'average', 'short']),
    build: faker.helpers.arrayElement(['athletic', 'slim', 'stocky', 'average']),
    hair: faker.color.human() + ' hair',
    eyes: faker.color.human() + ' eyes',
    distinguishingFeatures: [faker.lorem.words(3)],
    coreTraits: Array.from({ length: 3 }, () => faker.person.zodiacSign()),
    quirks: [faker.lorem.words(2)],
    fears: [faker.lorem.words(3)],
    desires: [faker.lorem.words(3)],
    values: [faker.lorem.words(2)],
    flaws: [faker.lorem.words(2)],
    strengths: [faker.lorem.words(2)],
    weaknesses: [faker.lorem.words(2)],
    backstory: faker.lorem.paragraph(3),
    vocabularyLevel: 'moderate',
    speechPatterns: [faker.lorem.words(3)],
    catchphrases: [faker.company.catchPhrase()],
    formality: 'neutral',
  };
}

function createLocationData() {
  return {
    name: faker.location.city(),
    region: faker.location.state(),
    description: faker.lorem.paragraph(2),
    terrain: faker.helpers.arrayElement(['mountains', 'plains', 'forest', 'desert', 'coastal']),
    climate: faker.helpers.arrayElement(['temperate', 'tropical', 'arctic', 'desert', 'mediterranean']),
    flora: Array.from({ length: 3 }, () => faker.lorem.word()),
    fauna: Array.from({ length: 3 }, () => faker.animal.type()),
    resources: Array.from({ length: 2 }, () => faker.commerce.productMaterial()),
    hazards: [faker.lorem.words(2)],
    atmosphere: faker.lorem.sentence(),
    significance: faker.lorem.sentence(),
  };
}

async function createSubscription(userId: string, plan: string) {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const tokenLimits: Record<string, number> = {
    story_starter: 10000,
    solo_author: 50000,
    pro_creator: 200000,
    studio_team: 500000,
    enterprise: 2000000,
  };

  return prisma.subscription.create({
    data: {
      userId,
      plan,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
      stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
      seats: plan === 'studio_team' ? 5 : 1,
      aiTokensPerMonth: tokenLimits[plan] || 10000,
      storageGb: plan === 'enterprise' ? 1000 : plan === 'studio_team' ? 100 : 10,
    },
  });
}

async function createPromptTemplates() {
  const templates = [
    {
      name: 'Scene Expansion',
      description: 'Expand a brief scene outline into a full narrative',
      persona: 'muse',
      intent: 'generate_scene',
      systemPrompt: 'You are a creative writing assistant specializing in scene development.',
      userPromptTemplate: 'Expand this scene outline into a detailed narrative:\n\n{{outline}}\n\nInclude: {{requirements}}',
      variables: JSON.stringify([
        { name: 'outline', type: 'string', required: true },
        { name: 'requirements', type: 'string', required: false },
      ]),
      isPublic: true,
      category: 'scene',
      tags: ['scene', 'expansion', 'narrative'],
    },
    {
      name: 'Character Voice',
      description: 'Generate dialogue in a specific character voice',
      persona: 'muse',
      intent: 'create_dialogue',
      systemPrompt: 'You are an expert at creating authentic character dialogue.',
      userPromptTemplate: 'Write dialogue for {{character}} in this situation:\n\n{{situation}}',
      variables: JSON.stringify([
        { name: 'character', type: 'string', required: true },
        { name: 'situation', type: 'string', required: true },
      ]),
      isPublic: true,
      category: 'dialogue',
      tags: ['dialogue', 'character', 'voice'],
    },
    {
      name: 'Plot Beat Analysis',
      description: 'Analyze story structure and suggest improvements',
      persona: 'coach',
      intent: 'analyze',
      systemPrompt: 'You are a story structure expert who helps writers improve their plots.',
      userPromptTemplate: 'Analyze the plot structure of:\n\n{{plot_summary}}\n\nFocus on: {{focus_areas}}',
      variables: JSON.stringify([
        { name: 'plot_summary', type: 'string', required: true },
        { name: 'focus_areas', type: 'string', required: false },
      ]),
      isPublic: true,
      category: 'analysis',
      tags: ['plot', 'structure', 'analysis'],
    },
  ];

  for (const template of templates) {
    await prisma.promptTemplate.create({ data: template });
  }
}

// Run the seed
seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });