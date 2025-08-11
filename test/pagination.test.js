const assert = require('assert');

describe('KV list pagination', function () {
  async function getOnRequest() {
    return (await import('../functions/api/manage/list.js')).onRequest;
  }

  const sampleKeys = [{ name: 'a' }, { name: 'b' }];
  function mockEnv() {
    return {
      img_url: {
        list: ({ limit, cursor }) => {
          const start = cursor ? parseInt(cursor, 10) : 0;
          const end = Math.min(start + limit, sampleKeys.length);
          const keys = sampleKeys.slice(start, end);
          const next = end < sampleKeys.length ? String(end) : undefined;
          return Promise.resolve({
            keys,
            list_complete: end >= sampleKeys.length,
            cursor: next
          });
        }
      }
    };
  }

  it('limits results and returns cursor when more data', async function () {
    const onRequest = await getOnRequest();
    const env = mockEnv();
    const request = new Request('https://example.com/api/manage/list?limit=1');
    const res = await onRequest({ request, env });
    const data = JSON.parse(await res.text());
    assert.ok(data.keys.length <= 1);
    assert.strictEqual(data.list_complete, false);
    assert.ok(data.cursor);
  });

  it('second page completes listing', async function () {
    const onRequest = await getOnRequest();
    const env = mockEnv();
    const firstRes = await onRequest({ request: new Request('https://example.com/api/manage/list?limit=1'), env });
    const firstData = JSON.parse(await firstRes.text());
    const secondRes = await onRequest({ request: new Request(`https://example.com/api/manage/list?cursor=${firstData.cursor}`), env });
    const secondData = JSON.parse(await secondRes.text());
    assert.strictEqual(secondData.list_complete, true);
    assert.ok(!secondData.cursor);
  });
});
