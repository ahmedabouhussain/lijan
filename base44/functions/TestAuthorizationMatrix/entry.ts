import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand } from '../../shared/commandGuard.ts';
import { AUTHORITY_POLICY_VERSION } from '../../shared/authorityKernel.ts';
export default async function(req){
 try{
  const client=createClientFromRequest(req),caller=await client.auth.me();
  if(caller?.role!=='admin')return Response.json({code:'forbidden'},{status:403});
  const at=new Date().toISOString(),org='FIXTURE-ORG-A',com='FIXTURE-COM-A';
  const cases=[
   ['MAT-01','member','meeting.start',false],['MAT-02','secretary','attendance.certify',true],['MAT-03','chair','meeting.start',true],
   ['MAT-04','vice_chair','meeting.start',false],['MAT-05','vice_chair','meeting.start',true,'delegated'],['MAT-06','vice_chair','meeting.start',false,'expired'],
   ['MAT-07','member','vote.cast',false,'recused'],['MAT-08','chair','meeting.start',false,'revoked'],['MAT-09','admin','meeting.start',false],
   ['MAT-10','chair','meeting.start',false,'cross_committee'],['MAT-11','chair','meeting.start',false,'cross_org'],
   ['MAT-12','chair','meeting.start',false,'injection'],['MAT-13','chair','meeting.start',false,'missing'],['MAT-14','chair','meeting.start',false,'closed'],['MAT-15','chair','meeting.start',false,'repeated']
  ];
  const results=[];
  for(const [id,role,cap,expect,scenario] of cases){
   const user={id:'FIXTURE-USER-'+role,role:role==='admin'?'admin':'user',full_name:'Synthetic '+role};
   const seat={id:'FIXTURE-SEAT-'+id,user_id:user.id,committee_id:scenario==='cross_committee'||scenario==='cross_org'?'FIXTURE-COM-B':com,organization_id:scenario==='cross_org'?'FIXTURE-ORG-B':org,role,status:scenario==='revoked'?'revoked':'active',term_start:'2026-01-01',term_end:'2027-12-31'};
   const target={id:'FIXTURE-MTG-'+id,committee_id:com,organization_id:org,status:scenario==='closed'||scenario==='repeated'?'completed':cap==='attendance.certify'?'in_progress':'scheduled'};
   const effects=[];
   const rows={Committee:[{id:com,organization_id:org,status:'active'}],Meeting:scenario==='missing'?[]:[target],CommitteeMembership:[seat],OrganizationMembership:[],AuthorityGrant:[],SeatAppointmentEvent:[],Recusal:scenario==='recused'?[{committee_id:com,member_user_id:user.id,status:'active'}]:[],Delegation:scenario==='delegated'||scenario==='expired'?[{id:'FIXTURE-DEL-'+id,committee_id:com,to_user_id:user.id,status:'active',valid_from:'2026-01-01',valid_until:scenario==='expired'?'2026-01-02':'2027-12-31'}]:[]};
   const match=(r,q)=>Object.entries(q).every(([k,v])=>v&&typeof v==='object'?v.$in?v.$in.includes(r[k]):v.$ne?r[k]!==v.$ne:true:r[k]===v);
   const entities=new Proxy({}, {get:(_,type)=>({get:async rid=>{const r=(rows[type]||[]).find(r=>r.id===rid);if(!r)throw Object.assign(new Error('not found'),{status:404});return r;},filter:async(q,opts)=>{const items=(rows[type]||[]).filter(r=>match(r,q));return opts?{items,has_more:false}:items;},create:async data=>{effects.push({entity:type,...data});return {id:'FIXTURE-AUDIT',...data};}})});
   const fixture={auth:{me:async()=>user},asServiceRole:{entities}};
   const verdict=await authorizeCommand(fixture,{capability:cap,target_type:'Meeting',target_id:target.id,claimed_committee_id:scenario==='injection'?'FIXTURE-COM-B':null});
   results.push({test_id:id,operation:cap,target_record:target.id,actor_role:role,membership_id:seat.id,organization:seat.organization_id,committee:seat.committee_id,effective_date:at,required_capability:cap,expected_result:expect?'allow':'deny',actual_result:verdict.allowed?'allow':'deny',denial_code:verdict.code||null,http_result:verdict.allowed?200:verdict.status,database_effect:'No real records changed; command authorization only',audit_effect:effects.map(r=>({entity:r.entity,action:r.action})),passed:verdict.allowed===expect});
  }
  return Response.json({policy_version:AUTHORITY_POLICY_VERSION,execution_boundary:'Query-aware synthetic storage harness calling the live command guard; not real-account HTTP or persisted workflow acceptance',total:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results});
 }catch(error){return Response.json({error:error.message},{status:500});}
}