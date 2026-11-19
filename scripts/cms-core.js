/* Cloud CMS client. All persistent writes go through the authenticated server-side Worker. */
(function(w){
'use strict';
var ROOT=w.CMS_ROOT||'', API=(w.CMS_API_BASE||'').replace(/\/$/,''), LS=w.localStorage;
function request(path,opt){
 if(!API || API.indexOf('YOUR-GAUSHALA-ADMIN')>=0) return Promise.reject({error:'Admin cloud service abhi configure nahi hua. Cloudflare Worker URL set karna zaroori hai.'});
 opt=opt||{};opt.credentials='include';opt.headers=Object.assign({'Content-Type':'application/json'},opt.headers||{});var sess=LS.getItem('cms_session');if(sess)opt.headers.Authorization='Bearer '+sess;
 return fetch(API+path,opt).then(function(r){return r.text().then(function(t){var j={};try{j=t?JSON.parse(t):{}}catch(e){j={error:t||'Invalid server response'}}if(!r.ok)throw {error:j.error||('Server error '+r.status)};return j})});
}
var CMS=w.CMS={prev:{},ROOT:ROOT,
 abs:function(u){return /^(data:|https?:|\/|blob:)/.test(u)?u:ROOT+u},
 admin:function(){return +LS.getItem('cms_admin')>Date.now()},
 cfg:function(){return !!API && API.indexOf('YOUR-GAUSHALA-ADMIN')<0},
 request:request,
 saveSettings:function(S){return request('/api/settings',{method:'PUT',body:JSON.stringify(S)}).then(function(r){try{LS.setItem('cms_settings',JSON.stringify(S))}catch(e){}return r})},
 save:function(p,html,loc){return request('/api/page?p='+encodeURIComponent(p),{method:'PUT',body:JSON.stringify({html:html,local:loc})})},
 revert:function(p){return request('/api/page?p='+encodeURIComponent(p),{method:'DELETE'})},
 media:function(){return request('/api/media')},
 upload:function(name,data){return request('/api/upload',{method:'POST',body:JSON.stringify({name:name,data:data})})},
 pagesEdited:function(){return request('/api/pages')}
};
w.api=function(u,o){o=o||{};var method=o.method||'GET';
 if(u==='/api/login') return request('/api/login',{method:'POST',body:o.body}).then(function(r){if(r.token)LS.setItem('cms_session',r.token);LS.setItem('cms_admin',Date.now()+6048e5);return r});
 if(u==='/api/logout') return request('/api/logout',{method:'POST',body:'{}'}).then(function(r){LS.removeItem('cms_admin');LS.removeItem('cms_session');return r});
 if(u==='/api/me') return request('/api/me');
 if(u==='/api/settings') return request('/api/settings').then(function(r){if(r.settings)try{LS.setItem('cms_settings',JSON.stringify(r.settings))}catch(e){}return r.settings||{}});
 return request(u,{method:method,body:o.body});
};
})(window);
