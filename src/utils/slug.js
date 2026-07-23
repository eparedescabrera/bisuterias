import slugify from 'slugify';

export function toSlug(value) {
  return slugify(String(value || ''), {
    lower: true,
    strict: true,
    locale: 'es',
    trim: true
  });
}

export async function uniqueSlug(baseValue, existsFn) {
  const base = toSlug(baseValue) || 'item';
  let candidate = base;
  let i = 2;

  while (await existsFn(candidate)) {
    candidate = `${base}-${i}`;
    i += 1;
  }

  return candidate;
}
