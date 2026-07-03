import 'dotenv/config'
import { db } from './index'
import * as schema from './schema'

// ── DATA ──────────────────────────────────────────────────────────────────────

const categoriesData = [
  { slug: 'anime',       name: 'Anime',        visible: true,  order: 1 },
  { slug: 'hoodies',     name: 'Hoodies',      visible: true,  order: 2 },
  { slug: 'gym',         name: 'Gym',          visible: true,  order: 3 },
  { slug: 'manga-corta', name: 'Manga Corta',  visible: true,  order: 4 },
  { slug: 'gorras',      name: 'Gorras',       visible: false, order: 5 },
  { slug: 'zapatos',     name: 'Zapatos',      visible: false, order: 6 },
]

const dropsData = [
  {
    slug: 'jjk-shadow-drop',
    name: 'JJK Shadow Drop',
    subtitle: 'Cursed Energy. Limited Run.',
    heroImageUrl: 'images/bg1.jpg',
    accentColor: '#7b2fff',
    endDate: new Date('2025-08-01'),
    active: true,
    order: 1,
  },
  {
    slug: 'anime',
    name: 'Anime Collection',
    subtitle: 'Diseños inspirados en las series más icónicas',
    heroImageUrl: 'images/bg2.jpg',
    accentColor: '#e63946',
    endDate: new Date('2025-09-01'),
    active: true,
    order: 2,
  },
  {
    slug: 'hoodies',
    name: 'Hoodies',
    subtitle: 'Fleece pesado. Corte oversized. Todo el año.',
    heroImageUrl: 'images/category1.jpg',
    accentColor: '#0d0d0d',
    endDate: new Date('2026-01-01'),
    active: true,
    order: 3,
  },
  {
    slug: 'gym',
    name: 'Gym Series',
    subtitle: 'Rendimiento sin sacrificar el estilo.',
    heroImageUrl: 'images/category2.jpg',
    accentColor: '#2d6a4f',
    endDate: new Date('2026-01-01'),
    active: true,
    order: 4,
  },
  {
    slug: 'manga-corta',
    name: 'Manga Corta',
    subtitle: 'Básicos premium que siempre funcionan.',
    heroImageUrl: 'images/category3.jpg',
    accentColor: '#333333',
    endDate: new Date('2026-01-01'),
    active: true,
    order: 5,
  },
]

