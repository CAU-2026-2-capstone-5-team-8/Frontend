import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../src/api.js';
import {shelfMarkup,reviewsMarkup} from '../src/library.js';
test('shelf and public review requests use different paths and bodies',async()=>{
  const calls=[];const api=createApi(async(url,options)=>{calls.push({url,options});return Response.json({});});
  await api.saveShelf(1,2,'READING','Personal note');
  await api.saveReview(1,2,'HARD','Public review');
  await api.bookReviews(2,1);
  assert.equal(calls[0].url,'/api/users/1/shelf/2');
  assert.deepEqual(JSON.parse(calls[0].options.body),{status:'READING',note:'Personal note'});
  assert.equal(calls[1].url,'/api/users/1/reviews/2');
  assert.deepEqual(JSON.parse(calls[1].options.body),{difficulty:'HARD',text:'Public review'});
  assert.equal(calls[2].url,'/api/books/2/reviews?page=1&size=20');
});
test('DELETE accepts an empty 204 response',async()=>{
  let method;const api=createApi(async(url,options)=>{method=options.method;return new Response(null,{status:204});});
  await api.removeShelf(1,2);assert.equal(method,'DELETE');await api.removeReview(1,2);
});
test('invalid states and overlong content never reach the network',async()=>{
  let calls=0;const api=createApi(async()=>{calls++;return Response.json({});});
  await assert.rejects(api.saveShelf(1,2,'UNKNOWN',''));
  await assert.rejects(api.saveShelf(1,2,'READING','a'.repeat(1001)));
  await assert.rejects(api.saveReview(1,2,'HARD',' '));
  await assert.rejects(api.saveReview(1,2,'UNKNOWN','Text'));
  await assert.rejects(api.saveReview(1,2,'EASY','a'.repeat(301)));
  assert.equal(calls,0);
});
test('stored user text is escaped in notes and reviews',()=>{
  const html=shelfMarkup({content:[{bookId:1,title:'<img src=x>',author:'A',status:'READING',note:'</textarea><script>bad()</script>',review:{difficulty:'HARD',text:'<b>text</b>'}}],page:0,totalPages:1,totalElements:1});
  assert.doesNotMatch(html,/<script|<img/);assert.match(html,/&lt;\/textarea&gt;/);
  const reviews=reviewsMarkup({content:[{authorLabel:'<svg>',text:'<script>x</script>',difficulty:'HARD'}],page:0,totalPages:1});
  assert.doesNotMatch(reviews,/<script|<svg/);assert.match(reviews,/어려웠어요/);
});
test('empty shelf and reviews offer useful empty states',()=>{
  assert.match(shelfMarkup({content:[],page:0,totalPages:0,totalElements:0}),/서재가 비어/);
  assert.match(reviewsMarkup({content:[],page:0,totalPages:0}),/첫 후기/);
});
