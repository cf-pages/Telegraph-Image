// Keys are prefixed so /file/[id] can route an id to this provider without a
// KV metadata lookup — R2 files stay servable even when KV is not bound.
const R2_ID_PREFIX = 'r2-';

export const r2Provider = {
    key: 'r2',

    validateConfig(env) {
        if (!env.img_r2) {
            throw new Error('Missing required R2 bucket binding: img_r2');
        }
    },

    async upload(env, file, { fileExtension }) {
        const extension = sanitizeExtension(fileExtension);
        const id = `${R2_ID_PREFIX}${randomHex(16)}${extension ? '.' + extension : ''}`;

        await env.img_r2.put(id, await file.arrayBuffer(), {
            httpMetadata: {
                contentType: file.type || 'application/octet-stream',
            },
        });

        return { id };
    },

    async fetchFile(env, request, url, fileId) {
        if (!env.img_r2) {
            return new Response('R2 bucket binding (img_r2) is not configured', { status: 500 });
        }

        const object = await env.img_r2.get(fileId);
        if (!object) {
            return new Response('Not Found', { status: 404 });
        }

        const headers = new Headers();
        if (typeof object.writeHttpMetadata === 'function') {
            object.writeHttpMetadata(headers);
        }
        if (object.httpEtag) {
            headers.set('ETag', object.httpEtag);
        }

        return new Response(object.body, { status: 200, headers });
    },

    // Without the binding the object is unreachable for us, so the caller should
    // drop the record rather than block on something it can never do.
    canDelete(env, _metadata) {
        return Boolean(env.img_r2);
    },

    // Unlike Telegram, R2 objects are ours to remove — and they keep costing
    // stored bytes until they are, so deleting the KV record is not enough.
    // R2 deletes are idempotent, so removing an already-missing key is fine.
    async deleteFile(env, fileId) {
        this.validateConfig(env);

        await env.img_r2.delete(fileId);
    },

    ownsId(fileId) {
        return typeof fileId === 'string' && fileId.startsWith(R2_ID_PREFIX);
    },
};

function sanitizeExtension(extension) {
    const cleaned = String(extension || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleaned.slice(0, 10);
}

function randomHex(byteLength) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
