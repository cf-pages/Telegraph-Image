export function hasMetadataStore(env) {
  return Boolean(env.img_url);
}

export function getMetadataStore(env) {
  if (!env.img_url) {
    throw new Error('Metadata storage requires the img_url KV binding');
  }

  return env.img_url;
}
