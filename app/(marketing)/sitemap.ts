import { MetadataRoute } from 'next';
export default function sitemap():MetadataRoute.Sitemap{const base=process.env.NEXTAUTH_URL||'http://localhost:3000';return ['','/privacy','/terms'].map(p=>({url:base+p}));}
