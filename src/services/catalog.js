const fs = require('fs/promises');
const path = require('path');
const config = require('../config');

const MEDIA_DIR = path.join(__dirname, '..', '..', 'public', 'app', 'media');

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function projectsPath() {
  return path.resolve(config.projectsJsonPath);
}

function formatPriceLabel(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '';
  return `${Math.round(num).toLocaleString('ru-RU')} ₽`;
}

function slugify(name) {
  const base = String(name || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] || ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || `project-${Date.now()}`;
}

async function ensureStore() {
  const filePath = projectsPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]\n', 'utf8');
  }
  return filePath;
}

async function readProjects() {
  const filePath = await ensureStore();
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw || '[]');
  return Array.isArray(data) ? data : [];
}

async function writeProjects(projects) {
  const filePath = await ensureStore();
  await fs.writeFile(filePath, `${JSON.stringify(projects, null, 2)}\n`, 'utf8');
}

function normalizeProject(input, { existingId } = {}) {
  const name = String(input.name || '').trim();
  if (name.length < 2) {
    const err = new Error('name_required');
    err.code = 'name_required';
    throw err;
  }

  const area = Number(input.area);
  const bedrooms = Number(input.bedrooms);
  const realCost = Number(String(input.realCost || '').replace(/\s/g, ''));
  const floors = String(input.floors || '').trim() || '1 этаж';
  const location = String(input.location || '').trim();
  const mapsUrl = String(input.mapsUrl || '').trim();
  const description = String(input.description || '').trim();
  const reviewAuthor = String(input.reviewAuthor || input.review?.author || '').trim();
  const reviewText = String(input.reviewText || input.review?.text || '').trim();
  const rating = Number(input.reviewRating || input.review?.rating || 5) || 5;

  let photos = [];
  if (Array.isArray(input.photos)) {
    photos = input.photos.map((p) => String(p).trim()).filter(Boolean);
  } else if (input.photo) {
    photos = [String(input.photo).trim()];
  }

  const id = existingId || slugify(name);
  const realCostLabel = formatPriceLabel(realCost) || String(input.realCostLabel || '').trim();

  return {
    id,
    name,
    area: Number.isFinite(area) ? area : 0,
    floors,
    bedrooms: Number.isFinite(bedrooms) ? bedrooms : 0,
    priceFrom: Number(input.priceFrom) || realCost || 0,
    realCost: Number.isFinite(realCost) ? realCost : 0,
    priceLabel: formatPriceLabel(input.priceFrom || realCost) ? `от ${formatPriceLabel(input.priceFrom || realCost)}` : '',
    realCostLabel,
    location,
    mapsUrl: mapsUrl || (location ? `https://yandex.ru/maps/?text=${encodeURIComponent(location)}` : ''),
    siteUrl: String(input.siteUrl || '').trim(),
    photos,
    description,
    review: {
      author: reviewAuthor || 'Клиент',
      text: reviewText || '',
      rating: Math.min(5, Math.max(1, rating)),
    },
  };
}

async function uniqueId(baseId, projects, excludeId = null) {
  let id = baseId;
  let n = 2;
  while (projects.some((p) => p.id === id && p.id !== excludeId)) {
    id = `${baseId}-${n}`;
    n += 1;
  }
  return id;
}

async function createProject(input) {
  const projects = await readProjects();
  const draft = normalizeProject(input);
  draft.id = await uniqueId(draft.id, projects);
  projects.push(draft);
  await writeProjects(projects);
  return draft;
}

async function updateProject(id, input) {
  const projects = await readProjects();
  const index = projects.findIndex((p) => p.id === id);
  if (index < 0) {
    const err = new Error('not_found');
    err.code = 'not_found';
    throw err;
  }
  const current = projects[index];
  const draft = normalizeProject({ ...current, ...input, photos: input.photos || current.photos }, { existingId: id });
  projects[index] = draft;
  await writeProjects(projects);
  return draft;
}

async function deleteProject(id) {
  const projects = await readProjects();
  const index = projects.findIndex((p) => p.id === id);
  if (index < 0) {
    const err = new Error('not_found');
    err.code = 'not_found';
    throw err;
  }
  const [removed] = projects.splice(index, 1);
  await writeProjects(projects);
  return removed;
}

async function saveUploadedPhoto(file, preferredName) {
  if (!file) {
    const err = new Error('photo_required');
    err.code = 'photo_required';
    throw err;
  }

  const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
  const base = slugify(preferredName || path.basename(file.originalname || 'photo', ext)) || `photo-${Date.now()}`;
  const filename = `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${safeExt}`;
  const dest = path.join(MEDIA_DIR, filename);
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  await fs.writeFile(dest, file.buffer);
  return `media/${filename}`;
}

async function saveUploadedPhotos(files, preferredName) {
  const list = Array.isArray(files) ? files.filter(Boolean) : [];
  if (!list.length) {
    const err = new Error('photo_required');
    err.code = 'photo_required';
    throw err;
  }
  const paths = [];
  for (const file of list) {
    paths.push(await saveUploadedPhoto(file, preferredName));
  }
  return paths;
}

module.exports = {
  readProjects,
  createProject,
  updateProject,
  deleteProject,
  saveUploadedPhoto,
  saveUploadedPhotos,
  formatPriceLabel,
  MEDIA_DIR,
};
