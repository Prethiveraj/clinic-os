import { notFound,redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ClinicWebsite from '@/components/site/ClinicWebsite';
export const dynamic='force-dynamic';
export const metadata={title:'Website draft — owner preview',robots:{index:false,follow:false}};
export default async function Preview({params:paramsPromise}:{params:Promise<{id:string}>}){
  const params = await paramsPromise;let user;try{user=await requireUser();}catch{redirect('/login?next=/preview/'+params.id);}if(user.clinicId!==params.id&&user.role!=='admin')notFound();const clinic=await prisma.clinic.findUnique({where:{id:params.id},include:{siteContent:true,siteSettings:true,blogPosts:{where:{status:'published'},take:3,orderBy:{publishedAt:'desc'}}}});if(!clinic?.siteContent)notFound();return <><div className="bg-amber-100 text-amber-900 text-center text-xs p-3">Private website draft · Review all facts and copy before publishing. <a className="underline" href={'/clinic/'+clinic.id}>Return to growth report ↗</a></div><ClinicWebsite clinic={clinic} posts={clinic.blogPosts} base={'/preview/'+clinic.id}/></>}
