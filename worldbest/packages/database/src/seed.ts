import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.projectCollaborator.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  console.log('✨ Cleaned existing data');

  // Create demo users
  const hashedPassword = await bcrypt.hash('Demo123!@#', 12);

  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@worldbest.ai',
      displayName: 'Demo User',
      username: 'demouser',
      password: hashedPassword,
      role: 'user',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      plan: 'pro_creator',
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@worldbest.ai',
      displayName: 'Admin User',
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      plan: 'enterprise',
    },
  });

  const collaboratorUser = await prisma.user.create({
    data: {
      email: 'collaborator@worldbest.ai',
      displayName: 'Collaborator User',
      username: 'collaborator',
      password: hashedPassword,
      role: 'user',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      plan: 'solo_author',
    },
  });

  console.log('👥 Created demo users');

  // Create a team
  const team = await prisma.team.create({
    data: {
      name: 'Demo Writers Studio',
      slug: 'demo-writers-studio',
      description: 'A collaborative writing studio for demonstration',
      ownerId: adminUser.id,
      plan: 'studio_team',
      billingEmail: 'billing@worldbest.ai',
      seatsLimit: 5,
      seatsUsed: 2,
      members: {
        create: [
          {
            userId: adminUser.id,
            role: 'admin',
            permissions: ['all'],
            status: 'active',
            invitedBy: adminUser.id,
            joinedAt: new Date(),
          },
          {
            userId: demoUser.id,
            role: 'editor',
            permissions: ['read', 'write', 'comment'],
            status: 'active',
            invitedBy: adminUser.id,
            joinedAt: new Date(),
          },
        ],
      },
    },
  });

  console.log('👥 Created demo team');

  // Create sample projects
  const fantasyProject = await prisma.project.create({
    data: {
      title: 'The Chronicles of Aetheria',
      synopsis: 'An epic fantasy saga following the journey of unlikely heroes as they navigate political intrigue, ancient magic, and world-ending threats in the realm of Aetheria.',
      genre: 'fantasy',
      ownerId: demoUser.id,
      teamId: team.id,
      targetAudience: 'young-adult',
      contentRating: 'PG-13',
      visibility: 'team',
      collaborators: {
        create: {
          userId: collaboratorUser.id,
          role: 'editor',
          permissions: ['read', 'write', 'comment'],
        },
      },
    },
  });

  const sciFiProject = await prisma.project.create({
    data: {
      title: 'Quantum Paradox',
      synopsis: 'A hard science fiction thriller exploring the consequences of time travel and parallel universes when a physicist discovers a way to communicate with alternate versions of herself.',
      genre: 'sci-fi',
      ownerId: demoUser.id,
      targetAudience: 'adult',
      contentRating: 'R',
      visibility: 'private',
      draftModel: 'gpt-4',
      polishModel: 'claude-3',
      temperatureDraft: 0.8,
      temperaturePolish: 0.4,
    },
  });

  const mysteryProject = await prisma.project.create({
    data: {
      title: 'The Lighthouse Keeper\'s Secret',
      synopsis: 'A psychological mystery set in a remote coastal town where a detective investigates a series of disappearances linked to an abandoned lighthouse with a dark history.',
      genre: 'mystery',
      ownerId: collaboratorUser.id,
      targetAudience: 'adult',
      contentRating: 'PG-13',
      visibility: 'private',
    },
  });

  console.log('📚 Created sample projects');

  // Create books for the fantasy project
  const book1 = await prisma.book.create({
    data: {
      projectId: fantasyProject.id,
      title: 'The Awakening',
      order: 1,
      blurb: 'The prophecy begins to unfold as ancient powers stir in the forgotten corners of Aetheria.',
      targetWordCount: 90000,
      status: 'drafting',
    },
  });

  const book2 = await prisma.book.create({
    data: {
      projectId: fantasyProject.id,
      title: 'The Gathering Storm',
      order: 2,
      blurb: 'Alliances form and betrayals emerge as the true enemy reveals itself.',
      targetWordCount: 95000,
      status: 'planning',
    },
  });

  console.log('📖 Created sample books');

  // Create chapters for book 1
  const chapter1 = await prisma.chapter.create({
    data: {
      bookId: book1.id,
      number: 1,
      title: 'The Stranger\'s Arrival',
      summary: 'A mysterious traveler arrives in the village of Millhaven, bringing news of dark omens from the capital.',
      targetWordCount: 4500,
      status: 'completed',
    },
  });

  const chapter2 = await prisma.chapter.create({
    data: {
      bookId: book1.id,
      number: 2,
      title: 'Whispers in the Dark',
      summary: 'Strange dreams plague the villagers as an ancient artifact is discovered in the old ruins.',
      targetWordCount: 5000,
      status: 'drafting',
    },
  });

  console.log('📄 Created sample chapters');

  // Create characters for the fantasy project
  const mainCharacter = await prisma.character.create({
    data: {
      projectId: fantasyProject.id,
      name: 'Lyra Starweaver',
      aliases: ['The Chosen One', 'Heir of Light'],
      age: 19,
      gender: 'female',
      mbti: 'INFJ',
      coreTraits: ['brave', 'compassionate', 'determined'],
      fears: ['losing loved ones', 'failing her destiny'],
      desires: ['peace for the realm', 'understanding her powers'],
      backstory: 'Raised as an orphan in a small village, Lyra discovers on her 19th birthday that she is the last descendant of an ancient line of mage-warriors destined to protect Aetheria from the returning darkness.',
    },
  });

  const mentor = await prisma.character.create({
    data: {
      projectId: fantasyProject.id,
      name: 'Master Aldric Greystone',
      age: 67,
      gender: 'male',
      mbti: 'INTJ',
      coreTraits: ['wise', 'secretive', 'protective'],
      fears: ['the prophecy failing', 'his past catching up'],
      desires: ['redemption', 'to see Lyra succeed'],
      backstory: 'Former high mage of the royal court, now living in exile after a catastrophic failure twenty years ago. He recognizes Lyra\'s potential and becomes her reluctant mentor.',
    },
  });

  console.log('👤 Created sample characters');

  // Create locations
  const location1 = await prisma.location.create({
    data: {
      projectId: fantasyProject.id,
      name: 'Millhaven Village',
      region: 'Western Lowlands',
      description: 'A peaceful farming village nestled between rolling hills and ancient forests. Known for its weekly markets and the mysterious Stone Circle on the nearby hilltop.',
      terrain: 'grassland',
      climate: 'temperate',
      significance: 'Starting point of the hero\'s journey',
    },
  });

  const location2 = await prisma.location.create({
    data: {
      projectId: fantasyProject.id,
      name: 'The Sunspire Citadel',
      region: 'Central Mountains',
      description: 'The ancient seat of power for the kingdom, built into a mountain peak that seems to touch the sky. Its towers are said to channel pure sunlight into magical energy.',
      terrain: 'mountainous',
      climate: 'alpine',
      significance: 'Center of magical learning and political power',
    },
  });

  console.log('🗺️ Created sample locations');

  // Create a culture
  const culture = await prisma.culture.create({
    data: {
      projectId: fantasyProject.id,
      name: 'Aetherians',
      norms: ['hospitality to strangers', 'respect for elders', 'magical aptitude testing at age 16'],
      rituals: ['Harvest Moon Festival', 'Coming of Age Ceremony', 'Remembrance of the Fallen'],
      government: 'Constitutional Monarchy with a Council of Mages',
      religion: 'Worship of the Seven Celestial Aspects',
      values: ['honor', 'knowledge', 'balance between magic and nature'],
      taboos: ['blood magic', 'necromancy', 'breaking guest rights'],
    },
  });

  console.log('🏛️ Created sample culture');

  // Create a timeline
  const timeline = await prisma.timeline.create({
    data: {
      projectId: fantasyProject.id,
      name: 'History of Aetheria',
      events: {
        create: [
          {
            date: 'Year 0 - The Founding',
            title: 'The First Kingdom',
            description: 'The seven tribes unite under the first High King, establishing the Kingdom of Aetheria.',
            impact: 'major',
            tags: ['founding', 'political', 'historical'],
          },
          {
            date: 'Year 847 - The Great War',
            title: 'The Shadow Invasion',
            description: 'Dark forces from beyond the Veil invade Aetheria, leading to a century of conflict.',
            impact: 'major',
            tags: ['war', 'magic', 'darkness'],
          },
          {
            date: 'Year 1205 - Present Day',
            title: 'The New Prophecy',
            description: 'Signs indicate the return of the Shadow, and a new chosen one must rise.',
            impact: 'major',
            tags: ['prophecy', 'current', 'plot'],
          },
        ],
      },
    },
  });

  console.log('⏰ Created sample timeline');

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: demoUser.id,
        action: 'project.create',
        resourceType: 'project',
        resourceId: fantasyProject.id,
        metadata: { title: 'The Chronicles of Aetheria' },
      },
      {
        userId: demoUser.id,
        action: 'character.create',
        resourceType: 'character',
        resourceId: mainCharacter.id,
        metadata: { name: 'Lyra Starweaver' },
      },
      {
        userId: adminUser.id,
        action: 'team.create',
        resourceType: 'team',
        resourceId: team.id,
        metadata: { name: 'Demo Writers Studio' },
      },
    ],
  });

  console.log('📝 Created audit logs');

  console.log('✅ Seed completed successfully!');
  console.log('\n🔑 Demo credentials:');
  console.log('   Email: demo@worldbest.ai');
  console.log('   Password: Demo123!@#');
  console.log('\n   Admin Email: admin@worldbest.ai');
  console.log('   Admin Password: Demo123!@#');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });