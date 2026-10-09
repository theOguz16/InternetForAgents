// Internet for Agents local MVP — Node.js standard library only.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8765);
const HOST = '127.0.0.1';
const plannerPath = path.join(ROOT, 'training', 'planner-model.json');
const planner = fs.existsSync(plannerPath) ? JSON.parse(fs.readFileSync(plannerPath, 'utf8')) : null;
const placesCache = new Map();
const eventsCache = new Map();
const eventVenueCache = new Map();
const overpassEndpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];
const WEIGHTS = { trust: 0.45, price: 0.25, speed: 0.30 };
const CAP_NAMES = { transport: 'Ulaşım', hotel: 'Konaklama', weather: 'Hava durumu', events: 'Etkinlikler', maps: 'Harita ve rota', food: 'Yeme içme' };
const SERVICES = [
 ['rail','RailConnect','transport','REST API',94,72,82,'Şehirler arası tren rotaları ve sefer seçenekleri.','search_routes(origin, destination, date)'],
 ['trip','TripMesh','transport','A2A',89,86,90,'Çok modlu ulaşım sağlayıcılarını bir araya getirir.','find_transport(from, to, preferences)'],
 ['stay','StayFinder','hotel','MCP',92,79,84,'Konaklama seçenekleri, fiyat ve uygunluk.','search_stays(destination, dates, guests)'],
 ['rooms','OpenRooms','hotel','REST API',86,91,77,'Bağımsız tesislerden konaklama envanteri.','list_availability(city, check_in, check_out)'],
 ['sky','SkySignal','weather','MCP',97,98,95,'Konuma ve tarihe göre hava tahmini.','forecast(location, date_range)'],
 ['climate','ClimateNow','weather','REST API',84,100,87,'Güncel ve kısa dönem hava verisi.','get_weather(lat, lon, date)'],
 ['agenda','CityAgenda','events','A2A',88,90,81,'Şehir etkinlikleri, sergiler ve konserler.','discover_events(city, dates, interests)'],
 ['culture','OpenCulture','events','REST API',91,96,71,'Müze ve kültür kurumlarının açık etkinlikleri.','events_near(city, start_date, end_date)'],
 ['map','Wayfinder','maps','MCP',90,87,89,'Yerler, mesafeler ve gezi rotaları.','plan_route(origin, stops)'],
 ['legacy','LocalWeb Adapter','events','Legacy Web',68,100,53,'Web sayfasından geçici kontrat çıkarımı.','extract_events(page_url, date_range)'],
 ['citystay','CityStay','hotel','A2A',95,65,86,'Şehir otelleri için arama ve müsaitlik.','find_hotel(city, dates, budget)'],
 ['bus','OpenTransit','transport','MCP',81,100,76,'Otobüs ve toplu taşıma seçenekleri.','get_transit(origin, destination, date)']
];
function listServices() { return SERVICES.map(([id,name,capability,protocol,trust,price,speed,description,contract]) => ({ id,name,capability,protocol,trust,price,speed,description,contract,score:Math.round(trust*WEIGHTS.trust+price*WEIGHTS.price+speed*WEIGHTS.speed) })); }
function plannerFeatures(text) {
  const words = (text.toLocaleLowerCase('tr').match(/[\p{L}\p{N}]+/gu) || []).filter(word => word.length > 1);
  const out = new Set(words.map(word => `w:${word}`));
  for (const word of words) for (let i = 0; i <= word.length - 3; i++) out.add(`c:${word.slice(i, i + 3)}`);
  return [...out];
}
function resolve(goal) {
  if (!planner || planner.algorithm !== 'tfidf-knn-multilabel') return ['transport','hotel','weather','events'];
  const input = new Map(plannerFeatures(goal).filter(feature => planner.idf[feature]).map(feature => [feature, planner.idf[feature]]));
  const norm = Math.sqrt([...input.values()].reduce((sum, value) => sum + value * value, 0)) || 1;
  const neighbors = planner.documents.map(doc => {
    let dot = 0;
    for (const [feature, value] of doc.vector) dot += value * (input.get(feature) || 0);
    return { labels: doc.labels, similarity: dot / (norm * doc.norm) };
  }).filter(doc => doc.similarity > 0).sort((a, b) => b.similarity - a.similarity).slice(0, planner.k);
  const total = neighbors.reduce((sum, row) => sum + row.similarity, 0) || 1;
  const scores = Object.fromEntries(planner.labels.map(label => [label, neighbors.reduce((sum, row) => sum + (row.labels.includes(label) ? row.similarity : 0), 0) / total]));
  let selected = planner.labels.filter(label => scores[label] >= planner.threshold);
  if (!selected.length && planner.labels.length) selected = [planner.labels.reduce((best, label) => scores[label] > scores[best] ? label : best, planner.labels[0])];
  return Object.keys(CAP_NAMES).filter(capability => selected.includes(capability));
}
function plan(goal) {
  const capabilities = resolve(goal);
  const all = listServices();
  const steps = capabilities.map(capability => {
    const service = all.filter(item => item.capability === capability).sort((a,b) => b.score-a.score)[0];
    return service ? { capability, capability_name:CAP_NAMES[capability], service, binding:'dynamic', adapter_status:'simulated' } : null;
  }).filter(Boolean);
  return { goal, capabilities, steps, weights:WEIGHTS, execution:'simulation', planner:{ algorithm:planner?.algorithm || 'fallback', training_examples:planner?.trainingExamples || 0, holdout_micro_f1:planner?.holdout?.microF1 ?? null } };
}
function send(res,status,value) { const body=JSON.stringify(value); res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store'}); res.end(body); }
async function upstreamJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'InternetForAgentsDemo/1.0' } });
  if (!response.ok) throw new Error(`upstream_${response.status}`);
  return response.json();
}
async function upstreamText(url) {
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'InternetForAgentsDemo/1.0'}});
  if(!response.ok) throw new Error(`upstream_${response.status}`);
  return response.text();
}
async function eventVenuePoint(venue,city) {
  const key=`${venue}|${city}`.toLocaleLowerCase('tr');
  if(eventVenueCache.has(key)) return eventVenueCache.get(key);
  const cleaned=venue.replace(/\s+(şubesi|şube|subesi|sube)$/i,'').trim(),terms=[...new Set([venue,cleaned])];let point=null;
  for(let i=0;i<terms.length;i++) {
    if(i) await new Promise(resolve=>setTimeout(resolve,1100));
    const params=new URLSearchParams({q:`${terms[i]}, ${city}, Türkiye`,format:'jsonv2',limit:'1',countrycodes:'tr'});
    const rows=await upstreamJson(`https://nominatim.openstreetmap.org/search?${params}`),row=rows[0];
    if(row){point={lat:Number(row.lat),lon:Number(row.lon)};break;}
  }
  eventVenueCache.set(key,point);
  return point;
}
function eventDateKey(value) {
  const text=String(value||'').trim(),iso=text.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})/);
  if(iso)return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const local=text.match(/^([0-9]{2})\.([0-9]{2})\.([0-9]{4})/);
  return local?`${local[3]}-${local[2]}-${local[1]}`:'';
}
function onSelectedDay(start,end,date) {
  const first=eventDateKey(start),last=eventDateKey(end||start);
  return !!first && !!last && first<=date && last>=date;
}
function parseSchemaEvents(html) {
  const parsed=[];
  for(const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const value=JSON.parse(match[1]),rows=Array.isArray(value)?value:[value];
      for(const row of rows) for(const item of (Array.isArray(row['@graph'])?row['@graph']:[row])) {
        const types=Array.isArray(item['@type'])?item['@type']:[item['@type']];
        if(types.includes('Event')) parsed.push(item);
      }
    } catch {}
  }
  return parsed;
}
async function queryOverpass(query) {
  let lastError;
  for (const endpoint of overpassEndpoints) {
    try {
      const response=await fetch(endpoint,{method:'POST',headers:{'User-Agent':'InternetForAgentsDemo/1.0','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(6500)});
      if (!response.ok) throw new Error(`overpass_${response.status}`);
      const data=await response.json();
      if ((data.elements || []).length) return {elements:data.elements,source:'OpenStreetMap Overpass'};
      lastError=new Error('overpass_empty');
    } catch(error) { lastError=error; }
  }
  throw lastError || new Error('overpass_unavailable');
}
async function nominatimSearch(term, place) {
  const country=place.country_code==='TR'?'Türkiye':(place.country || 'Türkiye');
  const params=new URLSearchParams({q:`${term} in ${place.name}, ${country}`,format:'jsonv2',limit:'8',countrycodes:(place.country_code || 'tr').toLowerCase(),addressdetails:'1'});
  const rows=await upstreamJson(`https://nominatim.openstreetmap.org/search?${params}`);
  return rows.filter(row=>row.osm_type && row.osm_id && row.name).map(row=>({
    type:row.osm_type,id:row.osm_id,lat:Number(row.lat),lon:Number(row.lon),tags:{name:row.name || row.display_name.split(',')[0],tourism:row.category==='tourism'?row.type:undefined,historic:row.category==='historic'?row.type:undefined,amenity:row.category==='amenity'?row.type:undefined,leisure:row.category==='leisure'?row.type:undefined}
  }));
}
async function geocode(city) {
  const query = new URLSearchParams({ name: city, count: '5', language: 'tr', format: 'json' });
  const data = await upstreamJson(`https://geocoding-api.open-meteo.com/v1/search?${query}`);
  const place = (data.results || []).find(item => item.country_code === 'TR') || (data.results || [])[0];
  if (!place) throw new Error('city_not_found');
  return place;
}
function decodePolyline(encoded){let index=0,lat=0,lon=0;const points=[];while(index<encoded.length){let result=0,shift=0,byte;do{byte=encoded.charCodeAt(index++)-63;result|=(byte&31)<<shift;shift+=5}while(byte>=32&&index<encoded.length);lat+=result&1?~(result>>1):result>>1;result=0;shift=0;do{byte=encoded.charCodeAt(index++)-63;result|=(byte&31)<<shift;shift+=5}while(byte>=32&&index<encoded.length);lon+=result&1?~(result>>1):result>>1;points.push([lat/1e6,lon/1e6])}return points}
const server=http.createServer(async (req,res) => {
  const url=new URL(req.url,'http://localhost');
  if (req.method==='GET' && url.pathname==='/api/health') return send(res,200,{status:'ok',mode:'local-simulation',planner:planner?.algorithm || 'fallback',training_examples:planner?.trainingExamples || 0});
  if (req.method==='GET' && url.pathname==='/api/catalog') return send(res,200,{services:listServices(),capabilities:CAP_NAMES});
  if (req.method==='GET' && /^\/vendor\/leaflet\/leaflet\.(js|css)$/.test(url.pathname)) {
    const extension=url.pathname.endsWith('.css')?'css':'javascript';
    res.writeHead(200,{'Content-Type':extension==='css'?'text/css; charset=utf-8':'application/javascript; charset=utf-8','Cache-Control':'public, max-age=86400'});
    return fs.createReadStream(path.join(ROOT,url.pathname.slice(1))).pipe(res);
  }
  if (req.method==='GET' && (url.pathname==='/' || url.pathname==='/index.html')) { res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}); return fs.createReadStream(path.join(ROOT,'index.html')).pipe(res); }
  if (req.method==='GET' && url.pathname==='/api/weather') {
    try {
      const city=url.searchParams.get('city')?.trim(), date=url.searchParams.get('date') || '';
      if (!city || city.length>100 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return send(res,400,{error:'city_and_date_required'});
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date()),lastDay=new Date(`${today}T12:00:00+03:00`);
      lastDay.setDate(lastDay.getDate()+15);
      const latest=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(lastDay);
      if(date<today || date>latest) return send(res,200,{available:false,city,date,reason:'outside_forecast_window',available_from:today,available_to:latest});
      const place=await geocode(city), params=new URLSearchParams({latitude:place.latitude,longitude:place.longitude,daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code',timezone:place.timezone || 'auto',start_date:date,end_date:date});
      const wx=await upstreamJson(`https://api.open-meteo.com/v1/forecast?${params}`),daily=wx.daily,index=(daily?.time || []).indexOf(date);
      if(index<0) return send(res,200,{available:false,city:place.name,date,reason:'forecast_not_published',available_from:daily?.time?.[0] || null,available_to:daily?.time?.at(-1) || null});
      return send(res,200,{available:true,city:place.name,date,timezone:wx.timezone,min:daily.temperature_2m_min[index],max:daily.temperature_2m_max[index],precipitation_probability:daily.precipitation_probability_max[index],precipitation_mm:daily.precipitation_sum[index],weather_code:daily.weather_code[index],source:'Open-Meteo'});
    } catch(error) { return send(res,502,{error:'weather_unavailable',message:error.message}); }
  }
  if (req.method==='GET' && url.pathname==='/api/places') {
    try {
      const city=url.searchParams.get('city')?.trim();
      if (!city || city.length>100) return send(res,400,{error:'city_required'});
      const key=city.toLocaleLowerCase('tr'),cached=placesCache.get(key);
      if(cached && Date.now()-cached.at<15*60*1000) return send(res,200,{...cached.value,cached:true});
      const place=await geocode(city), query=`[out:json][timeout:20];(nwr(around:5000,${place.latitude},${place.longitude})["tourism"~"hotel|hostel|guest_house"]["name"];nwr(around:5000,${place.latitude},${place.longitude})["tourism"~"attraction|viewpoint|artwork|museum|gallery|zoo|aquarium|theme_park|information"]["name"];nwr(around:5000,${place.latitude},${place.longitude})["historic"]["name"];nwr(around:5000,${place.latitude},${place.longitude})["leisure"~"park|garden|nature_reserve"]["name"];nwr(around:5000,${place.latitude},${place.longitude})["amenity"~"theatre|arts_centre"]["name"];nwr(around:5000,${place.latitude},${place.longitude})["natural"~"peak|waterfall|beach"]["name"];);out center 120;`;
      let result;
      try { result=await queryOverpass(query); }
      catch(overpassError) {
        console.warn(`Overpass failed for ${place.name}: ${overpassError.message}; using Nominatim best-match fallback`);
        const elements=[];
        // Nominatim allows about one request per second. Use high-yield POI terms and
        // keep the delay to respect its public service policy when Overpass is down.
        const searchTerms=['hotel','hostel','tourist attraction','viewpoint','museum','monument','historic site','park','garden','gallery','theatre'];
        for (let i=0;i<searchTerms.length;i++) {
          if (i) await new Promise(resolve=>setTimeout(resolve,1100));
          const term=searchTerms[i];
          try { elements.push(...await nominatimSearch(term,place)); }
          catch(error) { console.warn(`Nominatim ${term} search failed for ${place.name}: ${error.message}`); }
        }
        if (!elements.length) throw new Error('all_openstreetmap_sources_unavailable');
        result={elements:[...new Map(elements.map(item=>[`${item.type}/${item.id}`,item])).values()],source:'OpenStreetMap Nominatim (en iyi eşleşmeler; eksiksiz liste değildir)'};
      }
      const value={city:place.name,latitude:place.latitude,longitude:place.longitude,elements:result.elements,source:result.source};
      placesCache.set(key,{at:Date.now(),value});
      return send(res,200,value);
    } catch(error) { return send(res,502,{error:'places_unavailable',message:'OpenStreetMap şu anda yanıt vermiyor. Biraz sonra tekrar deneyin.'}); }
  }
  if (req.method==='GET' && url.pathname==='/api/route') {
    try {
      const origin=url.searchParams.get('origin')?.trim(),destination=url.searchParams.get('destination')?.trim();
      if (!origin || !destination || origin.length>100 || destination.length>100) return send(res,400,{error:'origin_and_destination_required'});
      const [start,end]=await Promise.all([geocode(origin),geocode(destination)]),locations=[{lat:start.latitude,lon:start.longitude},{lat:end.latitude,lon:end.longitude}];
      async function valhallaRoute(useTolls,id,label){const response=await fetch('https://valhalla1.openstreetmap.de/route',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'InternetForAgentsDemo/1.0'},body:JSON.stringify({locations,costing:'auto',costing_options:{auto:{use_tolls:useTolls,use_highways:useTolls<0.5?0.1:0.5,toll_booth_penalty:useTolls<0.5?7200:0}},units:'kilometers',language:'tr-TR'}),signal:AbortSignal.timeout(18000)});if(!response.ok)throw new Error('valhalla_'+response.status);const data=await response.json(),trip=data.trip,leg=trip?.legs?.[0],summary=trip?.summary||leg?.summary;if(!summary||!leg?.shape)throw new Error('valhalla_route_empty');return{id,label,origin:start.name,destination:end.name,origin_point:{lat:start.latitude,lon:start.longitude},destination_point:{lat:end.latitude,lon:end.longitude},distance_km:Math.round(summary.length),duration_minutes:Math.round(summary.time/60),geometry:{type:'LineString',coordinates:decodePolyline(leg.shape).map(([lat,lon])=>[lon,lat])},has_toll:typeof summary.has_toll==='boolean'?summary.has_toll:null,source:'Valhalla · OpenStreetMap'}}
      const alternatives=await Promise.allSettled([valhallaRoute(0,'avoid-tolls','Ücretli yollardan kaçın'),valhallaRoute(1,'favor-tolls','Ücretli yola öncelik ver')]),routes=alternatives.filter(x=>x.status==='fulfilled').map(x=>x.value);
      if(routes.length)return send(res,200,{origin:start.name,destination:end.name,origin_point:routes[0].origin_point,destination_point:routes[0].destination_point,routes,selected_route:0,source:'Valhalla · OpenStreetMap',alternatives_note:routes.length<2?'Rota servisi şu anda tek alternatif döndürdü.':''});
      const routeUrl='https://router.project-osrm.org/route/v1/driving/'+start.longitude+','+start.latitude+';'+end.longitude+','+end.latitude+'?overview=full&geometries=geojson',data=await upstreamJson(routeUrl),route=data.routes?.[0];if(!route)return send(res,404,{error:'route_not_found'});
      const fallback={id:'standard',label:'Standart rota · ücret bilgisi yok',origin:start.name,destination:end.name,origin_point:{lat:start.latitude,lon:start.longitude},destination_point:{lat:end.latitude,lon:end.longitude},distance_km:Math.round(route.distance/1000),duration_minutes:Math.round(route.duration/60),geometry:route.geometry,has_toll:null,source:'OSRM'};
      return send(res,200,{origin:start.name,destination:end.name,origin_point:fallback.origin_point,destination_point:fallback.destination_point,routes:[fallback],selected_route:0,source:'OSRM',alternatives_note:'Ücretli/ücretsiz alternatif servisine erişilemedi; gösterilen rota standarttır.'});
    } catch(error) { return send(res,502,{error:'route_unavailable',message:error.message}); }
  }
  if (req.method==='GET' && url.pathname==='/api/events') {
    try {
      const city=url.searchParams.get('city')?.trim(),date=url.searchParams.get('date') || '';
      if (!city || city.length>100 || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) return send(res,400,{error:'city_and_date_required'});
      const cityKey=city.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const isIzmir=cityKey.includes('izmir'),isIstanbul=cityKey.includes('istanbul');
      if (!isIzmir && !isIstanbul) return send(res,200,{available:false,city,date,events:[],source:'Şehir etkinlik sağlayıcısı',message:'Bu şehir için henüz ücretsiz etkinlik sağlayıcısı bağlı değil.'});
      const cacheKey=`${cityKey}:${date}`,cached=eventsCache.get(cacheKey);
      if(cached && Date.now()-cached.at<15*60*1000) return send(res,200,{...cached.value,cached:true});
      let events=[],source,sourceUrl;
      if(isIzmir) {
        const raw=await upstreamJson('https://openapi.izmir.bel.tr/api/ibb/kultursanat/etkinlikler');
        const active=(Array.isArray(raw)?raw:[]).filter(item=>onSelectedDay(item.EtkinlikBaslamaTarihi,item.EtkinlikBitisTarihi,date)).slice(0,12);
        for(let i=0;i<active.length;i++) {
          const item=active[i];if(i) await new Promise(resolve=>setTimeout(resolve,1100));
          let point=null;try{if(item.EtkinlikMerkezi)point=await eventVenuePoint(item.EtkinlikMerkezi,'İzmir')}catch(error){console.warn(`Event venue geocoding failed: ${error.message}`)}
          events.push({id:item.Id,name:item.Adi,type:item.Tur,start:item.EtkinlikBaslamaTarihi,end:item.EtkinlikBitisTarihi,venue:item.EtkinlikMerkezi||'Mekan belirtilmemiş',description:item.KisaAciklama||'',free:item.UcretsizMi===true||item.UcretsizMi==='true',ticket_url:item.BiletSatisLinki||null,point});
        }
        source='İzmir Büyükşehir Belediyesi · Kültür Sanat API';sourceUrl='https://openapi.izmir.bel.tr/api/ibb/kultursanat/etkinlikler';
      } else {
        const listing=await upstreamJson('https://kultur.istanbul/wp-json/wp/v2/event_listing?per_page=30&orderby=date&order=desc&_fields=id,link,title');
        const pages=Array.isArray(listing)?listing:[],details=[];let cursor=0;
        async function worker(){while(cursor<pages.length){const page=pages[cursor++];try{const pageUrl=new URL(page.link);if(pageUrl.hostname!=='kultur.istanbul')continue;const html=await upstreamText(pageUrl.href),schema=parseSchemaEvents(html);for(const event of schema)if(onSelectedDay(event.startDate,event.endDate,date)){const loc=event.location||event.Location||{},addr=typeof loc.address==='string'?loc.address:[loc.address?.streetAddress,loc.address?.addressLocality].filter(Boolean).join(', '),venue=loc.name||addr||'Mekan bilgisi yok';details.push({id:page.id,name:String(event.name||page.title?.rendered||'Etkinlik').replace(/<[^>]*>/g,' '),type:'Etkinlik',start:event.startDate,end:event.endDate||'',venue,description:String(event.description||'').replace(/<[^>]*>/g,' ').slice(0,320),free:/\b(ücretsiz|bedava)\b/i.test(String(event.description||'')),ticket_url:event.url||page.link,venueKey:venue})}}catch(error){console.warn(`Istanbul event detail failed: ${error.message}`)}}}
        await Promise.all(Array.from({length:Math.min(4,pages.length)},()=>worker()));
        for(let i=0;i<details.length;i++){if(i)await new Promise(resolve=>setTimeout(resolve,1100));const event=details[i];try{event.point=await eventVenuePoint(event.venue,'İstanbul')}catch(error){event.point=null}delete event.venueKey}
        events=details;source='KÜLTÜR.İSTANBUL · Etkinlik sayfaları';sourceUrl='https://kultur.istanbul/etkinlik/';
      }
      const value={available:true,city:isIzmir?'İzmir':'İstanbul',date,events,source,source_url:sourceUrl};
      eventsCache.set(cacheKey,{at:Date.now(),value});
      return send(res,200,value);
    } catch(error) { console.warn(`Events unavailable: ${error.message}`);return send(res,502,{error:'events_unavailable',message:'Şehir etkinlik servisi şu anda yanıt vermiyor.'}); }
  }
  if (req.method==='POST' && url.pathname==='/api/plan') {
    let raw=''; req.setEncoding('utf8'); req.on('data',chunk=>{raw+=chunk;if(raw.length>12000){send(res,413,{error:'body_size_invalid'});req.destroy();}});
    req.on('end',()=>{try { const payload=JSON.parse(raw); const goal=payload.goal; if(typeof goal!=='string'||!goal.trim()||goal.length>1000)return send(res,400,{error:'goal_required',message:'goal 1-1000 karakter olmalı'}); const started=process.hrtime.bigint(); const result=plan(goal.trim()); result.elapsed_ms=Number(process.hrtime.bigint()-started)/1e6; return send(res,200,result); } catch { return send(res,400,{error:'invalid_json'}); }});
    return;
  }
  return send(res,404,{error:'not_found'});
});
server.listen(PORT,HOST,()=>console.log(`Internet for Agents MVP hazır: http://${HOST}:${PORT}`));
