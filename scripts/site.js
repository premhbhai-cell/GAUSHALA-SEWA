/* ===== SITE CONFIG – apni details yahan badlo ===== */
window.SITE = {
  name: 'SHREEKRISHNA KANHAIYA GAUSHALA SEWA ASSOCIATION',
  short: 'Shreekrishna Kanhaiya Gaushala',
  phone: '+919991774444',          // calls
  whatsapp: '919991774444',        // wa.me number (without +)
  email: 'info@example.com',
  upi: 'yourname@upi',
  qr: 'images/qr.webp',
  watchVideo: 'https://www.youtube.com/embed/M7Uy77dtFOk?autoplay=1&rel=0',
  videos: ['day-1','bharat-multistorey-hospital','work-in-progress','day-2','gaumata-plastic'],
  videoBase: 'https://pub-d7d0316b6f5a427b953ccde81b89d13a.r2.dev/videos/'
};
if(window.CMS_SITE){for(var _k in window.CMS_SITE){if(window.CMS_SITE[_k])window.SITE[_k]=window.CMS_SITE[_k]}}
var CMS_EDIT=!!window.__CMS_EDIT;
(function(){
'use strict';
var S=window.SITE, $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var inPages=location.pathname.replace(/\\/g,'/').indexOf('/pages/')>-1, ROOT=inPages?'../':'';

/* ---------- NAV: mobile menu ---------- */
var tog=$('.nav-toggle'), mm=$('#gsd-mobile-menu');
function closeMenu(){ if(!tog||!mm)return; tog.classList.remove('open'); mm.classList.remove('open'); tog.setAttribute('aria-expanded','false'); document.body.style.overflow=''; var b=$('.mobile-menu-backdrop'); if(b)b.remove(); }
if(tog&&mm){
  tog.addEventListener('click',function(e){ e.stopPropagation();
    var o=!mm.classList.contains('open');
    if(!o){closeMenu();return;}
    tog.classList.add('open'); mm.classList.add('open'); tog.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden';
    var b=document.createElement('div'); b.className='mobile-menu-backdrop is-open'; b.style.cssText='position:fixed;inset:0;z-index:40;background:rgba(20,14,6,.4)'; b.onclick=closeMenu; document.body.appendChild(b);
  });
  $$('.mobile-menu a').forEach(function(a){a.addEventListener('click',closeMenu)});
}
$$('.mobile-dropdown-toggle').forEach(function(w){
  $$('button',w).forEach(function(btn){ btn.addEventListener('click',function(e){
    e.preventDefault(); var id=btn.getAttribute('aria-controls'), sm=document.getElementById(id); if(!sm)return;
    var open=!sm.classList.contains('is-open'); sm.classList.toggle('is-open',open);
    $$('button',w).forEach(function(x){x.setAttribute('aria-expanded',open)}); w.classList.toggle('is-open',open);
  });});
});

/* ---------- NAV: desktop dropdown panels ---------- */
var items=$$('.navbar .nav-item-dropdown'), subIds=['nav-aboutus','nav-ourcampaigns','nav-contact'];
var panels=[], hideT;
items.forEach(function(it,idx){
  var a=$('a',it); var label=(a.textContent||'').trim().toLowerCase().replace(/\s+/g,'');
  var sm=document.getElementById('gsd-mobile-submenu-nav-'+label); if(!sm) sm=document.getElementById('gsd-mobile-submenu-'+subIds[idx]);
  if(!sm)return;
  var ul=document.createElement('ul'); ul.className='nav-dropdown-panel'+(label==='ourcampaigns'?' nav-dropdown-panel-campaigns':'');
  $$('a',sm).forEach(function(l){ var li=document.createElement('li'); var c=document.createElement('a'); c.className='nav-dropdown-link'; c.href=l.getAttribute('href'); c.textContent=l.textContent.trim(); li.appendChild(c); ul.appendChild(li); });
  document.body.appendChild(ul); panels.push(ul);
  function show(){ clearTimeout(hideT); panels.forEach(function(p){p.classList.remove('is-open')}); var r=it.getBoundingClientRect(); ul.style.left=(r.left+r.width/2)+'px'; ul.style.top=(r.bottom-18)+'px'; ul.classList.add('is-open'); }
  function hide(){ hideT=setTimeout(function(){ul.classList.remove('is-open')},180); }
  it.addEventListener('mouseenter',show); it.addEventListener('mouseleave',hide); ul.addEventListener('mouseenter',function(){clearTimeout(hideT)}); ul.addEventListener('mouseleave',hide);
  $('a',it).addEventListener('focus',show);
});

/* ---------- HERO SLIDER ---------- */
var shell=$('.gsd-home-hero-shell');
if(shell&&!CMS_EDIT){
  var first=$$(':scope > div[aria-hidden="false"]',shell)[0];
  if(first){
    var data=[
     {eb:null,h:null,p:null,img:null},
     {h:'Building a Future<br><span style="color:#DB8B3B">of Compassionate Care</span>',p:'A dedicated hospital and research centre is being built to expand treatment, rescue support and lifelong care for helpless animals.',img:ROOT+'images/hosp2.webp'},
     {h:'Where Compassion<br><span style="color:#DB8B3B">Becomes Care.</span>',p:'For every life that cannot ask for help, we answer with seva - treating every rescued cow and calf with the same tenderness as our own family.',img:ROOT+'images/devi-calf.webp'}
    ];
    var cs=window.CMS_SLIDES;if(cs&&cs.length){cs.forEach(function(x,i){var t=data[i+1];if(!x||!t)return;if(x.h)t.h=x.h;if(x.p)t.p=x.p;if(x.img)t.img=/^(data:|https?:)/.test(x.img)?x.img:ROOT+x.img})}
    var slides=[first];
    for(var i=1;i<data.length;i++){ var c=first.cloneNode(true); c.setAttribute('aria-hidden','true'); first.parentNode.insertBefore(c,first.nextSibling&&slides[slides.length-1].nextSibling); var h1=$('h1',c),p=$('p',c),im=$('img',c); if(h1)h1.innerHTML=data[i].h; if(p)p.textContent=data[i].p; if(im){im.src=data[i].img;im.alt=''} slides.push(c); }
    var cur=0, timer;
    function go(n){ cur=(n+slides.length)%slides.length; slides.forEach(function(s,k){ var on=k===cur; s.style.opacity=on?1:0; s.style.visibility=on?'visible':'hidden'; s.style.pointerEvents=on?'auto':'none'; s.setAttribute('aria-hidden',!on); }); }
    function play(){ clearInterval(timer); timer=setInterval(function(){go(cur+1)},5500); }
    go(0); play();
    var prev=$('[aria-label="Previous banner"]',shell), next=$('[aria-label="Next banner"]',shell);
    if(prev)prev.addEventListener('click',function(){go(cur-1);play()}); if(next)next.addEventListener('click',function(){go(cur+1);play()});
    shell.addEventListener('mouseenter',function(){clearInterval(timer)}); shell.addEventListener('mouseleave',play);
    var tx=0; shell.addEventListener('touchstart',function(e){tx=e.touches[0].clientX},{passive:true}); shell.addEventListener('touchend',function(e){var d=e.changedTouches[0].clientX-tx; if(Math.abs(d)>50){go(cur+(d<0?1:-1));play()}});
  }
}

/* ---------- MODALS ---------- */
function modal(html,cls){ var o=document.createElement('div'); o.className='skg-overlay'; o.innerHTML='<div class="skg-modal '+(cls||'')+'" role="dialog" aria-modal="true"><button class="skg-x" aria-label="Close">&times;</button>'+html+'</div>';
  document.body.appendChild(o); document.body.style.overflow='hidden';
  function close(){ o.remove(); document.body.style.overflow=''; document.removeEventListener('keydown',esc); }
  function esc(e){ if(e.key==='Escape')close(); }
  o.addEventListener('click',function(e){ if(e.target===o||e.target.closest('.skg-x'))close(); }); document.addEventListener('keydown',esc);
  return {el:o,close:close}; }
function watchStory(){ modal('<div class="skg-video"><iframe src="'+S.watchVideo+'" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>','skg-wide'); }

function donate(){
  var amt=1100, freq='recurring', g80='No';
  var m=modal(
   '<div class="skg-head"><img src="'+ROOT+'images/Logo.png" alt=""><div><h3>Donate to '+S.short+'</h3><p>Just a few details to get started</p></div></div>'+
   '<label class="skg-l">Donation Frequency</label><div class="skg-row"><div class="skg-seg" data-k="freq"><button type="button" data-v="once">One Time</button><button type="button" data-v="recurring" class="on">Recurring</button></div><select class="skg-sel"><option>Monthly</option><option>Quarterly</option><option>Yearly</option></select></div>'+
   '<label class="skg-l">Mobile Number *</label><div class="skg-row"><span class="skg-flag">🇮🇳</span><input class="skg-in" id="skg-mob" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number"></div><small class="skg-err" id="skg-e1">Please enter your mobile number first</small>'+
   '<label class="skg-l">Full Name *</label><input class="skg-in" id="skg-name" placeholder="Your full name">'+
   '<div class="skg-row skg-top"><div><label class="skg-l">80G Certificate?</label><div class="skg-seg" data-k="g80"><button type="button" data-v="No" class="on">No</button><button type="button" data-v="Yes">Yes</button></div></div><div style="flex:1"><label class="skg-l">Email (optional)</label><input class="skg-in" id="skg-mail" placeholder="Email address"></div></div>'+
   '<label class="skg-c"><input type="checkbox" checked> I’m an Indian National</label><label class="skg-c"><input type="checkbox"> Make my donation anonymous</label><label class="skg-c"><input type="checkbox" checked> I want to receive seva updates</label>'+
   '<label class="skg-l">Choose an Amount *</label><div class="skg-amts"><button type="button" data-a="500">₹500</button><button type="button" data-a="1100" class="on"><i>RECOMMENDED</i>₹1,100</button><button type="button" data-a="2100">₹2,100</button><div class="skg-custom"><small>CUSTOM</small><span>₹</span><input id="skg-cust" inputmode="numeric" placeholder="Amount"></div></div>'+
   '<button class="skg-go" id="skg-go" type="button">Donate ₹1,100 Now</button>','skg-donate');
  var el=m.el, go=$('#skg-go',el);
  function setAmt(a){ amt=a; go.textContent='Donate ₹'+(a?a.toLocaleString('en-IN'):'')+' Now'; }
  $$('.skg-seg',el).forEach(function(seg){ $$('button',seg).forEach(function(b){ b.onclick=function(){ $$('button',seg).forEach(function(x){x.classList.remove('on')}); b.classList.add('on'); if(seg.dataset.k==='freq')freq=b.dataset.v; else g80=b.dataset.v; $('.skg-sel',el).style.opacity=freq==='once'?.4:1; }; }); });
  $$('.skg-amts button',el).forEach(function(b){ b.onclick=function(){ $$('.skg-amts button',el).forEach(function(x){x.classList.remove('on')}); b.classList.add('on'); $('#skg-cust',el).value=''; setAmt(+b.dataset.a); }; });
  $('#skg-cust',el).oninput=function(){ this.value=this.value.replace(/\D/g,''); $$('.skg-amts button',el).forEach(function(x){x.classList.remove('on')}); setAmt(+this.value||0); };
  $('#skg-mob',el).oninput=function(){ this.value=this.value.replace(/\D/g,''); $('#skg-e1',el).style.display=this.value.length===10?'none':'block'; };
  go.onclick=function(){
    var mob=$('#skg-mob',el).value, nm=$('#skg-name',el).value.trim();
    if(mob.length!==10){ $('#skg-e1',el).style.display='block'; $('#skg-mob',el).focus(); return; }
    if(!nm){ $('#skg-name',el).focus(); return; } if(!amt||amt<1){ $('#skg-cust',el).focus(); return; }
    var msg='Namaste, I want to donate ₹'+amt+' ('+(freq==='once'?'one time':'monthly')+') to '+S.short+'.\nName: '+nm+'\nMobile: '+mob+'\n80G: '+g80;
    var box=$('.skg-modal',el);
    var bankHtml='<div class="skg-bank-details" style="max-width:560px;margin:18px auto 0;padding:16px;text-align:left;background:#f7f5ef;border:1px solid #e7dfce;border-radius:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;overflow-wrap:anywhere">'+
    '<div><small>Account Holder</small><br><b>SHREEKRISHNA KANHAIYA GAUSHALA SEWA ASSOCIATION</b></div>'+
    '<div><small>Account Number</small><br><b>62307202680</b></div>'+
    '<div><small>IFSC</small><br><b>IDFB0021693</b></div>'+
    '<div><small>SWIFT Code</small><br><b>IDFBINBBMUM</b></div>'+
    '<div><small>Bank</small><br><b>IDFC FIRST</b></div>'+
    '<div><small>Branch</small><br><b>SAHARANPUR - AMBALA ROAD BRANCH</b></div></div>'+
    '<p style="max-width:560px;margin:10px auto;font-size:12px;line-height:1.6">Registered Address: Gaushala, 75, Mayapur Ruppur Badshibag, Behat (Saharanpur), Saharanpur, Behat, Uttar Pradesh, India, 247121</p>';
  box.innerHTML='<button class="skg-x" aria-label="Close">&times;</button><div class="skg-pay"><h3>Thank you, '+nm.replace(/</g,'')+' 🙏</h3><p>Donation: <b>₹'+amt.toLocaleString('en-IN')+'</b> — scan the QR or pay to UPI <b>'+S.upi+'</b></p><img src="'+(/^(data:|https?:)/.test(S.qr)?S.qr:ROOT+S.qr)+'" alt="UPI QR" onerror="this.style.display=\'none\'">'+bankHtml+(S.payLink?'<a class="skg-go" target="_blank" rel="noopener" href="'+S.payLink+'">Pay online</a>':'')+'<a class="skg-go" target="_blank" rel="noopener" href="https://wa.me/'+S.whatsapp+'?text='+encodeURIComponent(msg)+'">Send details on WhatsApp</a></div>';

  };
}
document.addEventListener('click',function(e){
  var t=e.target.closest('button,a,[role="button"]'); if(!t)return;
  /* Never re-open donation flow from any control inside the existing donation modal. */
  if(t.closest('.skg-overlay,.skg-modal,.skg-pay') || t.id==='skg-go')return;
  var txt=(t.textContent||'').trim();
  if(/watch our story/i.test(txt)){ e.preventDefault(); watchStory(); return; }
  if(/^donate(\s|$|\s*now|\s*for)/i.test(txt)&&!/kind/i.test(txt)){ var href=t.getAttribute('href'); if(!href||href==='#'||t.tagName==='BUTTON'){ e.preventDefault(); closeMenu(); donate(); } }
  if(t.matches('[aria-label="Account"]')){ e.preventDefault(); donate(); }
});


$$('button,a').forEach(function(b){ if(/watch our story/i.test(b.textContent)&&b.textContent.length<30){ b.style.background='#F5B800'; b.style.color='#2e2416'; $$('span',b).forEach(function(x){x.style.color='#2e2416'}); } });

/* ---------- COUNTERS ---------- */
function countUp(node){
  var w=document.createTreeWalker(node,NodeFilter.SHOW_TEXT,null), tn=[], n; while((n=w.nextNode())){ if(/^\s*\d[\d,]*(\s*-\s*\d[\d,]*)?\s*$/.test(n.nodeValue)) tn.push(n); }
  tn.forEach(function(n){ var orig=n.nodeValue, nums=orig.match(/\d[\d,]*/g).map(function(x){return +x.replace(/,/g,'')}), t0=null, dur=1800;
    function fmt(v,o){ return o.indexOf(',')>-1?Math.round(v).toLocaleString('en-IN'):String(Math.round(v)); }
    var parts=orig.match(/\d[\d,]*/g);
    function step(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1), e=1-Math.pow(1-p,3), k=0;
      n.nodeValue=orig.replace(/\d[\d,]*/g,function(){ var v=nums[k]*e, s=fmt(v,parts[k]); k++; return s; }); if(p<1)requestAnimationFrame(step); else n.nodeValue=orig; }
    requestAnimationFrame(step); });
}
var statEls=[]; $$('*').forEach(function(el){ if(el.children.length<=6&&/years of seva|animals treated|doctors|in care every day/i.test(el.textContent)&&el.textContent.length<60&&el.children.length) {} });
var statsHost=null; $$('div').forEach(function(d){ if(!statsHost&&/years of seva/i.test(d.textContent)&&/in care every day/i.test(d.textContent)&&d.textContent.length<200) statsHost=d; });
// narrow to the innermost container holding all 4
function inner(d){ var k=[].slice.call(d.children).filter(function(c){return /years of seva|in care every day/i.test(c.textContent)}); return k.length===1?inner(k[0]):d; }
if(statsHost&&!CMS_EDIT){ statsHost=inner(statsHost); var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ countUp(statsHost); io.disconnect(); } }); },{threshold:.35}); io.observe(statsHost); }

