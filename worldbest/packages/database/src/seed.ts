import { PrismaClient } from '@prisma/client';
import { SubscriptionPlan, UserRole } from '@worldbest/shared-types';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@worldbest.ai' },
    update: {},
    create: {
      email: 'admin@worldbest.ai',
      display_name: 'Admin User',
      username: 'admin',
      password_hash: adminPassword,
      plan: SubscriptionPlan.ENTERPRISE,
      roles: [UserRole.SUPER_ADMIN],
      email_verified: true,
      email_verified_at: new Date(),
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create demo user
  const demoPassword = await bcrypt.hash('demo123!', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@worldbest.ai' },
    update: {},
    create: {
      email: 'demo@worldbest.ai',
      display_name: 'Demo User',
      username: 'demo',
      password_hash: demoPassword,
      plan: SubscriptionPlan.PRO_CREATOR,
      roles: [UserRole.USER],
      email_verified: true,
      email_verified_at: new Date(),
    },
  });

  console.log('✅ Demo user created:', demoUser.email);

  // Create sample project
  const project = await prisma.project.create({
    data: {
      owner_id: demoUser.id,
      title: 'The Chronicles of Aetheria',
      synopsis: 'A fantasy epic about a young mage discovering her powers in a world where magic is forbidden.',
      genre: 'Fantasy',
      default_language: 'en-US',
      time_period: 'Medieval',
      target_audience: 'Young Adult',
      content_rating: 'PG-13',
      draft_model: 'gpt-4',
      polish_model: 'gpt-4',
      temperature_draft: 0.7,
      temperature_polish: 0.3,
      max_tokens_per_generation: 2000,
      visibility: 'private',
    },
  });

  console.log('✅ Sample project created:', project.title);

  // Create sample book
  const book = await prisma.book.create({
    data: {
      project_id: project.id,
      title: 'Book 1: The Awakening',
      order: 1,
      blurb: 'Elena discovers her magical abilities and must learn to control them while evading the authorities.',
      target_word_count: 80000,
      status: 'planning',
    },
  });

  console.log('✅ Sample book created:', book.title);

  // Create sample chapters
  const chapters = [
    {
      title: 'The Discovery',
      number: 1,
      summary: 'Elena accidentally uses magic for the first time.',
      target_word_count: 3000,
    },
    {
      title: 'The Hunt Begins',
      number: 2,
      summary: 'The authorities start searching for the source of the magical disturbance.',
      target_word_count: 3000,
    },
    {
      title: 'The Mentor',
      number: 3,
      summary: 'Elena meets an old wizard who offers to teach her.',
      target_word_count: 3000,
    },
  ];

  for (const chapterData of chapters) {
    await prisma.chapter.create({
      data: {
        book_id: book.id,
        ...chapterData,
        status: 'outlined',
      },
    });
  }

  console.log('✅ Sample chapters created');

  // Create sample characters
  const characters = [
    {
      name: 'Elena Blackwood',
      age: 17,
      gender: 'Female',
      mbti: 'INFP',
      height: '5\'6"',
      build: 'Slim',
      hair: 'Dark brown, shoulder-length',
      eyes: 'Hazel',
      distinguishing_features: ['Small scar on left hand', 'Always wears a silver pendant'],
      clothing_style: 'Practical, earth tones',
      appearance_description: 'A young woman with an air of quiet determination and hidden strength.',
      core_traits: ['Curious', 'Brave', 'Compassionate', 'Stubborn'],
      quirks: ['Tends to fidget with her pendant when nervous', 'Talks to herself when thinking'],
      fears: ['Hurting others with her magic', 'Being discovered'],
      desires: ['To master her powers', 'To protect her family'],
      values: ['Family', 'Truth', 'Justice'],
      flaws: ['Impatient', 'Self-doubting', 'Takes too many risks'],
      strengths: ['Natural magical ability', 'Quick learner', 'Loyal'],
      weaknesses: ['Lack of control', 'Emotional', 'Reckless'],
      backstory: 'Elena grew up in a small village where magic was forbidden. She always felt different but never knew why until her powers manifested during a crisis.',
      vocabulary_level: 'moderate',
      speech_patterns: ['Uses simple, direct language', 'Occasionally uses old-fashioned phrases'],
      catchphrases: ['"I have to try"', '"There must be another way"'],
      dialect: 'Rural',
      formality: 'casual',
    },
    {
      name: 'Marcus the Wise',
      age: 67,
      gender: 'Male',
      mbti: 'INTJ',
      height: '6\'2"',
      build: 'Tall and lean',
      hair: 'White, long beard',
      eyes: 'Piercing blue',
      distinguishing_features: ['Deep wrinkles around eyes', 'Staff with crystal orb'],
      clothing_style: 'Robe and cloak, deep blue colors',
      appearance_description: 'An elderly man with an aura of ancient wisdom and quiet power.',
      core_traits: ['Wise', 'Patient', 'Mysterious', 'Protective'],
      quirks: ['Always carries his staff', 'Speaks in riddles'],
      fears: ['Elena being discovered too early', 'The return of dark magic'],
      desires: ['To pass on his knowledge', 'To prevent magical catastrophe'],
      values: ['Knowledge', 'Balance', 'Protection'],
      flaws: ['Secretive', 'Overprotective', 'Stubborn'],
      strengths: ['Master of multiple magical disciplines', 'Centuries of experience', 'Calm under pressure'],
      weaknesses: ['Old age limits physical abilities', 'Haunted by past mistakes'],
      backstory: 'Marcus was once a powerful court wizard who went into hiding after a magical disaster. He has been waiting for the right student to pass on his knowledge.',
      vocabulary_level: 'complex',
      speech_patterns: ['Uses archaic language', 'Speaks in metaphors'],
      catchphrases: ['"Magic is not a tool, it is a responsibility"', '"The old ways hold wisdom"'],
      dialect: 'Formal',
      formality: 'formal',
    },
  ];

  for (const characterData of characters) {
    await prisma.character.create({
      data: {
        project_id: project.id,
        ...characterData,
      },
    });
  }

  console.log('✅ Sample characters created');

  // Create sample locations
  const locations = [
    {
      name: 'Millbrook Village',
      region: 'Northern Kingdoms',
      description: 'A small, peaceful village nestled in a valley. Known for its mill and friendly inhabitants.',
      time_period: 'Medieval',
      terrain: 'Rolling hills and forest',
      climate: 'Temperate',
      flora: ['Oak trees', 'Wildflowers', 'Herbs'],
      fauna: ['Deer', 'Rabbits', 'Songbirds'],
      resources: ['Fresh water', 'Timber', 'Herbs'],
      hazards: ['Occasional bandits', 'Wild animals'],
      atmosphere: 'Peaceful and idyllic',
      significance: 'Elena\'s hometown and where her story begins',
    },
    {
      name: 'The Crystal Caves',
      region: 'Mystic Mountains',
      description: 'A network of caves filled with glowing crystals that amplify magical energy.',
      time_period: 'Ancient',
      terrain: 'Underground caverns',
      climate: 'Cool and damp',
      flora: ['Glowing mushrooms', 'Crystal formations'],
      fauna: ['Cave bats', 'Crystal spiders'],
      resources: ['Magic crystals', 'Rare minerals'],
      hazards: ['Unstable crystals', 'Dark magic residue'],
      atmosphere: 'Mysterious and otherworldly',
      significance: 'Where Marcus teaches Elena advanced magic',
    },
  ];

  for (const locationData of locations) {
    await prisma.location.create({
      data: {
        project_id: project.id,
        ...locationData,
      },
    });
  }

  console.log('✅ Sample locations created');

  // Create sample style profile
  const styleProfile = await prisma.styleProfile.create({
    data: {
      user_id: demoUser.id,
      name: 'Fantasy Adventure',
      tone_formality: 3,
      tone_humor: 2,
      tone_darkness: 3,
      tone_romance: 2,
      tone_action: 4,
      overall_pace: 'moderate',
      dialogue_density: 'balanced',
      description_detail: 'rich',
      chapter_length: 'medium',
      vocab_complexity: 'moderate',
      preferred_words: ['mystical', 'ancient', 'powerful', 'magical'],
      avoided_words: ['modern', 'technology', 'contemporary'],
      use_profanity: false,
      dialect_prefs: ['fantasy', 'medieval'],
      taboo_list: ['explicit violence', 'sexual content'],
      inspiration_authors: ['J.R.R. Tolkien', 'Ursula K. Le Guin', 'Brandon Sanderson'],
      example_excerpts: [
        'The ancient oak stood sentinel over the village, its branches reaching toward the heavens like gnarled fingers.',
        'Magic coursed through her veins like liquid fire, both terrifying and exhilarating.',
      ],
    },
  });

  console.log('✅ Sample style profile created');

  // Update project with style profile
  await prisma.project.update({
    where: { id: project.id },
    data: { style_profile_id: styleProfile.id },
  });

  console.log('🌱 Database seed completed successfully!');
  console.log('\n📋 Created:');
  console.log('  - Admin user: admin@worldbest.ai (password: admin123!)');
  console.log('  - Demo user: demo@worldbest.ai (password: demo123!)');
  console.log('  - Sample project: The Chronicles of Aetheria');
  console.log('  - Sample book: Book 1: The Awakening');
  console.log('  - 3 sample chapters');
  console.log('  - 2 sample characters');
  console.log('  - 2 sample locations');
  console.log('  - 1 style profile');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });