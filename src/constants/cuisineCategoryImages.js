/**
 * Distinct food photos per cuisine/category chip (Pexels CDN — verified URLs).
 */

const px = id =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop`;

const DEFAULT = px(1640777);

/** keyword → image URI (longer phrases first) */
const BY_KEYWORD = [
  ['biryani', px(958545)],
  ['biriyani', px(958545)],
  ['pasta', px(1279330)],
  ['spaghetti', px(1279330)],
  ['cake', px(2915280)],
  ['cupcake', px(1486906)],
  ['appetizer', px(1279330)],
  ['starter', px(1279330)],
  ['bangla', px(2474661)],
  ['bangladeshi', px(958545)],
  ['indian', px(2474661)],
  ['bread', px(1775043)],
  ['bakery', px(1775043)],
  ['pastry', px(1486906)],
  ['chef', px(376464)],
  ['special', px(941861)],
  ['child', px(1640777)],
  ['kid', px(1640777)],
  ['pizza', px(1146760)],
  ['italian', px(1146760)],
  ['burger', px(1630430)],
  ['dessert', px(2915280)],
  ['sweet', px(1028714)],
  ['coffee', px(3023476)],
  ['cafe', px(3023476)],
  ['drink', px(1435907)],
  ['juice', px(1435907)],
  ['grill', px(2233348)],
  ['bbq', px(2233348)],
  ['seafood', px(699953)],
  ['fish', px(699953)],
  ['chicken', px(2097090)],
  ['rice', px(958545)],
  ['chinese', px(1893556)],
  ['noodle', px(1893556)],
  ['thai', px(70497)],
  ['mexican', px(2092500)],
  ['salad', px(1640777)],
  ['vegan', px(1640777)],
  ['vegetarian', px(1640777)],
  ['healthy', px(1640777)],
  ['soup', px(691114)],
  ['breakfast', px(1092730)],
  ['lunch', px(1640777)],
  ['dinner', px(941861)],
];

const FALLBACK_POOL = [
  px(1640777),
  px(1279330),
  px(1146760),
  px(2474661),
  px(1630430),
  px(699953),
  px(2097090),
  px(1775043),
  px(3023476),
  px(2233348),
  px(1893556),
  px(941861),
];

const hashKey = str => {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

export const cuisineImageUriFromKey = key => {
  const k = String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!k) return DEFAULT;

  for (let i = 0; i < BY_KEYWORD.length; i += 1) {
    const [needle, uri] = BY_KEYWORD[i];
    if (k.includes(needle) || needle.includes(k)) return uri;
  }

  return FALLBACK_POOL[hashKey(k) % FALLBACK_POOL.length] || DEFAULT;
};

export default cuisineImageUriFromKey;