/* ---------- STORIES THAT MOVE (video carousel) ---------- */
var stage=$('.gsd-video-stage');
if(stage&&!CMS_EDIT){
  var cards=$$('.gsd-video-card',stage), cnt=$('.gsd-video-count'), N=cards.length, act=0;
  var POSTERS=['seva-by-deviji.webp','hosp2.webp','b1hospital.webp','rescueimg2.webp','welfare2.webp'].map(function(f){return ROOT+'images/'+f});
  var allowPlay=false;
  var pre=cards.map(function(c,i){ return {html:c.innerHTML}; });
  var title=cards.map(function(c){ var p=$('.gsd-video-card-title',c); return p?p.textContent:(c.querySelector('video')?c.querySelector('video').title:''); });
  function layout(){
    cards.forEach(function(c,i){
      var d=i-act; if(d>N/2)d-=N; if(d<-N/2)d+=N; var a=Math.abs(d);
      var tx=(d<0?-1:1)*[0,47,80,100][Math.min(a,3)], sc=[1,.82,.64,.5][Math.min(a,3)], op=[1,.68,.22,0][Math.min(a,3)];
      c.style.transform='translate(-50%,-50%) translateX('+tx+'%) scale('+sc+')'; c.style.opacity=op; c.style.zIndex=10-a*3; c.style.pointerEvents=a>2?'none':'auto';
      var on=i===act; c.classList.toggle('gsd-video-card-active',on);
      var v=$('video',c);
      if(on){ if(!v){ c.innerHTML='<video src="'+S.videoBase+S.videos[i%S.videos.length]+'.mp4" poster="'+POSTERS[i%POSTERS.length]+'" title="'+title[i].replace(/"/g,'')+'" controls playsinline preload="metadata" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#111"></video><span class="gsd-video-card-shine" aria-hidden="true"></span>'; v=$('video',c); v.addEventListener('ended',function(){ setAct(act+1) }); }
        if(allowPlay){ var pr=v.play&&v.play(); if(pr&&pr.catch)pr.catch(function(){}); } }
      else if(v){ v.pause(); c.innerHTML=pre[i].html||''; if(!$('.gsd-video-card-title',c)&&title[i])c.insertAdjacentHTML('afterbegin',''); }
    });
    if(cnt)cnt.textContent=('0'+(act+1)).slice(-2)+' / '+('0'+N).slice(-2);
  }
  function setAct(n){ allowPlay=true; act=(n+N)%N; layout(); }
  cards.forEach(function(c,i){ c.addEventListener('click',function(){ if(i!==act)setAct(i); }); });
  var pv=$('[aria-label="Previous video"]'), nx=$('[aria-label="Next video"]');
  if(pv)pv.onclick=function(){setAct(act-1)}; if(nx)nx.onclick=function(){setAct(act+1)};
  // first video: keep original element, just position cards
  var firstVid=$('video',cards[0]); if(firstVid){ firstVid.poster=POSTERS[0]; firstVid.preload='metadata'; firstVid.addEventListener('ended',function(){setAct(act+1)}); try{firstVid.pause();firstVid.currentTime=0}catch(e){} }
  pre[0].html=cards[0].innerHTML;
  cards.forEach(function(c,i){ if(i!==0&&!pre[i].html)pre[i].html=c.innerHTML; });
  // poster fallback for card 0 when it later becomes inactive
  pre[0].html='<div style="position:absolute;inset:0;background:#17130e"><img alt="" src="'+POSTERS[0]+'" style="width:100%;height:100%;object-fit:cover" onerror="this.remove()"><span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:58px;height:58px;border-radius:50%;display:grid;place-items:center;color:#fff;background:#E0A800">▶</span></div><p class="gsd-video-card-title">'+title[0]+'</p><span class="gsd-video-card-shine"></span>';
  layout();
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){ es.forEach(function(e){
      if(e.isIntersecting&&!allowPlay){ allowPlay=true; var v=$('video',cards[act]); if(v){ var pr=v.play(); if(pr&&pr.catch)pr.catch(function(){}); } io.disconnect(); }
    }); },{threshold:.6});
    io.observe(stage);
  }
}

