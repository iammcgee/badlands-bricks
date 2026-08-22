import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { publishApprovedMocToBuild } from "../src/lib/moc-publish";

const prisma = new PrismaClient();

const products = [
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

function looksLikeSeededMaxFlex(product: {
  mocSubmissionId: string | null;
  slug: string;
  name: string;
  downloadFilePath: string | null;
  imagesJson: string;
  creator: { slug: string };
}) {
  if (product.mocSubmissionId) return false;
  const images = product.imagesJson.toLowerCase();
  return (
    product.slug === "max-flex" ||
    product.slug.startsWith("max-flex-") ||
    product.name.toLowerCase() === "max flex" ||
    product.downloadFilePath === "product-files/max-flex-instructions.pdf" ||
    images.includes("/products/max-flex-") ||
    (product.creator.slug === "badlands-bricks" &&
      product.name.toLowerCase().includes("max flex"))
  );
}

async function restoreCommunityMaxFlex() {
  // 1) Remove the original Badlands catalog Max Flex (not tied to a submission).
  const catalogCandidates = await prisma.product.findMany({
    where: {
      mocSubmissionId: null,
      OR: [
        { slug: "max-flex" },
        { slug: { startsWith: "max-flex-" } },
        { name: { equals: "Max Flex", mode: "insensitive" } },
        { downloadFilePath: "product-files/max-flex-instructions.pdf" },
        { imagesJson: { contains: "/products/max-flex-" } },
      ],
    },
    include: { creator: true, _count: { select: { orderItems: true } } },
  });

  for (const product of catalogCandidates) {
    if (!looksLikeSeededMaxFlex(product)) continue;
    if (product._count.orderItems > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: { isActive: false, slug: `archived-${product.slug}-${product.id.slice(-6)}` },
      });
      console.log(`Hid seeded Max Flex with orders: ${product.slug}`);
    } else {
      await prisma.product.delete({ where: { id: product.id } });
      console.log(`Deleted seeded Max Flex: ${product.slug}`);
    }
  }

  // 2) Find Wesley's / community approved Max Flex submissions and republish.
  const submissions = await prisma.mocSubmission.findMany({
    where: {
      status: "approved",
      OR: [
        { builderEmail: "wesleybarcus@icloud.com" },
        { mocName: { equals: "Max Flex", mode: "insensitive" } },
        { mocName: { contains: "Max Flex", mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  let restoredSlug: string | null = null;
  for (const submission of submissions) {
    // Prefer Wesley's Max Flex if multiple match.
    const isWesley =
      submission.builderEmail.toLowerCase() === "wesleybarcus@icloud.com";
    const isMaxFlex = /max\s*flex/i.test(submission.mocName);
    if (!isWesley && !isMaxFlex) continue;

    const product = await publishApprovedMocToBuild(submission);
    console.log(
      `Restored community MOC "${submission.mocName}" by ${submission.builderName} as /build/${product.slug}`,
    );

    if (isWesley && isMaxFlex) {
      restoredSlug = product.slug;
      // Claim the clean slug once the seeded product is gone.
      const taken = await prisma.product.findUnique({
        where: { slug: "max-flex" },
        select: { id: true },
      });
      if (!taken || taken.id === product.id) {
        await prisma.product.update({
          where: { id: product.id },
          data: { slug: "max-flex", isActive: true },
        });
        restoredSlug = "max-flex";
      }
    } else if (!restoredSlug && isMaxFlex) {
      restoredSlug = product.slug;
    }
  }

  if (!restoredSlug) {
    console.log(
      "No approved Wesley/Max Flex submission found to restore into Build.",
    );
  } else {
    console.log(`Community Max Flex live at /build/${restoredSlug}`);
  }
}

async function main() {
  mkdirSync(join(process.cwd(), "uploads"), { recursive: true });
  mkdirSync(join(process.cwd(), "product-files"), { recursive: true });
  mkdirSync(join(process.cwd(), "public", "products"), { recursive: true });

  const creator = await prisma.creator.upsert({
    where: { slug: "badlands-bricks" },
    update: {
      displayName: "Badlands Bricks",
      bio: "Official Badlands Bricks MOCs and building instructions.",
      avatarPath: "/brand/logo.png",
    },
    create: {
      id: "creator_badlands_bricks",
      slug: "badlands-bricks",
      displayName: "Badlands Bricks",
      bio: "Official Badlands Bricks MOCs and building instructions.",
      avatarPath: "/brand/logo.png",
    },
  });

  await prisma.product.deleteMany({ where: { slug: "semi-truck" } });

  await restoreCommunityMaxFlex();

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
        creatorId: creator.id,
      },
      create: {
        slug: product.slug,
        name: product.name,
        priceCents: product.priceCents,
        description: product.description,
        imagesJson: JSON.stringify(product.images),
        downloadFilePath: product.downloadFilePath,
        isActive: true,
        creatorId: creator.id,
      },
    });
  }

  const ownerEmails = [
    "wesleybarcus@icloud.com",
    "canaanmcgee@gmail.com",
  ];
  const promoted = await prisma.user.updateMany({
    where: { email: { in: ownerEmails } },
    data: { role: "admin" },
  });

  console.log(
    `Seeded creator + ${products.length} products. Promoted ${promoted.count} owner admin(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
