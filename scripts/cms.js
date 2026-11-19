/* ===== Shreekrishna Kanhaiya Gaushala – CMS runtime (har page par site.js se pehle chalta hai) ===== */
(function(w){
var d=document,LS=null;try{LS=w.localStorage}catch(e){}
var path=location.pathname.replace(/\\/g,'/'),inP=path.indexOf('/pages/')>-1,ROOT=inP?'../':'';
var pg=(path.split('/').pop()||'index.html').replace(/\.html$/,'')||'index';
function ls(k){try{return LS.getItem(k)}catch(e){return null}}
function adm(){return +ls('cms_admin')>Date.now()}
var ed=/[?&]edit=1/.test(location.search)&&w.parent!==w&&adm();
w.__CMS_EDIT=ed;w.CMS_ROOT=ROOT;w.CMS_PAGE=pg;
function getJSON(u){try{var x=new XMLHttpRequest();x.open('GET',ROOT+u+'?t='+Math.floor(Date.now()/60000),false);x.send();if(x.status==200||(x.status==0&&x.responseText))return JSON.parse(x.responseText)}catch(e){}return null}
function digits(s){return String(s||'').replace(/\D/g,'')}
function isAbs(u){return /^(data:|https?:|\/|blob:)/.test(u)}

/* ---- settings ---- */
var S=null;
if(adm()){try{S=JSON.parse(ls('cms_settings')||'null')}catch(e){}}
if(!S)S=getJSON('content/settings.json')||{upi:'shreekrishna88@idfcbank',qr:'images/qr.webp',address:'Gaushala, 75, Mayapur Ruppur Badshibag, Behat (Saharanpur), Saharanpur, Behat, Uttar Pradesh, India, 247121',bank:{name:'IDFC FIRST',branch:'SAHARANPUR - AMBALA ROAD BRANCH',account:'62307202680',ifsc:'IDFB0021693',swift:'IDFBINBBMUM',holder:'SHREEKRISHNA KANHAIYA GAUSHALA SEWA ASSOCIATION'}};
w.CMS_SETTINGS=S;

/* ---- page override (admin ne edit kiya ho to) ---- */
var root=d.getElementById('root'),j=null;
if(adm()){try{j=JSON.parse(ls('cms_p_'+pg)||'null')}catch(e){}}
if(!j)j=getJSON('content/'+pg+'.json');
if(j&&j.html&&root){
  var keep=[].slice.call(root.querySelectorAll('style'));
  root.innerHTML=j.html;
  keep.reverse().forEach(function(s){root.insertBefore(s,root.firstChild)});
}

/* ---- site config for site.js (QR, UPI, WhatsApp, banner slides) ---- */
var wa=digits(S.whatsapp);if(wa&&wa.length==10)wa='91'+wa;
var p1=digits(S.phone1).slice(-10),p2=digits(S.phone2).slice(-10);
w.CMS_SITE={upi:S.upi||'',qr:S.qr||'',payLink:S.payLink||'',whatsapp:wa||'',phone:p1?'+91'+p1:'',email:S.email||''};
w.CMS_SLIDES=S.slides||null;

/* ---- live settings apply (edit mode me nahi, taaki page me original values hi save hon) ---- */
function applySettings(){
  var B=S.bank||{},P=[];
  function add(a,b){if(b&&b!==a)P.push([a,b])}
  if(wa){add('919991774444',wa);add('9991774444',wa.slice(-10))}
  add('9253196127',p1);add('9671711162',p2);
  add('charity.gausevadham@gmail.com',(S.email||'').trim());
  add('Keela No.18, Khata No. 654/744, Near Karman Border, Hodal, Palwal, Haryana - 121106',(S.address||'Gaushala, 75, Mayapur Ruppur Badshibag, Behat (Saharanpur), Saharanpur, Behat, Uttar Pradesh, India, 247121').trim());
  add('50100026133002',(B.account||'').trim());add('HDFC0001734',(B.ifsc||'').trim());add('HDFC Bank',(B.name||'').trim());
  if(P.length){
    var rep=function(s){for(var i=0;i<P.length;i++)s=s.split(P[i][0]).join(P[i][1]);return s};
    var tw=d.createTreeWalker(d.body,4,null),n,arr=[];
    while((n=tw.nextNode())){var t=n.parentNode&&n.parentNode.nodeName;if(t=='SCRIPT'||t=='STYLE')continue;arr.push(n)}
    arr.forEach(function(n){var v=n.nodeValue,r=rep(v);if(r!==v)n.nodeValue=r});
    [].forEach.call(d.querySelectorAll('[href],[title],[aria-label],[alt]'),function(e){['href','title','aria-label','alt'].forEach(function(a){var v=e.getAttribute(a);if(v){var r=rep(v);if(r!==v)e.setAttribute(a,r)}})});
  }
  if(B.branch){
    [].forEach.call(d.querySelectorAll('.gsd-bank-row-body'),function(r){var h=r.querySelector('h4'),p=r.querySelector('p');if(h&&p&&/^branch$/i.test(h.textContent.trim()))p.textContent=B.branch});
    [].forEach.call(d.querySelectorAll('.footer-bank-details li'),function(li){var h=li.querySelector('strong');if(h&&/^branch$/i.test(h.textContent.trim())&&li.lastChild)li.lastChild.nodeValue=' – '+B.branch});
  }
  /* Keep bank details consistent on every page that displays the bank card. */
  if(B.swift||B.holder){
    var rows=d.querySelector('.gsd-bank-rows');
    if(rows){
      var vals={'Account Holder':B.holder||'SHREEKRISHNA KANHAIYA GAUSHALA SEWA ASSOCIATION','SWIFT Code':B.swift||'IDFBINBBMUM'};
      Object.keys(vals).forEach(function(label){
        var found=[].some.call(rows.querySelectorAll('.gsd-bank-row-body'),function(r){var h=r.querySelector('h4'),p=r.querySelector('p');if(h&&p&&h.textContent.trim().toLowerCase()===label.toLowerCase()){p.textContent=vals[label];return true}return false});
        if(!found){var row=d.createElement('div');row.className='gsd-bank-row';row.innerHTML='<span class="gsd-bank-row-icon"></span><div class="gsd-bank-row-body"><h4>'+label+'</h4><p>'+vals[label]+'</p></div>';rows.appendChild(row)}
      });
    }
  }
  if(S.qr){var q=isAbs(S.qr)?S.qr:ROOT+S.qr;[].forEach.call(d.querySelectorAll('img[src$="qr.webp"]'),function(i){i.src=q})}
  var so=S.social||{};
  [].forEach.call(d.querySelectorAll('a[data-social]'),function(a){var u=(so[a.getAttribute('data-social')]||'').trim();if(u){a.href=u;a.target='_blank';a.rel='noopener noreferrer'}});
}
if(!ed)applySettings();

/* ---- edit-mode helpers / admin link ---- */
function ld(src,cb){var s=d.createElement('script');s.src=ROOT+src;s.onload=cb;d.body.appendChild(s)}
function ready(){
  if(ed){
    var st=d.createElement('style');st.className='cms-ui';st.textContent='.skg-rv{opacity:1!important;transform:none!important}.gsd-bn-wrapper,.razorpay-container,.gsd-lang,.nav-dropdown-panel{display:none!important}';d.head.appendChild(st);
    ld('scripts/cms-config.js',function(){ld('scripts/cms-core.js',function(){ld('scripts/editor.js')})});
  }else{
    function hdr(){
      var label=adm()?'ADMIN PANEL':'ADMIN LOGIN';
      var aw=d.querySelector('.navbar .account-wrap');
      if(aw&&!aw.querySelector('.cms-hdr-login')){var a=d.createElement('a');a.className='cms-hdr-login cms-hdr-desk';a.href=ROOT+'admin.html';a.textContent=label;aw.insertBefore(a,aw.firstChild)}
      var mm=d.querySelector('.mobile-menu-inner');
      if(mm&&!mm.querySelector('.cms-hdr-login')){var b=d.createElement('a');b.className='cms-hdr-login cms-hdr-mobile';b.href=ROOT+'admin.html';b.textContent=label;mm.appendChild(b)}
    }
    hdr();
    try{new MutationObserver(hdr).observe(d.body,{childList:true,subtree:true})}catch(e){}
    var host=d.querySelector('.footer-bottom-links')||d.querySelector('.gsd-footer .footer-brand');
    if(host&&!host.querySelector('.cms-login')){var a=d.createElement('a');a.className='cms-login';a.href=ROOT+'admin.html';a.textContent=adm()?'Admin Panel':'Admin Login';host.appendChild(a)}
  }
}
if(d.readyState=='loading')d.addEventListener('DOMContentLoaded',ready);else ready();
})(window);
