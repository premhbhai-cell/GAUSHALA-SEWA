// Cleans OLD saved content (content/cms/*.json already stored in GitHub by earlier edits)
// so the old Krishna-circle logo and the old Hodal address can never come back on the live site.
const NEW_ADDRESS = 'Gaushala, 75, Mayapur Ruppur Badshibag, Behat (Saharanpur), Saharanpur, Behat, Uttar Pradesh, India, 247121';
const RULES = [
  [/Keela No\.\s?18, Khata No\.\s?654\/744, Near Karman Border, Hodal, Palwal, Haryana\s?-\s?121106/g, NEW_ADDRESS],
  [/World Sankirtan Tour \(Trust\) VPO-Khambi, Tehsil - Hodal Distt-Palwal, Haryana \(121106\)/g, NEW_ADDRESS],
  [/Hodal, Palwal, Haryana\. Open daily/g, 'Behat, Saharanpur, Uttar Pradesh. Open daily'],
  [/Hodal, Palwal District, Haryana/g, 'Behat, Saharanpur District, Uttar Pradesh'],
  [/Hodal, India \(HQ\)/g, 'Behat, Saharanpur, India (HQ)'],
  [/Hodal, Haryana/g, 'Behat, Saharanpur, Uttar Pradesh'],
  [/images\/flower\.webp/g, 'images/lotus-decor.webp'],
  [/images\/3lotus\.webp/g, 'images/lotus-decor.webp'],
  [/images\/Logo2?\.webp/g, 'images/Logo.png']
];
function fixText(s) {
  if (typeof s !== 'string') return s;
  for (const [re, rep] of RULES) s = s.replace(re, rep);
  return s;
}
function fixPage(obj) {
  if (obj && typeof obj.html === 'string') obj.html = fixText(obj.html);
  return obj;
}
function fixSettings(obj) {
  if (obj && typeof obj.address === 'string' && /Hodal|Palwal|Karman|Keela/i.test(obj.address)) obj.address = NEW_ADDRESS;
  return obj;
}
module.exports = { NEW_ADDRESS, fixText, fixPage, fixSettings };
