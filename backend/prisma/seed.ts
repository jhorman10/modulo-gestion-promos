import { PrismaClient, ProductCategoryType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Seed Products (5 items)
  const products = [
    { name: 'Laptop Gaming', type: ProductCategoryType.PRODUCT },
    { name: 'Mouse Inalámbrico', type: ProductCategoryType.PRODUCT },
    { name: 'Teclado Mecánico', type: ProductCategoryType.PRODUCT },
    { name: 'Monitor 27"', type: ProductCategoryType.PRODUCT },
    { name: 'Auriculares USB', type: ProductCategoryType.PRODUCT },
  ];

  // Seed Categories (3 items)
  const categories = [
    { name: 'Electrónica', type: ProductCategoryType.CATEGORY },
    { name: 'Accesorios', type: ProductCategoryType.CATEGORY },
    { name: 'Computación', type: ProductCategoryType.CATEGORY },
  ];

  // Upsert products
  for (const product of products) {
    await prisma.productCategory.upsert({
      where: {
        name_type: {
          name: product.name,
          type: product.type,
        },
      },
      update: {},
      create: product,
    });
    console.log(`✅ Product: ${product.name}`);
  }

  // Upsert categories
  for (const category of categories) {
    await prisma.productCategory.upsert({
      where: {
        name_type: {
          name: category.name,
          type: category.type,
        },
      },
      update: {},
      create: category,
    });
    console.log(`✅ Category: ${category.name}`);
  }

  const totalProducts = await prisma.productCategory.count({
    where: { type: ProductCategoryType.PRODUCT },
  });
  const totalCategories = await prisma.productCategory.count({
    where: { type: ProductCategoryType.CATEGORY },
  });

  console.log(`\n📊 Seed completed:`);
  console.log(`   Products: ${totalProducts}`);
  console.log(`   Categories: ${totalCategories}`);
  console.log(`   Total: ${totalProducts + totalCategories}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });