import { notFound,redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ClinicWebsite from '@/components/site/ClinicWebsite';
import { BlogArticle,BlogIndex } from '@/components/site/BlogViews';
export const dynamic='force-dynamic';
export const metadata={title:'Website draft — owner preview',robots:{index:false,follow:false}};
export default async function SectionPreview({params}:{params:Promise<{id:string;section:string[]}>}){const {id,section}=await params;let user;try{user=await requireUser();}catch{redirect('/login?next=/preview/'+id);}if(user.clinicId!==id&&user.role!=='admin')notFound();const clinic=await prisma.clinic.findUnique({where:{id},include:{siteContent:true,blogPosts:{where:{status:'published'},orderBy:{publishedAt:'desc'}}}});if(!clinic?.siteContent)notFound();const base='/preview/'+id;if(section[0]==='blog'){if(section.length===1)return <BlogIndex clinicName={clinic.name} posts={clinic.blogPosts} base={base}/>;if(section.length===2){const post=clinic.blogPosts.find(p=>p.slug===section[1]);if(!post)notFound();return <BlogArticle clinicName={clinic.name} post={post} canonicalUrl={null} base={base}/>;}}if(section.length!==1||!['about','services','contact'].includes(section[0]))notFound();return <><div className="bg-amber-100 text-amber-900 text-center text-xs p-3">Private website draft · <a className="underline" href={'/clinic/'+id}>Return to report ↗</a></div><ClinicWebsite clinic={clinic} page={section[0] as 'about'|'services'|'contact'} base={base}/></>}
