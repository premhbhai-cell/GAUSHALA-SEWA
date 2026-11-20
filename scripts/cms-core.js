/* Vercel CMS client. Authentication is an HttpOnly server session cookie. */
(function(w){
var ROOT=w.CMS_ROOT||'', API='/api';
function req(path,opt){
 opt=opt||{};opt.credentials='same-origin';opt.headers=Object.assign({'Content-Type':'application/json'},opt.headers||{});
 return fetch(API+'/'+path,opt).then(function(r){return r.text().then(function(raw){var j={};try{j=raw?JSON.parse(raw):{}}catch(e){j={error:raw.slice(0,240)||('HTTP '+r.status)}}if(!r.ok)throw{error:j.error||('Request failed '+r.status)};return j})});
}
var CMS=w.CMS={prev:{},ROOT:ROOT,
 abs:function(u){if(/^worker-media:/.test(u))return '/uploads/cms/'+encodeURIComponent(u.slice(13));return /^(data:|https?:|\/|blob:)/.test(u)?u:ROOT+u},
 admin:function(){return +localStorage.getItem('cms_admin_hint')>Date.now()},
 cfg:function(){return {worker:location.origin+API}},
 login:function(email,password){return req('login',{method:'POST',body:JSON.stringify({email:email,password:password})}).then(function(r){localStorage.setItem('cms_admin_hint',Date.now()+6048e5);return r})},
 logout:function(){return req('logout',{method:'POST'}).then(function(r){localStorage.removeItem('cms_admin_hint');return r})},
 saveSettings:function(s){return req('settings',{method:'PUT',body:JSON.stringify(s)})},
 save:function(p,html){return req('page?p='+encodeURIComponent(p),{method:'PUT',body:JSON.stringify({html:html})})},
 revert:function(p){return req('page?p='+encodeURIComponent(p),{method:'DELETE'})},
 media:function(){return Promise.all([req('media-list').catch(function(){return[]}),fetch(ROOT+'media.json').then(function(r){return r.ok?r.json():[]}).catch(function(){return[]})]).then(function(v){return v[0].concat((v[1]||[]).map(function(u){return{url:u,up:false}}))})},
 upload:function(name,data){return req('media',{method:'POST',body:JSON.stringify({name:name,data:data})}).then(function(j){if(j&&j.url)CMS.prev[j.url]=data;return j})},
 pagesEdited:function(){return req('pages')}
};
w.api=function(u,o){
 o=o||{};var url=new URL(u,location.href),r=url.pathname.replace(/^\/api\//,''),p=url.searchParams.get('p'),m=o.method||'GET',b={};try{b=JSON.parse(o.body||'{}')}catch(e){}
 if(r==='login')return CMS.login(b.email,b.password);
 if(r==='me')return req('me');
 if(r==='logout')return CMS.logout();
 if(r==='settings')return req('settings',{method:m,body:o.body});
 if(r==='page'&&m==='PUT')return CMS.save(p,b.html);
 if(r==='page'&&m==='DELETE')return CMS.revert(p);
 if(r==='pages')return CMS.pagesEdited();
 if(r==='media'&&m==='GET')return CMS.media();
 if(r==='media'&&m==='DELETE')return req('media?id='+encodeURIComponent(url.searchParams.get('f')),{method:'DELETE'});
 if(r==='upload')return CMS.upload(b.name,b.data);
 return Promise.reject({error:'Unknown API request'});
};
})(window);
