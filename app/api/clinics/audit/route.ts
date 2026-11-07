import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySearchTicket } from '@/lib/searchTicket';
import { getPlaceDetails } from '@/lib/places';
import { ingestClinicFromPlace } from '@/lib/clinicIngest';
import { getServerAuthSession } from '@/lib/auth';
import { checkRateLimit,getClientIp } from '@/lib/rateLimit';
const schema=z.object({placeId:z.string().min(3).max(200),ticket:z.string().max(2000)});
export async function POST(req:NextRequest){
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Invalid clinic selection'},{status:400});
 if(!verifySearchTicket(parsed.data.ticket,parsed.data.placeId))return NextResponse.json({error:'Your search expired. Search again to select this clinic.'},{status:403});
 if(!checkRateLimit('audit:'+getClientIp(req.headers),5,3600000).allowed)return NextResponse.json({error:'Too many audits. Try again later.'},{status:429});
 try{const place=await getPlaceDetails(parsed.data.placeId);const session=await getServerAuthSession();const result=await ingestClinicFromPlace(place,session?.user?.id||null);return NextResponse.json({clinic:{id:result.clinic.id}});}catch{ return NextResponse.json({error:'The clinic audit could not finish. Check Google API and database configuration.'},{status:502});}
}