const productsData = [
  {
    slug: 'playera-toji-vol2',
    name: 'Playera Toji Vol.2',
    description: 'Inspirada en la energía oscura de Toji Fushiguro. Edición limitada.',
    price: '499.00',
    categorySlug: 'anime',
    dropSlug: 'jjk-shadow-drop',
    limited: true,
    bestseller: true,
    visible: true,
    sizes:  ['CH', 'M', 'G', 'XG'],
    colors: ['Negro', 'Blanco'],
    images: ['images/products/toji-vol2/8.png', 'images/products/toji-vol2/10.png'],
  },
  {
    slug: 'hoodie-classic-negro',
    name: 'Hoodie Classic Negro',
    description: 'Hoodie de peso completo. Fleece 320gsm. Corte oversized.',
    price: '699.00',
    categorySlug: 'hoodies',
    dropSlug: null,
    limited: false,
    bestseller: true,
    visible: true,
    sizes:  ['CH', 'M', 'G', 'XG', 'XXG'],
    colors: ['Negro'],
    images: ['images/product1.jpg', 'images/product2.jpg'],
  },
  {
    slug: 'short-gym-pro',
    name: 'Short Gym Pro',
    description: 'Short técnico 4-way stretch. Bolsillo con cierre y liner interno.',
    price: '349.00',
    categorySlug: 'gym',
    dropSlug: null,
    limited: false,
    bestseller: true,
    visible: true,
    sizes:  ['CH', 'M', 'G', 'XG'],
    colors: ['Negro', 'Gris', 'Blanco'],
    images: ['images/suit-1.jpg', 'images/suit-2.jpg', 'images/suit-3.jpg'],
  },
  {
    slug: 'gorra-retro-logo',
    name: 'Gorra Retro Logo',
    description: 'Dad hat 6 paneles. Bordado frontal. Ajuste de metal.',
    price: '299.00',
    categorySlug: 'gorras',
    dropSlug: null,
    limited: false,
    bestseller: true,
    visible: true,
    sizes:  ['Única'],
    colors: ['Negro', 'Beige'],
    images: ['images/product5.jpg', 'images/product6.jpg'],
  },
  {
    slug: 'playera-basica-blanca',
    name: 'Playera Básica Blanca',
    description: 'Algodón peinado 200gsm. Corte regular unisex.',
    price: '279.00',
    categorySlug: 'manga-corta',
    dropSlug: null,
    limited: false,
    bestseller: false,
    visible: true,
    sizes:  ['CH', 'M', 'G', 'XG'],
    colors: ['Blanco'],
    images: ['images/product7.jpg', 'images/product8.jpg'],
  },
  {
    slug: 'playera-manga-corta-negra',
    name: 'Playera Manga Corta Negra',
    description: 'Algodón peinado 200gsm. Corte regular unisex.',
    price: '279.00',
    categorySlug: 'manga-corta',
    dropSlug: null,
    limited: false,
    bestseller: false,
    visible: true,
    sizes:  ['CH', 'M', 'G', 'XG'],
    colors: ['Negro'],
    images: ['images/product9.jpg', 'images/product10.jpg'],
  },
  {
    slug: 'conjunto-gym-vol1',
    name: 'Conjunto Gym Vol.1',
    description: 'Set completo tank + short. Tela técnica 4-way stretch.',
    price: '649.00',
    categorySlug: 'gym',
    dropSlug: null,
    limited: false,
    bestseller: false,
    visible: true,
    sizes:  ['CH', 'M', 'G', 'XG'],
    colors: ['Negro', 'Gris'],
    images: ['images/suit-4.jpg', 'images/suit-5.jpg', 'images/suit-6.jpg'],
  },
  {
    slug: 'playera-premium-v1',
    name: 'Playera Premium V1',
    description: 'Tela premium 220gsm. Hombros caídos. Fit moderno.',
    price: '399.00',
    categorySlug: 'manga-corta',
    dropSlug: null,
    limited: false,
    bestseller: false,
    visible: true,
    sizes:  ['CH', 'M', 'G', 'XG'],
    colors: ['Negro', 'Blanco'],
    images: ['images/product11.jpg', 'images/product12.jpg', 'images/product13.jpg'],
  },
  {
    slug: 'zapatilla-retro-runner',
    name: 'Zapatilla Retro Runner',
    description: 'Suela chunky. Upper sintético de alta calidad. Estética Y2K.',
    price: '1299.00',
    categorySlug: 'zapatos',
    dropSlug: null,
    limited: true,
    bestseller: false,
    visible: true,
    sizes:  ['25', '26', '27', '28', '29', '30'],
    colors: ['Blanco/Negro', 'Negro/Rojo'],
    images: ['images/mirror.png'],
  },
]

// ── SEED ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding...')

  // 1. Categories
  console.log('  → categories')
  await db.insert(schema.categories).values(categoriesData).onConflictDoNothing()
  const cats = await db.select().from(schema.categories)
  const catMap = Object.fromEntries(cats.map(c => [c.slug, c.id]))

  // 2. Drops
  console.log('  → drops')
  await db.insert(schema.drops).values(dropsData).onConflictDoNothing()
  const drops = await db.select().from(schema.drops)
  const dropMap = Object.fromEntries(drops.map(d => [d.slug, d.id]))

  // 3. Products + images + variants
  console.log('  → products')
  for (const p of productsData) {
    const [product] = await db
      .insert(schema.products)
      .values({
        slug:        p.slug,
        name:        p.name,
        description: p.description,
        price:       p.price,
        categoryId:  catMap[p.categorySlug] ?? null,
        dropId:      p.dropSlug ? (dropMap[p.dropSlug] ?? null) : null,
        limited:     p.limited,
        bestseller:  p.bestseller,
        visible:     p.visible,
      })
      .onConflictDoNothing()
      .returning()

    if (!product) {
      console.log(`    skip ${p.slug} (already exists)`)
      continue
    }

    // images
    if (p.images.length) {
      await db.insert(schema.productImages).values(
        p.images.map((url, i) => ({ productId: product.id, url, position: i, isPrimary: i === 0 }))
      )
    }

    // variants — cross of sizes × colors, stock=10 default
    const variants = []
    for (const size of p.sizes) {
      for (const color of p.colors) {
        variants.push({ productId: product.id, size, color, stock: 10, sku: `${p.slug}-${size}-${color}`.toLowerCase().replace(/\//g, '-') })
      }
    }
    if (variants.length) {
      await db.insert(schema.productVariants).values(variants)
    }

    console.log(`    ✓ ${p.slug} (${variants.length} variants)`)
  }

  console.log('✅ Seed done')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
