// In-memory UI fixture only: not persistence, authentication, or a production API.
const shelves=new Map(),reviews=new Map();
const books=[{id:1,title:'Introduction to Linear Algebra',author:'Gilbert Strang'}, {id:2,title:'Operating Systems: Three Easy Pieces',author:'Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau'}];
const page=(content,url)=>{const index=Number(url.searchParams.get('page')||0),size=Number(url.searchParams.get('size')||20);return {content:content.slice(index*size,(index+1)*size),page:index,size,totalElements:content.length,totalPages:Math.ceil(content.length/size)};};
export function libraryFixture(req,res,body){
  const url=new URL(req.url,'http://fixture'),path=url.pathname;
  const send=data=>{res.end(JSON.stringify(data));return true;};
  if(path==='/api/books'&&req.method==='GET')return send(page(books,url));
  const publicPath=path.match(/^\/api\/books\/(\d+)\/reviews$/);
  if(publicPath&&req.method==='GET')return send(page([...reviews.values()].filter(r=>r.bookId===Number(publicPath[1])).map(r=>({authorLabel:`독자 ${r.userId}`,difficulty:r.difficulty,text:r.text})),url));
  const route=path.match(/^\/api\/users\/(\d+)\/(shelf|reviews)(?:\/(\d+))?$/);
  if(!route)return false;
  const userId=Number(route[1]),bookId=Number(route[3]),key=`${userId}:${bookId}`,kind=route[2];
  if(kind==='shelf'&&!route[3]&&req.method==='GET')return send(page([...shelves.values()].filter(s=>s.userId===userId).map(s=>({...s,review:reviews.get(`${userId}:${s.bookId}`)??null})),url));
  const book=books.find(b=>b.id===bookId);
  if(!book){res.statusCode=404;return send({message:'도서를 찾을 수 없습니다.'});}
  if(req.method==='DELETE'){(kind==='shelf'?shelves:reviews).delete(key);res.statusCode=204;res.end();return true;}
  if(kind==='shelf'&&req.method==='POST'){
    if(!shelves.has(key))shelves.set(key,{userId,bookId,title:book.title,author:book.author,status:'WANT_TO_READ',note:''});
    return send(shelves.get(key));
  }
  if(req.method==='PUT'){
    let data;try{data=JSON.parse(body);}catch{res.statusCode=400;return send({message:'잘못된 요청입니다.'});}
    if(kind==='shelf')shelves.set(key,{userId,bookId,title:book.title,author:book.author,...data});
    else reviews.set(key,{userId,bookId,...data});
    return send(data);
  }
  res.statusCode=405;return send({message:'지원하지 않는 요청입니다.'});
}
