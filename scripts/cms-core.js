/* Shared CMS client. All authentication and content live in Cloudflare Worker KV. */
(function(w){
var LS=w.localStorage,ROOT=w.CMS_ROOT||'',BASE=(w.CMS_WORKER_URL||'').replace(/\/$/,''),TOKEN='cms_worker_token';
function configured(){return BASE&&BASE.indexOf('YOUR-WORKER-NAME')<0}
function req(path,opt){if(!configured())return Promise.reject({error:'Admin cloud service configure nahi hua. Cloudflare Worker URL set karna zaroori hai.'});opt=opt||{};opt.headers=Object.assign({'Content-Type':'application/json'},opt.headers||{});var t=LS.getItem(TOKEN);if(t)opt.headers.Authorization='Bearer '+t;return fetch(BASE+'/api/'+path,opt).then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(!r.ok)throw{error:j.error||('Request failed '+r.status)};return j})})}
var CMS=w.CMS={prev:{},ROOT:ROOT,abs:function(u){if(/^worker-media:/.test(u))return BASE+'/api/media/'+encodeURIComponent(u.slice(13));return /^(data:|https?:|\/|blob:)/.test(u)?u:ROOT+u},admin:function(){return +LS.getItem('cms_admin')>Date.now()&&!!LS.getItem(TOKEN)},cfg:function(){return {worker:BASE||''}},gh:function(){return Promise.reject({error:'GitHub connection ab zaroori nahi hai.'})},put:function(){return Promise.reject({error:'GitHub connection ab zaroori nahi hai.'})},
 login:function(email,password){return req('login',{method:'POST',body:JSON.stringify({email:email,password:password})}).then(function(r){LS.setItem(TOKEN,r.token);LS.setItem('cms_admin',Date.now()+6048e5);return r})},
 saveSettings:function(s){return req('settings',{method:'PUT',body:JSON.stringify(s)}).then(function(){LS.setItem('cms_settings',JSON.stringify(s));return{ok:1}})},
 save:function(p,html){return req('page/'+encodeURIComponent(p),{method:'PUT',body:JSON.stringify({html:html})}).then(function(){LS.setItem('cms_p_'+p,JSON.stringify({html:html,updated:Date.now()}));return{ok:1}})},
 revert:function(p){return req('page/'+encodeURIComponent(p),{method:'DELETE'}).then(function(){LS.removeItem('cms_p_'+p);return{ok:1}})},
 media:function(){return Promise.all([req('media'),fetch(ROOT+'media.json').then(function(r){return r.ok?r.json():[]}).catch(function(){return[]})]).then(function(v){return v[0].concat((v[1]||[]).map(function(u){return{url:u,up:false}}))})},
 upload:function(name,data){return req('upload',{method:'POST',body:JSON.stringify({name:name,data:data})})},
 pagesEdited:function(){return req('pages')}
};
w.api=function(u,o){o=o||{};var url=new URL(u,'https://local.invalid'),r=url.pathname.replace(/^\/api\//,''),p=url.searchParams.get('p'),m=o.method||'GET',b={};try{b=JSON.parse(o.body||'{}')}catch(e){}
 if(r==='login')return CMS.login(b.email,b.password);
 if(r==='me')return req('me');
 if(r==='logout'){LS.removeItem(TOKEN);LS.removeItem('cms_admin');return req('logout').catch(function(){return{ok:1}})}
 if(!CMS.admin())return Promise.reject({error:'Login required'});
 if(r==='page'&&m==='PUT')return CMS.save(p,b.html);
 if(r==='page'&&m==='DELETE')return CMS.revert(p);
 if(r==='pages')return CMS.pagesEdited();
 if(r==='media'&&m==='GET')return CMS.media();
 if(r==='media'&&m==='DELETE')return req('media/'+encodeURIComponent(url.searchParams.get('f')),{method:'DELETE'});
 if(r==='upload')return CMS.upload(b.name,b.data);
 return Promise.reject({error:'Unknown API request'});
};
})(window);
