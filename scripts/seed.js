const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const initialConfessions = [
    {
        id: 'seed-1',
        content: "I have a crush on my classmate but I'm too shy to talk to them 😳",
        timestamp: new Date(),
        upvotes: 15,
        downvotes: 2,
        tags: ['crush', 'confession'],
        isReported: false,
        reportCount: 0,
        replies: []
    },
    {
        id: 'seed-2',
        content: "Sometimes I pretend to understand in lectures but I'm completely lost",
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        upvotes: 42,
        downvotes: 1,
        tags: ['college', 'relatable'],
        isReported: false,
        reportCount: 0,
        replies: []
    },
    {
        id: 'seed-3',
        content: "I think the campus food is actually pretty good, don't @ me",
        timestamp: new Date(Date.now() - 172800000), // 2 days ago
        upvotes: 5,
        downvotes: 12,
        tags: ['unpopular-opinion', 'food'],
        isReported: false,
        reportCount: 0,
        replies: []
    }
];

async function main() {
    console.log('🌱 Seeding database...');

    for (const c of initialConfessions) {
        try {
            const exists = await prisma.confession.findUnique({ where: { id: c.id } });
            if (!exists) {
                await prisma.confession.create({
                    data: {
                        id: c.id,
                        content: c.content,
                        timestamp: c.timestamp,
                        upvotes: c.upvotes,
                        downvotes: c.downvotes,
                        tags: c.tags,
                        isReported: c.isReported,
                        reportCount: c.reportCount,
                    }
                });
                console.log(`Created confession: ${c.id}`);
            } else {
                console.log(`Confession ${c.id} already exists`);
            }
        } catch (e) {
            console.error(`Error seeding ${c.id}:`, e);
        }
    }

    console.log('✅ Seeding complete');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
