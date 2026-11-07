import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { generateSiteContent } from '@/lib/ai';
import { generateSubdomainSlug } from '@/lib/slug';
import { extractCity } from '@/lib/clinicIngest';
import { siteBaseUrl } from '@/lib/siteUrl';
import { clinicJsonLd } from '@/lib/seo';
import { checkRateLimit } from '@/lib/rateLimit';
const schema=z.object({confirmed:z.literal(true),name:z.string().trim().min(2).max(200),address:z.string().trim().min(3).max(500),category:z.string().trim().min(2).max(200),phone:z.string().max(50),hours:z.array(z.string().max(300)).max(14),services:z.array(z.string().trim().min(2).max(120)).max(20)});
export async function POST(req:NextRequest,{params:paramsPromise}:{params:Promise<{id:string}>}){
  const params = await paramsPromise;
 let user;try{user=await requireUser();}catch{return NextResponse.json({error:'Sign in required'},{status:401});}
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Confirm the clinic details and your authority to manage it before generating.'},{status:400});
 if(!checkRateLimit('generate:'+user.id,3,3600000).allowed)return NextResponse.json({error:'Generation limit reached. Try again later.'},{status:429});
 const clinic=await prisma.clinic.findUnique({where:{id:params.id},include:{users:true,siteContent:true}});if(!clinic)return NextResponse.json({error:'Clinic not found'},{status:404});
 if((user.clinicId&&user.clinicId!==clinic.id)||clinic.users.some(u=>u.id!==user.id&&u.role==='owner'))return NextResponse.json({error:'This clinic is linked to another account.'},{status:403});
 if(clinic.siteContent&&!await prisma.subscription.findFirst({where:{clinicId:clinic.id,status:'active'}}))return NextResponse.json({error:'Regeneration requires an active subscription.'},{status:403});
 if(!clinic.siteContent&&await prisma.generationUsage.findFirst({where:{userId:user.id,api:'groq'}}))return NextResponse.json({error:'Your free generation has been used. Activate a subscription to regenerate.'},{status:403});
 const facts=parsed.data;
 try{
  const generated=await generateSiteContent({name:facts.name,category:facts.category,address:facts.address,city:extractCity(facts.address),formattedOpeningHours:facts.hours.join('; ')||'Not listed',rating:null,userRatingCount:null,editorialSummary:null,servicesListOrNone:facts.services.join(';')||'none'});
  const subdomainSlug=await generateSubdomainSlug(facts.name);
  await prisma.$transaction(async tx=>{
   // Lock the clinic so two accounts cannot claim it concurrently.
   await tx.$queryRaw`SELECT id FROM clinics WHERE id = ${clinic.id} FOR UPDATE`;
   const current=await tx.user.findUnique({where:{id:user.id}});
   const otherOwner=await tx.user.findFirst({where:{clinicId:clinic.id,role:'owner',id:{not:user.id}}});
   if(otherOwner||(current?.clinicId&&current.clinicId!==clinic.id))throw new Error('This clinic is already linked to another account.');
   await tx.user.update({where:{id:user.id},data:{clinicId:clinic.id}});
   await tx.clinic.update({where:{id:clinic.id},data:{name:facts.name,address:facts.address,phone:facts.phone||null,category:facts.category,hours:{weekdayDescriptions:facts.hours},status:'demo'}});
   const data={headline:generated.content.headline,aboutCopy:generated.content.about_copy,services:facts.services,seoMeta:generated.content.seo_meta,jsonLd:clinicJsonLd(facts),promptVersion:generated.promptVersion,generatedAt:new Date()};
   await tx.siteContent.upsert({where:{clinicId:clinic.id},create:{clinicId:clinic.id,...data},update:data});
   await tx.siteSettings.upsert({where:{clinicId:clinic.id},create:{clinicId:clinic.id,subdomainSlug,status:'draft'},update:{status:'draft'}});
   await tx.generationUsage.create({data:{api:'groq',userId:user.id,clinicId:clinic.id,costEstimate:0}});
  });
  const settings=await prisma.siteSettings.findUnique({where:{clinicId:clinic.id}});
  return NextResponse.json({demoUrl:siteBaseUrl(settings!),previewUrl:'/preview/'+clinic.id,status:'draft'});
 }catch(e){console.error('[site-generation]',e instanceof Error?e.message:'Generation failed');return NextResponse.json({error:'Website generation could not finish. Check the Groq key, model, quota and database connection, then retry.'},{status:502});}
}
