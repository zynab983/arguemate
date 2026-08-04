let prisma: any;

const isMockMode = typeof window !== 'undefined' || 
  !process.env.DATABASE_URL || 
  process.env.DATABASE_URL.includes('johndoe') || 
  process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

class MockDatabaseClient {
  private users: Map<string, any> = new Map();
  private debates: Map<string, any> = new Map();
  private messages: Map<string, any> = new Map();

  constructor() {
    // Seed a mock user
    this.users.set('demo-user-id', {
      id: 'demo-user-id',
      email: 'demo@arguemate.ai',
      name: 'Demo Debater',
      avatarUrl: null,
      points: 1250,
      rank: 'Expert',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed some mock debates and history
    const d1 = 'mock-debate-1';
    this.debates.set(d1, {
      id: d1,
      userId: 'demo-user-id',
      title: 'Is artificial intelligence a threat to human creativity?',
      category: 'Technology',
      stance: 'FOR',
      difficulty: 'Hard',
      status: 'COMPLETED',
      score: 84,
      feedback: 'Excellent structure and logical arguments. However, watch out for the ad hominem generalization in your third turn. AI creativity can indeed be seen as an extension of human tools.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    const d2 = 'mock-debate-2';
    this.debates.set(d2, {
      id: d2,
      userId: 'demo-user-id',
      title: 'Should universal basic income be implemented globally?',
      category: 'Economics',
      stance: 'AGAINST',
      difficulty: 'Medium',
      status: 'COMPLETED',
      score: 72,
      feedback: 'Solid economics defense, but could rely more on empirical studies from local UBI trials rather than abstract inflation arguments.',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });
  }

  user = {
    findUnique: async ({ where }: any) => {
      if (where.id) return this.users.get(where.id) || null;
      if (where.email) {
        return Array.from(this.users.values()).find(u => u.email === where.email) || null;
      }
      return null;
    },
    create: async ({ data }: any) => {
      const id = data.id || Math.random().toString(36).substring(7);
      const user = {
        id,
        points: 0,
        rank: 'Novice',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data
      };
      this.users.set(id, user);
      return user;
    },
    update: async ({ where, data }: any) => {
      const user = await this.user.findUnique({ where });
      if (!user) throw new Error('User not found');
      const updated = { ...user, ...data, updatedAt: new Date() };
      this.users.set(user.id, updated);
      return updated;
    }
  };

  debate = {
    findMany: async ({ where, orderBy, include }: any) => {
      let results = Array.from(this.debates.values());
      if (where?.userId) {
        results = results.filter(d => d.userId === where.userId);
      }
      // Sort by createdAt descending
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      if (include?.messages) {
        results = results.map(d => ({
          ...d,
          messages: Array.from(this.messages.values())
            .filter(m => m.debateId === d.id)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        }));
      }
      return results;
    },
    findUnique: async ({ where, include }: any) => {
      const debate = this.debates.get(where.id);
      if (!debate) return null;
      if (include?.messages) {
        return {
          ...debate,
          messages: Array.from(this.messages.values())
            .filter(m => m.debateId === debate.id)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        };
      }
      return debate;
    },
    create: async ({ data }: any) => {
      const id = Math.random().toString(36).substring(7);
      const debate = {
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
        ...data
      };
      this.debates.set(id, debate);
      return debate;
    },
    update: async ({ where, data }: any) => {
      const debate = this.debates.get(where.id);
      if (!debate) throw new Error('Debate not found');
      const updated = { ...debate, ...data, updatedAt: new Date() };
      this.debates.set(where.id, updated);
      return updated;
    }
  };

  message = {
    create: async ({ data }: any) => {
      const id = Math.random().toString(36).substring(7);
      const message = {
        id,
        createdAt: new Date(),
        ...data
      };
      this.messages.set(id, message);
      return message;
    }
  };
}

if (isMockMode) {
  if (typeof window === 'undefined') {
    if (!(global as any).mockDb) {
      (global as any).mockDb = new MockDatabaseClient();
    }
    prisma = (global as any).mockDb;
  } else {
    if (!(window as any).mockDb) {
      (window as any).mockDb = new MockDatabaseClient();
    }
    prisma = (window as any).mockDb;
  }
} else {
  try {
    const { PrismaClient } = (require as any)('../generated/prisma/client');
    prisma = new PrismaClient();
  } catch (error) {
    console.error('Failed to initialize Prisma, falling back to mock DB:', error);
    if (typeof window === 'undefined') {
      if (!(global as any).mockDb) {
        (global as any).mockDb = new MockDatabaseClient();
      }
      prisma = (global as any).mockDb;
    } else {
      if (!(window as any).mockDb) {
        (window as any).mockDb = new MockDatabaseClient();
      }
      prisma = (window as any).mockDb;
    }
  }
}

export { prisma, isMockMode };
