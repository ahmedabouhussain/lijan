import ExcelJS from 'npm:exceljs@4.4.0';
export async function institutionalXlsx(m,a){
 const wb=new ExcelJS.Workbook();wb.creator=m.identity;wb.created=new Date(m.generated_at);wb.modified=new Date(m.generated_at);
 const ws=wb.addWorksheet(m.language==='ar'?'التقرير':'Report',{views:[{rightToLeft:m.direction==='rtl'}],pageSetup:{paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0},headerFooter:{oddFooter:'&C&P / &N'}});
 ws.columns=[{width:35},{width:72},{width:30}];ws.addRow([m.identity]);ws.addRow([m.title]);ws.addRow([m.organization_name]);ws.addRow([m.committee_name]);ws.addRow([m.classification_label,m.reference,m.version]);ws.addRow([m.generated_at,m.generator_version]);
 for(const [key,col] of [['owner',0],['lijan',1],['connection',2]])if(a[key]){const id=wb.addImage({buffer:a[key],extension:'png'});ws.addImage(id,{tl:{col,row:6},ext:{width:120,height:48}});}ws.addRow([]);ws.addRow([]);ws.addRow([]);
 for(const s of m.sections){ws.addRow([s.heading]);if(s.body)ws.addRow([s.body]);if(s.columns){const header=ws.addRow(s.columns);header.font={bold:true,name:'Noto Naskh Arabic',color:{argb:'FFFFFFFF'}};header.eachCell(c=>c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF871746'}});for(const r of s.rows)ws.addRow(r.length?r:['']);if(!s.rows.length)ws.addRow([m.language==='ar'?'لا توجد سجلات':'No records']);}ws.addRow([]);}
 ws.eachRow(row=>{row.eachCell(cell=>{cell.font={name:'Noto Naskh Arabic',size:11,...cell.font};cell.alignment={wrapText:true,vertical:'top',horizontal:m.direction==='rtl'?'right':'left',readingOrder:m.direction==='rtl'?'rtl':'ltr'};});row.height=Math.max(24,Math.ceil(Math.max(...row.values.slice(1).map(v=>String(v||'').length))/55)*18);});
 return new Uint8Array(await wb.xlsx.writeBuffer());
}