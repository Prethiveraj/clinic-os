import { resolveClinicByHost } from '@/lib/resolveSiteByHost';
import { siteBaseUrl } from '@/lib/siteUrl';
export async function GET(){const site=await resolveClinicByHost();const live=site?.status==='live';return new Response(`User-agent: *\n${live?'Allow: /':'Disallow: /'}\n${live?'Sitemap: '+siteBaseUrl(site)+'/sitemap.xml':''}\n`,{headers:{'Content-Type':'text/plain'}});}
