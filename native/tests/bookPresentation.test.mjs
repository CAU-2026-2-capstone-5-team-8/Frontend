import test from 'node:test';
import assert from 'node:assert/strict';
import * as presentation from '../src/lib/bookPresentation.ts';

test('only explicit secure catalog cover URLs may become image requests', () => {
  assert.equal(typeof presentation.safeCoverUrl, 'function');
  for (const url of [undefined,null,'','http://example.org/cover.jpg','file:///tmp/a','javascript:alert(1)','https://user:pass@example.org/a','//example.org/a'])
    assert.equal(presentation.safeCoverUrl(url), null);
  assert.equal(presentation.safeCoverUrl('https://images.example.org/cover.jpg?size=large'),'https://images.example.org/cover.jpg?size=large');
});

test('book grid uses measured content width including scrollbar loss', () => {
  assert.equal(typeof presentation.catalogLayout, 'function');
  assert.equal(presentation.catalogLayout(335).columns, 2);
  for (const available of [190, 265, 335, 500, 720, 980, 1180]) {
    const { columns, gap, tileWidth } = presentation.catalogLayout(available);
    assert.ok(columns * tileWidth + (columns - 1) * gap <= available);
    assert.ok(tileWidth > 0);
  }
});
