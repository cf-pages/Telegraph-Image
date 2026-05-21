export const LIST_TYPE = {
  NONE: 'None',
  WHITE: 'White',
  BLOCK: 'Block',
};

export const LABEL = {
  NONE: 'None',
  ADULT: 'adult',
};

export function createDefaultMetadata(id, overrides = {}) {
  return {
    TimeStamp: Date.now(),
    ListType: LIST_TYPE.NONE,
    Label: LABEL.NONE,
    liked: false,
    fileName: id,
    fileSize: 0,
    ...overrides,
  };
}

export function normalizeMetadata(metadata, id) {
  return {
    ListType: metadata.ListType || LIST_TYPE.NONE,
    Label: metadata.Label || LABEL.NONE,
    TimeStamp: metadata.TimeStamp || Date.now(),
    liked: metadata.liked !== undefined ? metadata.liked : false,
    fileName: metadata.fileName || id,
    fileSize: metadata.fileSize || 0,
  };
}

export async function getMetadata(env, id) {
  const record = await env.img_url.getWithMetadata(id);
  return record?.metadata || null;
}

export async function getOrCreateMetadata(env, id) {
  const record = await env.img_url.getWithMetadata(id);

  if (record?.metadata) {
    return normalizeMetadata(record.metadata, id);
  }

  const metadata = createDefaultMetadata(id);
  await putMetadata(env, id, metadata);
  return metadata;
}

export async function putMetadata(env, id, metadata) {
  await env.img_url.put(id, '', { metadata });
}

export async function updateMetadata(env, id, updater) {
  const metadata = await getMetadata(env, id);
  if (!metadata) return null;

  const updated = updater(metadata);
  await putMetadata(env, id, updated);
  return updated;
}

export function isBlocked(metadata) {
  return metadata.ListType === LIST_TYPE.BLOCK || metadata.Label === LABEL.ADULT;
}

export function isWhitelisted(metadata) {
  return metadata.ListType === LIST_TYPE.WHITE;
}
