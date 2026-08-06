import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

const products = [
  {
    slug: "max-flex",
    name: "Max Flex",
    priceCents: 1000,
    description:
      "Meet the Max Flex Trophy Truck! This awesome off-road truck is built to bend and twist over the biggest bumps and rocks without ever getting stuck.",
    images: [
      "/products/max-flex-1.jpg",
      "/products/max-flex-2.jpg",
      "/products/max-flex-3.jpg",
      "/products/max-flex-4.jpg",
      "/products/max-flex-5.jpg",
      "/products/max-flex-6.jpg",
      "/products/max-flex-7.jpg",
    ],
    downloadFilePath: "product-files/max-flex-instructions.pdf",
  },
  {
    slug: "bee-buggy",
    name: "Bee Buggy",
    priceCents: 1200,
    description:
      "Sting the competition and tear up the dunes with the Bee Buggy. Sporting a striking high-visibility yellow and black color scheme, this custom off-road machine combines eye-catching looks with agile performance.",
    images: [
      "/products/bee-buggy-1.jpg",
      "/products/bee-buggy-2.jpg",
      "/products/bee-buggy-3.jpg",
      "/products/bee-buggy-4.jpg",
    ],
    downloadFilePath: "product-files/bee-buggy-instructions.pdf",
  },
  {
    slug: "trophy-truck",
    name: "Trophy Truck",
    priceCents: 0,
    description:
      "Dominate the off-road with the ultimate brick-built powerhouse. Engineered for high-speed desert racing and rugged terrain, this Custom LEGO Trophy Truck brings authentic motorsport performance straight to your build table.",
    images: ["/products/trophy-truck-1.jpg", "/products/trophy-truck-2.jpg"],
    downloadFilePath: "product-files/trophy-truck-instructions.pdf",
  },
  {
    slug: "semi-truck",
    name: "Semi Truck",
    priceCents: 0,
    description:
      "Haul big builds with this custom brick-built Semi Truck. Built for presence on the table and fun on the floor — a bold Badlands Bricks original.",
    images: ["/products/semi-truck-1.jpg", "/products/semi-truck-2.jpg"],
    downloadFilePath: "product-files/semi-truck-instructions.pdf",
  },
];

function ensurePlaceholderPdf(relativePath: string, title: string) {
  const fullPath = join(process.cwd(), relativePath);
  const dir = join(fullPath, "..");
  mkdirSync(dir, { recursive: true });
  if (existsSync(fullPath)) return;

  const content = `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 68 >>stream
BT /F1 24 Tf 72 720 Td (${title} Instructions - Replace with real PDF) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000386 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
465
%%EOF
`;
  writeFileSync(fullPath, content, "utf8");
}

async function main() {
  mkdirSync(join(process.cwd(), "uploads"), { recursive: true });
  mkdirSync(join(process.cwd(), "product-files"), { recursive: true });
  mkdirSync(join(process.cwd(), "public", "products"), { recursive: true });

  for (const product of products) {
    ensurePlaceholderPdf(product.downloadFilePath, product.name);
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        priceCents: product.priceCents,
        description: product.description,
        imagesJson: JSON.stringify(product.images),
        downloadFilePath: product.downloadFilePath,
        isActive: true,
      },
      create: {
        slug: product.slug,
        name: product.name,
        priceCents: product.priceCents,
        description: product.description,
        imagesJson: JSON.stringify(product.images),
        downloadFilePath: product.downloadFilePath,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
