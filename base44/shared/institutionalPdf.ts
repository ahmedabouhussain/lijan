import { jsPDF } from 'npm:jspdf@4.2.1';
import { bytesBase64 } from './institutionalExportAssets.ts';
export function institutionalPdf(model,assets){
  const doc=new jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
  for(const [style,key] of [['normal','regular'],['bold','bold']]){doc.addFileToVFS(`naskh-${key}.ttf`,bytesBase64(assets[key]));doc.addFont(`naskh-${key}.ttf`,'Noto Naskh Arabic',style);}
  const ar=model.language==='ar', left=18,right=192,width=174;let y=51;
  doc.setFont('Noto Naskh Arabic');doc.setFontSize(11);doc.setCreationDate(new Date(model.generated_at));
  const header=()=>{doc.addImage(assets.lijan,'PNG',ar?151:18,10,38,16);doc.addImage(assets.connection,'PNG',ar?18:155,13,36,12);if(assets.owner)doc.addImage(assets.owner,'PNG',94,10,20,16);doc.setFontSize(10);doc.setR2L(false);doc.text(model.identity,105,34,{align:'center'});doc.setR2L(ar);doc.text(model.organization_name,ar?right:left,43,{align:ar?'right':'left'});};
  const page=()=>{doc.addPage();header();y=51;};
  const lines=(text,size=11,bold=false)=>{doc.setFontSize(size);doc.setFont('Noto Naskh Arabic',bold?'bold':'normal');doc.setR2L(ar);const wrapped=doc.splitTextToSize(String(text||''),width);for(const line of wrapped){if(y>268)page();doc.text(line,ar?right:left,y,{align:ar?'right':'left'});y+=7;}y+=3;};
  header();lines(model.title,17,true);lines(model.committee_name,12,true);
  lines(`${model.classification_label} | ${model.reference} | v${model.version} | ${model.generated_at}`,9);
  for(const s of model.sections){lines(s.heading,13,true);if(s.body)lines(s.body);if(s.columns){const columns=ar?[...s.columns].reverse():s.columns;const cellWidth=width/columns.length;const rows=[columns,...s.rows.map(r=>ar?[...r].reverse():r)];for(let index=0;index<rows.length;index++){doc.setFont('Noto Naskh Arabic',index===0?'bold':'normal');doc.setFontSize(10);const text=rows[index].map(v=>doc.splitTextToSize(String(v??''),cellWidth-5));const height=Math.max(...text.map(v=>v.length))*6+5;if(height>210)throw new Error('Table row exceeds page; export blocked rather than clipped');if(y+height>269)page();for(let c=0;c<columns.length;c++){const x=left+c*cellWidth;doc.setDrawColor(220);doc.rect(x,y,cellWidth,height);doc.setR2L(ar);for(let n=0;n<text[c].length;n++)doc.text(text[c][n],ar?x+cellWidth-2:x+2,y+5+n*6,{align:ar?'right':'left'});}y+=height;}y+=6;}}
  const total=doc.getNumberOfPages();for(let p=1;p<=total;p++){doc.setPage(p);doc.setR2L(false);doc.setFontSize(8);doc.text(`${model.generator_version} | ${p}/${total}`,105,285,{align:'center'});}
  return new Uint8Array(doc.output('arraybuffer'));
}