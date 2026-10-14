import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolvePrincipal, authorizeRead } from '../../shared/governedReadPolicy.ts';
export default async function(req){
 try{
  const base44=createClientFromRequest(req),user=await base44.auth.me().catch(()=>null),body=await req.json();
  if(!user&&!body.showcase_token)return Response.json({code:'unauthenticated'},{status:401});
  if(typeof body.artifact_id!=='string')return Response.json({code:'invalid_request'},{status:400});
  const artifact=await base44.asServiceRole.entities.InstitutionalExportArtifact.get(body.artifact_id);
  const principal=await resolvePrincipal({sr:base44.asServiceRole,body,callerUser:user});
  if(artifact.showcase_session_id&&principal.session?.id!==artifact.showcase_session_id)return Response.json({error:'Record not available',code:'not_found'},{status:404});
  if(!artifact.showcase_session_id&&artifact.requester_id!==user?.id)return Response.json({error:'Record not available',code:'not_found'},{status:404});
  const verdict=await authorizeRead({base44,sr:base44.asServiceRole,principal,record:artifact});
  if(!verdict.allowed)return Response.json({error:'Record not available',code:'not_found'},{status:404});
  return Response.json({file_uri:artifact.file_uri,filename:artifact.filename,sha256:artifact.sha256,expires_in:60});
 }catch(error){return Response.json({error:'Record not available',code:'not_found'},{status:404});}
}