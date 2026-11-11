const ALLOWED_ORIGINS=new Set(["https://kingnathz21.github.io","http://localhost:8000","http://127.0.0.1:8000"]);
let firebaseKeysPromise;
function corsHeaders(request){const origin=request.headers.get("Origin")||"";const h={"Access-Control-Allow-Methods":"GET, POST, PATCH, DELETE, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Max-Age":"86400","Vary":"Origin"};if(ALLOWED_ORIGINS.has(origin))h["Access-Control-Allow-Origin"]=origin;return h;}
function json(data,status,request,extra){return new Response(JSON.stringify(data),{status:status||200,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...corsHeaders(request),...(extra||{})}});}
function decodePart(s){s=s.replace(/-/g,"+").replace(/_/g,"/");return Uint8Array.from(atob(s.padEnd(Math.ceil(s.length/4)*4,"=")),c=>c.charCodeAt(0));}
async function verifyToken(request,env){
 const token=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");if(!token||!env.FIREBASE_PROJECT_ID)throw new Error("Authentication required");
 const parts=token.split(".");if(parts.length!==3)throw new Error("Invalid token");
 const decoder=new TextDecoder(),header=JSON.parse(decoder.decode(decodePart(parts[0]))),claims=JSON.parse(decoder.decode(decodePart(parts[1])));
 if(header.alg!=="RS256"||!header.kid)throw new Error("Invalid token");
 if(!firebaseKeysPromise)firebaseKeysPromise=fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com").then(r=>{if(!r.ok)throw new Error("Firebase key lookup failed");return r.json();}).then(x=>x.keys||[]);
 let jwk=(await firebaseKeysPromise).find(k=>k.kid===header.kid);if(!jwk){firebaseKeysPromise=null;firebaseKeysPromise=fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com").then(r=>{if(!r.ok)throw new Error("Firebase key lookup failed");return r.json();}).then(x=>x.keys||[]);jwk=(await firebaseKeysPromise).find(k=>k.kid===header.kid);}if(!jwk)throw new Error("Unknown signing key");
 const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
 const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decodePart(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
 const now=Math.floor(Date.now()/1000),project=env.FIREBASE_PROJECT_ID;
 if(!valid||claims.aud!==project||claims.iss!=="https://securetoken.google.com/"+project||!claims.sub||claims.sub.length>128||!claims.exp||claims.exp<=now||!claims.iat||claims.iat>now+300)throw new Error("Token invalid or expired");
 return {uid:claims.sub,email:typeof claims.email==="string"?claims.email.slice(0,254):""};
}
async function userFor(request,env){const user=await verifyToken(request,env);await env.DB.prepare("INSERT INTO user_profiles(auth_uid,email) VALUES(?,?) ON CONFLICT(auth_uid) DO UPDATE SET email=excluded.email,updated_at=CURRENT_TIMESTAMP").bind(user.uid,user.email).run();return user;}
async function bodyOf(request){const raw=await request.text();if(raw.length>12000)throw new Error("Request too large");try{return raw?JSON.parse(raw):{};}catch{throw new Error("Invalid JSON");}}
async function handle(request,env){
 const url=new URL(request.url),path=url.pathname.replace(/\/+$/,"")||"/",method=request.method;
 if(method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders(request)});
 if(!env.DB)return json({error:"Database binding DB is not configured"},503,request);
 try{
  if(method==="GET"&&(path==="/"||path==="/api/health")){const x=await env.DB.prepare("SELECT 1 AS ok").first();return json({service:"RouteFlow London API",status:x&&x.ok===1?"ok":"degraded",version:"0.2.0"},200,request);}
  if(path==="/api/me"||path.startsWith("/api/me/")){
   let user;try{user=await userFor(request,env);}catch(e){return json({error:e.message||"Unauthorised"},401,request);}
   if(path==="/api/me"&&method==="GET"){const profile=await env.DB.prepare("SELECT auth_uid AS uid,display_name AS displayName,email,role,created_at AS createdAt FROM user_profiles WHERE auth_uid=?").bind(user.uid).first();return json({profile},200,request);}
   if(path==="/api/me"&&method==="PATCH"){const b=await bodyOf(request),name=String(b.displayName||"").trim().slice(0,60);if(!name)return json({error:"Display name required"},400,request);await env.DB.prepare("UPDATE user_profiles SET display_name=?,email=?,updated_at=CURRENT_TIMESTAMP WHERE auth_uid=?").bind(name,user.email,user.uid).run();const profile=await env.DB.prepare("SELECT auth_uid AS uid,display_name AS displayName,email,role,created_at AS createdAt FROM user_profiles WHERE auth_uid=?").bind(user.uid).first();return json({profile},200,request);}
   if(path==="/api/me/settings"&&(method==="GET"||method==="PUT")){
    if(method==="PUT"){const b=await bodyOf(request),theme=["system","light","dark"].includes(b.theme)?b.theme:"system",mode=["all","bus","rail"].includes(b.defaultMode)?b.defaultMode:"all",notify=b.notificationsEnabled===true?1:0,home=String(b.homeLocation||"").trim().slice(0,100);await env.DB.prepare("INSERT INTO user_settings(auth_uid,theme,default_mode,notifications_enabled,home_location) VALUES(?,?,?,?,?) ON CONFLICT(auth_uid) DO UPDATE SET theme=excluded.theme,default_mode=excluded.default_mode,notifications_enabled=excluded.notifications_enabled,home_location=excluded.home_location,updated_at=CURRENT_TIMESTAMP").bind(user.uid,theme,mode,notify,home).run();}
    const settings=await env.DB.prepare("SELECT theme,default_mode AS defaultMode,notifications_enabled AS notificationsEnabled,home_location AS homeLocation FROM user_settings WHERE auth_uid=?").bind(user.uid).first();return json({settings:settings||{theme:"system",defaultMode:"all",notificationsEnabled:0,homeLocation:""}},200,request);
   }
   const match=path.match(/^\/api\/me\/(saved-routes|saved-stops|saved-journeys)$/);
   if(match){const kind=match[1],table=kind==="saved-routes"?"saved_routes":kind==="saved-stops"?"saved_stops":"saved_journeys";
    if(method==="GET"){const rows=await env.DB.prepare("SELECT * FROM "+table+" WHERE auth_uid=? ORDER BY created_at DESC LIMIT 100").bind(user.uid).all();return json({data:rows.results||[]},200,request);}
    if(method==="POST"){const b=await bodyOf(request);
     if(kind==="saved-routes"){const n=String(b.routeNumber||"").trim().slice(0,12);if(!n)return json({error:"Route number required"},400,request);await env.DB.prepare("INSERT OR IGNORE INTO saved_routes(auth_uid,route_number) VALUES(?,?)").bind(user.uid,n).run();}
     else if(kind==="saved-stops"){const id=String(b.stopId||"").trim().slice(0,40),name=String(b.stopName||"").trim().slice(0,120);if(!id)return json({error:"Stop ID required"},400,request);await env.DB.prepare("INSERT INTO saved_stops(auth_uid,stop_id,stop_name) VALUES(?,?,?) ON CONFLICT(auth_uid,stop_id) DO UPDATE SET stop_name=excluded.stop_name").bind(user.uid,id,name).run();}
     else{const origin=String(b.origin||"").trim().slice(0,120),destination=String(b.destination||"").trim().slice(0,120);if(!origin||!destination)return json({error:"Journey origin and destination required"},400,request);await env.DB.prepare("INSERT INTO saved_journeys(auth_uid,origin,destination,journey_json) VALUES(?,?,?,?)").bind(user.uid,origin,destination,JSON.stringify(b.journey||{}).slice(0,5000)).run();}
     return json({saved:true},201,request);
    }
    if(method==="DELETE"){const key=kind==="saved-routes"?"routeNumber":kind==="saved-stops"?"stopId":"id",value=(url.searchParams.get(key)||"").trim();if(!value)return json({error:key+" required"},400,request);const col=kind==="saved-routes"?"route_number":kind==="saved-stops"?"stop_id":"id";await env.DB.prepare("DELETE FROM "+table+" WHERE auth_uid=? AND "+col+"=?").bind(user.uid,value).run();return json({deleted:true},200,request);}
   }
   return json({error:"Not found"},404,request);
  }
  if(method==="GET"&&path==="/api/routes"){const status=url.searchParams.get("status"),search=(url.searchParams.get("search")||"").trim().slice(0,80),limit=Math.min(100,Math.max(1,Number(url.searchParams.get("limit"))||50)),offset=Math.max(0,Number(url.searchParams.get("offset"))||0),where=[],values=[];if(status==="current"||status==="withdrawn"){where.push("status=?");values.push(status);}if(search){where.push("(route_number LIKE ? OR start_point LIKE ? OR destination LIKE ? OR operator_name LIKE ?)");const term="%"+search+"%";values.push(term,term,term,term);}const clause=where.length?" WHERE "+where.join(" AND "):"";const count=await env.DB.prepare("SELECT COUNT(*) AS total FROM routes"+clause).bind(...values).first(),rows=await env.DB.prepare("SELECT * FROM routes"+clause+" ORDER BY route_number COLLATE NOCASE LIMIT ? OFFSET ?").bind(...values,limit,offset).all();return json({data:rows.results||[],pagination:{total:count?.total||0,limit,offset}},200,request);}
  const routeMatch=path.match(/^\/api\/routes\/([^/]+)$/);
  if(method==="GET"&&routeMatch){
    const number=decodeURIComponent(routeMatch[1]),status=url.searchParams.get("status");
    let q="SELECT * FROM routes WHERE route_number=?",values=[number];
    if(status==="current"||status==="withdrawn"){q+=" AND status=?";values.push(status);}
    const row=await env.DB.prepare(q+" ORDER BY CASE status WHEN 'current' THEN 0 ELSE 1 END LIMIT 1").bind(...values).first();
    if(!row)return json({error:"Route not found"},404,request);
    let raw={};try{raw=JSON.parse(row.raw_json||"{}");}catch{}
    return json({data:{...raw,id:row.id,routeNumber:row.route_number,status:row.status,startPoint:row.start_point,destination:row.destination,operator:row.operator_name,garage:row.garage_name,routeType:row.route_type,vehicleType:row.vehicle_type,powerType:row.power_type,pvr:row.pvr,via:row.via,serviceNotes:row.service_notes,updatedAt:row.updated_at}},200,request);
  }
  if(method==="GET"&&path==="/api/operators"){const r=await env.DB.prepare("SELECT id,name,website_url AS websiteUrl,logo_url AS logoUrl FROM operators ORDER BY name").all();return json({data:r.results||[]},200,request);}
  if(method==="GET"&&path==="/api/garages"){const r=await env.DB.prepare("SELECT id,name,operator_id AS operatorId,address,postcode FROM garages ORDER BY name").all();return json({data:r.results||[]},200,request);}
  if(method==="GET"&&path==="/api/fleet"){const r=await env.DB.prepare("SELECT id,fleet_number AS fleetNumber,registration,manufacturer,model,vehicle_type AS vehicleType,power_type AS powerType,operator_id AS operatorId,garage_id AS garageId,status,notes,updated_at AS updatedAt FROM vehicles ORDER BY fleet_number LIMIT 100").all();return json({data:r.results||[]},200,request);}
  return json({error:"Not found"},404,request);
 }catch(e){console.error("RouteFlow API error",e);return json({error:e.message==="Invalid JSON"||e.message==="Request too large"?e.message:"Internal server error"},e.message==="Invalid JSON"||e.message==="Request too large"?400:500,request);}
}
export default {fetch(request,env){return handle(request,env);}};
