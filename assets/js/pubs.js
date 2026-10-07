(()=>{'use strict';
const AID='A5066680507',KEY='oa-pubs-v1',TIMEOUT=8000;
const URL_='https://api.openalex.org/works?filter=author.id:'+AID+'&sort=publication_date:desc&per-page=200&mailto=warriertushar@gmail.com';
// The site's own curated claim (co-first authorship not visible in OpenAlex ordering)
const FIRST_OVERRIDE=['10.1016/j.celrep.2020.108309'];
const list=document.getElementById('pubs'),status=document.getElementById('pub-status');if(!list)return;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const doiOf=w=>(w.doi||'').replace(/^https?:\/\/doi\.org\//i,'').toLowerCase();
const words=t=>new Set(String(t||'').toLowerCase().replace(/<[^>]+>/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>3));
const jac=(a,b)=>{let i=0;a.forEach(x=>b.has(x)&&i++);return i/(a.size+b.size-i||1)};
const ids=w=>new Set((w.authorships||[]).map(a=>a.author&&a.author.id).filter(Boolean));
const src=w=>((w.primary_location||{}).source)||{};
const isPre=w=>{const s=src(w),n=(s.display_name||'').toLowerCase();return s.type==='repository'||/rxiv|preprints|research square|ssrn/.test(n)||(w.type==='preprint'&&s.type!=='journal')};
function dedupe(ws){
  ws=ws.filter(w=>w&&w.title&&!w.is_retracted&&w.type!=='paratext'&&w.type!=='erratum');
  const pubs=ws.filter(w=>!isPre(w)),pres=ws.filter(isPre),out=pubs.map(w=>({w,pre:null}));
  for(const p of pres){const pw=words(p.title),pi=ids(p),pf=(p.authorships[0]||{}).author||{};let best=null,score=0;
    for(const o of out){if(o.pre)continue;const w=o.w;
      const t=jac(pw,words(w.title));const wi=ids(w);let ov=0;pi.forEach(x=>wi.has(x)&&ov++);ov/=Math.min(pi.size,wi.size)||1;
      const sameFirst=((w.authorships[0]||{}).author||{}).id===pf.id;
      const later=(w.publication_year||0)>=(p.publication_year||0)&&(w.publication_year||0)-(p.publication_year||0)<=3;
      const s=later?(t>=.5?1+t:(sameFirst&&ov>=.7?ov:0)):0;if(s>score){score=s;best=o}}
    if(best)best.pre=p;else out.push({w:p,pre:null});}
  return out.sort((a,b)=>(b.w.publication_date||'').localeCompare(a.w.publication_date||''));}
function authors(w){const a=w.authorships||[];const me=a.findIndex(x=>x.author&&x.author.id&&x.author.id.endsWith(AID));
  const nm=(x,i)=>i===me?'<strong>'+esc(x.author.display_name)+'</strong>':esc(x.author.display_name||x.raw_author_name);
  if(a.length<=12)return a.map(nm).join(', ');
  const keep=new Set([0,1,2,3,4,5,me,a.length-1]);let s=[],gap=false;
  a.forEach((x,i)=>{if(keep.has(i)){s.push(nm(x,i));gap=false}else if(!gap){s.push('…');gap=true}});return s.join(', ');}
function role(w){const a=w.authorships||[];const me=a.findIndex(x=>x.author&&x.author.id&&x.author.id.endsWith(AID));
  if(isPre(w))return 'Preprint';if(me===0||FIRST_OVERRIDE.includes(doiOf(w)))return 'First author';return 'Co-author';}
function render(data,when){
  const rows=dedupe(data);let first=0;
  list.innerHTML=rows.map(({w,pre})=>{const r=role(w);if(r==='First author')first++;const d=w.doi?'https://doi.org/'+doiOf(w):(w.id||'');const s=src(w).display_name;
    const pl=pre&&pre.doi?`<span class="pre">· preprint: <a href="https://doi.org/${esc(doiOf(pre))}" target="_blank" rel="noopener">${esc((src(pre).display_name||'bioRxiv').replace(/ *\(.*\)/,''))} ${esc(pre.publication_year||'')}</a></span>`:'';
    return `<li class="pub"><span class="year">${esc(w.publication_year||'')}</span><div><p>${authors(w)}. <a href="${esc(d)}" target="_blank" rel="noopener">${esc(String(w.title).replace(/<[^>]+>/g,''))}</a>${s?'. <em>'+esc(s)+'</em>':''}. ${esc(w.publication_year||'')}.${w.doi?` <a class="doi" href="${esc(d)}" target="_blank" rel="noopener">${esc(d)}</a>`:''}</p><span class="tag${r==='First author'?' hl':''}">${r}</span>${pl}</div></li>`}).join('');
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){list.classList.remove('swap');void list.offsetWidth;list.classList.add('swap')}
  const c=document.getElementById('pub-count'),f=document.getElementById('pub-first');if(c)c.textContent=rows.length;if(f)f.textContent=first;
  status.innerHTML='Updated automatically from <a href="https://openalex.org/'+AID+'" target="_blank" rel="noopener">OpenAlex</a> · '+esc(new Date(when).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}));
}
try{const c=JSON.parse(localStorage.getItem(KEY)||'null');if(c&&c.results&&c.results.length)render(c.results,c.t)}catch(e){}
const ctl='AbortController' in window?new AbortController():null;const to=setTimeout(()=>ctl&&ctl.abort(),TIMEOUT);
fetch(URL_,ctl?{signal:ctl.signal}:{}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(j=>{clearTimeout(to);
  if(!j||!Array.isArray(j.results)||!j.results.length)return;const t=Date.now();render(j.results,t);
  try{localStorage.setItem(KEY,JSON.stringify({t,results:j.results.map(w=>({id:w.id,doi:w.doi,title:w.title,type:w.type,is_retracted:w.is_retracted,publication_year:w.publication_year,publication_date:w.publication_date,primary_location:{source:src(w).display_name?{display_name:src(w).display_name,type:src(w).type}:null},authorships:(w.authorships||[]).map(a=>({author:{id:a.author&&a.author.id,display_name:a.author&&a.author.display_name},raw_author_name:a.raw_author_name}))}))}))}catch(e){}
}).catch(()=>{clearTimeout(to)});
})();