/* ---------- TESTIMONIALS (supporter pills) ---------- */
var pills=$$('.gsd-supporter-pill'), stories=$$('.gsd-supporter-story');
if(pills.length&&stories.length&&!CMS_EDIT){
  var si=0, st;
  function showStory(n){ si=(n+stories.length)%stories.length; stories.forEach(function(s,k){ s.classList.toggle('is-active',k===si); s.setAttribute('aria-hidden',k!==si); }); pills.forEach(function(p,k){ p.classList.toggle('is-active',k===si); }); }
  pills.forEach(function(p,k){ if(p.disabled)return; p.addEventListener('click',function(){ showStory(k); restart(); }); });
  function restart(){ clearInterval(st); st=setInterval(function(){ showStory(si+1) },7000); } restart(); }
/* orbit testimonials (hidden layout fallback) */
$$('.gsd-tst-sat,.gsd-tst-dot').forEach(function(b,k,all){ b.addEventListener('click',function(){ $$('.gsd-tst-sat,.gsd-tst-dot').forEach(function(x){x.classList.remove('gsd-tst-sat-active','gsd-tst-dot-active')}); b.classList.add(b.classList.contains('gsd-tst-dot')?'gsd-tst-dot-active':'gsd-tst-sat-active'); }); });

/* ---------- SCROLL REVEAL (pages with animated sections) ---------- */
var rv=$$('section > div, .gsd-wwd-card, [class*="card"]').filter(function(e){ return !e.closest('.navbar-wrap')&&!e.closest('.mobile-menu')&&e.getBoundingClientRect().top>window.innerHeight*0.9; });
if(!CMS_EDIT&&'IntersectionObserver' in window){ var ro=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('skg-in'); ro.unobserve(e.target); } }); },{threshold:.01,rootMargin:"0px 0px -4% 0px"}); rv.forEach(function(e){ e.classList.add('skg-rv'); ro.observe(e); }); $$('.skg-rv').forEach(function(e){ if(rv.indexOf(e)<0) ro.observe(e); }); } else { $$('.skg-rv').forEach(function(e){ e.classList.add('skg-in'); }); }


/* ---------- ABOUT page extras ---------- */
var abv=$('#abv');
if(abv){ $$('.ab-pl button').forEach(function(b){ b.addEventListener('click',function(){ $$('.ab-pl button').forEach(function(x){x.classList.remove('on')}); b.classList.add('on'); abv.src=S.videoBase+b.dataset.v+'.mp4'; var p=abv.play(); if(p&&p.catch)p.catch(function(){}); }); }); }
if(!CMS_EDIT)$$('.ab-imp b[data-c]').forEach(function(el){ var to=+el.dataset.c, suf=el.dataset.s||'', io2=new IntersectionObserver(function(es){ if(es[0].isIntersecting){ io2.disconnect(); var t0=null; (function st(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/1600,1),v=Math.round(to*(1-Math.pow(1-p,3))); el.textContent=v.toLocaleString('en-IN')+suf; if(p<1)requestAnimationFrame(st); })(performance.now()); } },{threshold:.5}); io2.observe(el); });

/* ---------- FOOTER / misc ---------- */
$$('a[href="#"]').forEach(function(a){ a.addEventListener('click',function(e){e.preventDefault()}); });
var up=$('.gsd-scroll-top,[aria-label="Back to top"]'); if(up)up.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});
})();
