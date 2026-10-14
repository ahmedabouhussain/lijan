const ASSETS = {
  lijan:'https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/268a93442_LijanLogo.png',
  connection:'https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/86205ff34_image.png',
  regular:'https://lijan.base44.app/fonts/NotoNaskhArabic/NotoNaskhArabic-Regular.ttf',
  bold:'https://lijan.base44.app/fonts/NotoNaskhArabic/NotoNaskhArabic-Bold.ttf'
};
export async function loadInstitutionalAssets(base44, model) {
  const fetchBytes=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Institutional asset unavailable');return new Uint8Array(await r.arrayBuffer());};
  const assets=Object.fromEntries(await Promise.all(Object.entries(ASSETS).map(async([k,u])=>[k,await fetchBytes(u)])));
  const page=await base44.asServiceRole.entities.OrganizationAsset.filter({organization_id:model.organization_id,asset_type:'logo',variant:'primary',is_active:true,verification_status:'approved'},{limit:1});
  const logo=page.items[0];
  // Registry-verified assets only, never a caller URL. Private assets are signed by their owner service.
  if(logo?.source_url?.startsWith('https://'))assets.owner=await fetchBytes(logo.source_url);
  return assets;
}
export const bytesBase64 = bytes => {let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
export async function sha256(bytes){const d=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,'0')).join('');}