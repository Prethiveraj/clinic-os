"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TurnstileWidget from '@/components/TurnstileWidget';
type Candidate={placeId:string;name:string;address:string;category:string|null;rating:number|null;reviewCount:number|null;ticket:string;googleMapsUri?:string};
export default function SearchForm({variant='hero'}:{variant?:'hero'|'compact'}) {
 const router=useRouter();const [query,setQuery]=useState('');const [token,setToken]=useState<string|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [results,setResults]=useState<Candidate[]|null>(null);const [widget,setWidget]=useState(0);
 async function submit(e:React.FormEvent){e.preventDefault();if(!token){setError('Please complete the security check.');return;}setBusy(true);setError('');setResults(null);try{const r=await fetch('/api/clinics/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,turnstileToken:token})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Search failed.');setResults(d.candidates);if(!d.candidates.length)setError('No clinic found. Try the name and city.');}catch(e:any){setError(e.message);}finally{setBusy(false);setToken(null);setWidget(x=>x+1);}}
 function choose(c:Candidate){sessionStorage.setItem('pendingAudit',JSON.stringify({query:c.name,placeId:c.placeId,ticket:c.ticket}));router.push('/audit/running');}
 return <div className={'clinic-search '+(variant==='compact'?'compact-search':'')}>
  <form onSubmit={submit}><label htmlFor={'clinic-query-'+variant}>Find your clinic on Google Maps</label><div className="search-input-row"><input id={'clinic-query-'+variant} required minLength={2} maxLength={200} placeholder="Clinic name + city" value={query} onChange={e=>{setQuery(e.target.value);setResults(null);}}/><button disabled={busy} type="submit">{busy?'Searching…':'Find my clinic'} <span aria-hidden>↗</span></button></div><div className="search-verification"><TurnstileWidget key={widget} onVerify={setToken}/></div></form>
  {error&&<p role="alert" className="search-error">{error}</p>}
  {results&&results.length>0&&<div className="search-results"><p>Choose the correct clinic and location</p>{results.map(c=><div className="search-candidate" key={c.placeId}><button onClick={()=>choose(c)}><strong>{c.name}</strong><span>{c.address}</span><small>{c.category}{c.rating!=null?` · ${c.rating} ★ (${c.reviewCount||0})`:''}</small><b>Audit this clinic ↗</b></button>{c.googleMapsUri&&<a href={c.googleMapsUri} target="_blank" rel="noreferrer">View on Google Maps ↗</a>}</div>)}<p className="maps-attribution"><img src="/attribution/google-maps.svg" width="100" height="18" alt="Google Maps"/> Live listing data</p></div>}
  <p className="search-caption">Select your location. Review the facts. Generate your website.</p>
 </div>;
}
