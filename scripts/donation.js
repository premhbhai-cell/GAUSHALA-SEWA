/* Organization footer details only. Donation buttons are owned by the original
   site.js donation flow; this file must never intercept Donate Now clicks. */
(function(){'use strict';
var company='SHREEKRISHNA KANHAIYA GAUSHALA SEWA ASSOCIATION';
var address='Gaushala, 75, Mayapur Ruppur Badshibag, Behat (Saharanpur), Saharanpur, Behat, Uttar Pradesh, India, 247121';
function addDetails(){var footer=document.querySelector('.footer-inner');if(!footer||footer.querySelector('.gsd-registered-details'))return;
 var block=document.createElement('div');block.className='gsd-registered-details';block.style.cssText='border-top:1px solid rgba(120,120,120,.25);margin-top:18px;padding:16px 0;font-size:12px;line-height:1.7';
 var b=document.createElement('strong');b.textContent=company;var a=document.createElement('div');a.textContent='Registered Address: '+address;block.appendChild(b);block.appendChild(a);footer.appendChild(block)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addDetails);else addDetails();
})();
