import { resolvePrincipal, authorizeRead, projectRecord } from './governedReadPolicy.ts';
export const EXPORT_VERSION = 'institutional-export-2.0.0';
export const EXPORT_PRODUCTS = { committee_minutes: ['pdf','docx'], committee_report: ['pdf','docx'], personal_work_report: ['xlsx'], decision_register: ['xlsx'], attendance_register: ['xlsx'], executive_brief: ['pdf'], legislative_dossier: ['pdf','docx'], product_document: ['pdf','docx'] };
const labels = {draft:['مسودة','Draft'],in_review:['قيد المراجعة','Under review'],proposed:['مقترح','Proposed'],approved:['معتمد','Approved'],issued:['صادر','Issued'],executing:['قيد التنفيذ','Executing'],closed:['مغلق','Closed'],assigned:['مسند','Assigned'],in_progress:['قيد التنفيذ','In progress'],scheduled:['مجدول','Scheduled'],completed:['مكتمل','Completed'],present:['حاضر','Present'],absent:['غائب','Absent'],apologies:['معتذر','Apologies'],confirmed:['مؤكد','Confirmed'],invited:['مدعو','Invited'],pending:['بانتظار الإجراء','Pending'],evidence_pending:['بانتظار الدليل','Evidence pending'],verified:['تم التحقق','Verified'],overdue:['متأخر','Overdue'],blocked:['متعثر','Blocked']};
export async function loadExportModel(base44, body, user) {
  const { product_type:product, format, language:lang } = body;
  if (!EXPORT_PRODUCTS[product]?.includes(format) || !['ar','en'].includes(lang)) throw Object.assign(new Error('Unsupported export request'), {status:400});
  const sr = base44.asServiceRole;
  const sourceType = product === 'committee_minutes' ? 'MeetingMinutes' : product === 'legislative_dossier' ? 'LegislativeFile' : product === 'product_document' ? 'ProductInstance' : 'Committee';
  const target = await sr.entities[sourceType].get(body.source_id || body.committee_id);
  const cid = sourceType === 'Committee' ? target.id : target.committee_id;
  const principal = await resolvePrincipal({ sr, body, callerUser:user });
  const verdict = await authorizeRead({base44,sr,principal,record:{...target,committee_id:cid}});
  if(!verdict.allowed) throw Object.assign(new Error('Record not available'),{status:404,code:'not_found'});
  const committee=verdict.committee, ar=lang==='ar', t=(a,e)=>ar?a:e;
  const missing=t('غير متوفر بهذه اللغة','Not provided in this language');
  const pick=(r,key)=>ar?(r[key+'_ar']||(['body','mandate'].includes(key)?r[key]:'' )||missing):(r[key+'_en']||(['title','scope'].includes(key)&& !/[\u0600-\u06ff]/.test(r[key]||'')?r[key]:'')||missing);
  const state=(s)=>labels[s]?.[ar?0:1]||t('حالة غير مسماة','Unlabelled state');
  const org=await sr.entities.Organization.get(committee.organization_id);
  const ids=[committee.id,org.id,target.id], sections=[];
  const collection=async(type,query)=>{let cursor;const rows=[];do{const page=await sr.entities[type].filter({committee_id:cid,...query},{sort:'created_date',limit:100,cursor});for(const r of page.items){if(r.is_demo_data===false&&principal.kind==='showcase')throw Object.assign(new Error('Record not available'),{status:404});rows.push(projectRecord(r,{rank:verdict.read_rank,actorId:verdict.actor.id,showcase:principal.kind==='showcase'}).values);ids.push(r.id);}cursor=page.has_more?page.next_cursor:null;if(rows.length>1000)throw Object.assign(new Error('Export exceeds bounded record limit'),{status:413});}while(cursor);return rows;};
  const rowTable=(heading,columns,rows)=>sections.push({heading,columns,rows});
  let title;
  if(product==='committee_minutes'){
    title=t('محضر اجتماع اللجنة','Committee meeting minutes');
    const meeting=await sr.entities.Meeting.get(target.meeting_id);if(meeting.committee_id!==cid)throw new Error('Inconsistent source scope');ids.push(meeting.id);
    sections.push({heading:pick(meeting,'title'),body:pick(target,'body')});
    rowTable(t('بيانات المحضر','Minutes metadata'),[t('البند','Field'),t('القيمة','Value')],[[t('الرقم','Reference'),target.minutes_number||target.id],[t('الحالة','Status'),state(target.status)],[t('الحضور المسجل','Recorded attendance'),String(target.present_count??missing)]]);
  }else if(product==='legislative_dossier'){
    title=t('تقرير اللجنة التشريعي','Legislative committee report');
    sections.push({heading:pick(target,'subject_title'),body:ar?(target.report_conclusions||missing):(target.report_conclusions_en||missing)});
    sections.push({heading:t('التوصيات','Recommendations'),body:ar?(target.report_recommendations||missing):(target.report_recommendations_en||missing)});
  }else if(product==='product_document'){
    title=pick(target,'title');const raw=JSON.parse(target.generated_content||'[]');sections.push(...raw.map(r=>({heading:pick(r,'title'),body:pick(r,'content')})));
  }else if(product==='attendance_register'){
    title=t('سجل الحضور','Attendance register');const rows=await collection('Attendance',{});
    rowTable(title,[t('الاجتماع','Meeting'),t('الاسم','Name'),t('الحالة','Status')],rows.map(r=>[r.meeting_id,pick(r,'member_name'),state(r.status)]));
  }else{
    title=({committee_report:t('تقرير اللجنة','Committee report'),personal_work_report:t('تقرير العمل الشخصي','Personal work report'),decision_register:t('سجل القرارات','Decision register'),executive_brief:t('الموجز التنفيذي','Executive brief')})[product];
    if(['committee_report','executive_brief'].includes(product))sections.push({heading:t('اختصاص اللجنة','Committee mandate'),body:ar?(committee.mandate||missing):(committee.scope||missing)});
    if(product!=='personal_work_report'){
      const rows=await collection('Decision',{});
      rowTable(t('القرارات المسجلة','Recorded decisions'),[t('المرجع','Reference'),t('العنوان','Title'),t('الحالة','Status')],rows.map(r=>[r.decision_number||r.id,pick(r,'title'),state(r.status)]));
    }
    if(product!=='decision_register'){
      const query=product==='personal_work_report'?{owner_user_id:verdict.actor.id}:{};
      const rows=await collection('Action',query);
      rowTable(t('الإجراءات المسجلة','Recorded actions'),[t('العنوان','Title'),t('الموعد','Deadline'),t('الحالة','Status')],rows.map(r=>[pick(r,'title'),r.deadline||missing,state(r.status)]));
    }
  }
  if(principal.kind==='showcase')sections.unshift({heading:t('بيان المصدر','Source disclosure'),body:t('عرض تجريبي معزول، ليس سجلًا مؤسسيًا رسميًا. لا يستحدث هذا التقرير حضورًا أو أصواتًا أو موافقات.','Isolated synthetic showcase, not an official institutional record. This report invents no attendance, votes or approvals.')});
  return {title,sections,language:lang,direction:ar?'rtl':'ltr',font:'Noto Naskh Arabic',committee_id:cid,organization_id:org.id,committee_name:pick(committee,'name'),organization_name:pick(org,'name'),reference:target.minutes_number||target.reference_number||committee.public_id||target.id,version:String(target.version||1),generated_at:new Date().toISOString(),classification:committee.classification||'internal',classification_label:t('داخلي','Internal'),identity:'LIJAN™ by CONNECTION™',generator_version:EXPORT_VERSION,source_record_ids:[...new Set(ids)],showcase_session_id:principal.session?.id||null,requester_id:user?.id||null};
}