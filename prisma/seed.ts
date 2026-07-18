import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding baseline system configuration feature flags...');

  const flags = [
    {
      key: 'ocr-mistral-enabled',
      value: true,
      description: 'Enables the premium Mistral OCR extraction provider instead of local Tesseract.',
    },
    {
      key: 'ai-generation-enabled',
      value: true,
      description: 'Toggles the OpenAI GPT-4o-mini generation service availability.',
    },
  ];

  for (const flag of flags) {
    const upserted = await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { value: flag.value, description: flag.description },
      create: flag,
    });
    console.log(`- Upserted feature flag: ${upserted.key} = ${upserted.value}`);
  }

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
