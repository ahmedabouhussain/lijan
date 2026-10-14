import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { loadExportModel, EXPORT_VERSION } from '../../shared/institutionalExportModel.ts';
import { loadInstitutionalAssets, sha256 } from '../../shared/institutionalExportAssets.ts';
import { institutionalPdf } from '../../shared/institutionalPdf.ts';
import { institutionalDocx } from '../../shared/institutionalDocx.ts';
import { institutionalXlsx } from '../../shared/institutionalXlsx.ts';
export default async function(req){
 try{
  const base44=createClientFromRequest(req), user=await base44.auth.me().catch(()=>null), body=await req.json();
  if(!user&&!body.showcase_token)return Response.json({code:'unauthenticated',error:'Record not available'},{status:401});
  const model=await loadExportModel(base44,body,user);
  const assets=await loadInstitutionalAssets(base44,model);
  const bytes=body.format==='pdf'?institutionalPdf(model,assets):body.format==='docx'?await institutionalDocx(model,assets):await institutionalXlsx(model,assets);
  const mime={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}[body.format];
  const filename=`LIJAN-${body.product_type}-${model.reference.replace(/[^a-z0-9-]/gi,'_').slice(0,50)}-${body.language}.${body.format}`;
  const hash=await sha256(bytes);
  const {file_uri}=await base44.asServiceRole.integrations.Core.UploadPrivateFile({file:new File([bytes],filename,{type:mime})});
  if(!file_uri)throw new Error('Private storage unavailable');
  const inspection='PARTIAL';
  const artifact=await base44.asServiceRole.entities.InstitutionalExportArtifact.create({committee_id:model.committee_id,organization_id:model.organization_id,requester_id:user?.id||null,showcase_session_id:model.showcase_session_id,product_type:body.product_type,language:body.language,format:body.format,filename,mime_type:mime,file_uri,size:bytes.length,sha256:hash,generator_version:EXPORT_VERSION,source_record_ids:model.source_record_ids,generated_at:model.generated_at,classification:model.classification,inspection_status:inspection,inspection_notes:body.format==='xlsx'?'IMPLEMENTED — NOT VERIFIED. Sheet direction and OOXML structure require inspection; fonts are declared, not embedded.':body.format==='docx'?'IMPLEMENTED — NOT VERIFIED. Font declarations and obfuscated font parts are generated; package relationships, opening and rendering require inspection.':'IMPLEMENTED — NOT VERIFIED. Font streams, text/search mapping, opening and Arabic shaping require inspection.'});
  await base44.asServiceRole.entities.AuditEvent.create({action:'create',entity_type:'InstitutionalExportArtifact',entity_id:artifact.id,committee_id:model.committee_id,organization_id:model.organization_id,actor_user_id:user?.id||'showcase',description:`${EXPORT_VERSION}|${filename}|SHA256:${hash}|sources:${model.source_record_ids.join(',')}`});
  return Response.json({artifact_id:artifact.id,filename,size:bytes.length,mime_type:mime,sha256:hash,generator_version:EXPORT_VERSION,inspection_status:inspection});
 }catch(error){return Response.json({error:error.status===404?'Record not available':error.message,code:error.code||'export_blocked'},{status:error.status||500});}
}