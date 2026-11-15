(() => {
  const form=document.getElementById("mapRouteForm"),input=document.getElementById("mapRouteInput");
  const refresh=document.getElementById("mapRefreshButton"),statusTitle=document.getElementById("mapStatusTitle");
  const statusDetail=document.getElementById("mapStatusDetail"),vehicleCount=document.getElementById("mapVehicleCount");
  const predictionCount=document.getElementById("mapPredictionCount"),updated=document.getElementById("mapUpdated");
  const routeHeading=document.getElementById("mapRouteHeading"),list=document.getElementById("mapVehicleList");
  const api="https://api.tfl.gov.uk",key=window.APP_CONFIG&&window.APP_CONFIG.tflApiKey?String(window.APP_CONFIG.tflApiKey).trim():"";
  let map=null,markers=null,activeRoute="",timer=null,loading=false,hasFitCurrentRoute=false,markerByVehicle=new Map();
  const esc=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const due=seconds=>seconds<=30?"Due":Math.max(1,Math.round(seconds/60))+" min";
  const hasCoordinates=item=>item.lat!==null&&item.lat!==undefined&&item.lat!==""&&item.lon!==null&&item.lon!==undefined&&item.lon!==""&&Number.isFinite(Number(item.lat))&&Number.isFinite(Number(item.lon));
  const apiUrl=path=>api+path+(key?(path.includes("?")?"&":"?")+"app_key="+encodeURIComponent(key):"");
  async function fetchPredictions(route){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(apiUrl("/Line/"+encodeURIComponent(route)+"/Arrivals"),{headers:{Accept:"application/json"},signal:controller.signal,cache:"no-store"});
      if(!response.ok)throw new Error(response.status===404?"TfL does not recognise that route. Check the route number and try again.":"TfL returned "+response.status+". Please try again shortly.");
      return await response.json();
    }catch(error){if(error.name==="AbortError")throw new Error("TfL took too long to respond. Please try again.");throw error;}
    finally{clearTimeout(timeout);}
  }
  function makePopup(item,route){
    return '<div class="rf-popup"><strong>Route '+esc(route)+' · '+esc(item.destinationName||"Destination unavailable")+'</strong><small>'+esc(item.stationName||item.naptanId||"Stop not supplied")+'</small><small>'+(item.vehicleId?"Vehicle "+esc(item.vehicleId):"Vehicle ID not supplied")+' · '+due(Number(item.timeToStation)||0)+'</small></div>';
  }
  function focusVehicle(id){
    const marker=markerByVehicle.get(id);if(!marker)return;
    map.setView(marker.getLatLng(),Math.max(map.getZoom(),15),{animate:true});marker.openPopup();
  }
  function renderVehicleList(items,route){
    if(!items.length){list.innerHTML='<div class="rf-map-empty"><strong>No mappable vehicle positions yet</strong><p>TfL returned predictions, but none included usable latitude and longitude values. Try refreshing in a moment or open live stop arrivals.</p><a href="arrivals.html">Search live arrivals ↗</a></div>';return;}
    list.innerHTML=items.slice(0,50).map(item=>{
      const id=String(item.vehicleId||item.id||item.naptanId||"position-"+item.lat+"-"+item.lon);
      return '<button class="rf-map-vehicle" type="button" data-vehicle="'+esc(id)+'"><span class="rf-map-vehicle-badge">'+esc(route)+'</span><span class="rf-map-vehicle-copy"><strong>'+esc(item.destinationName||"Destination unavailable")+'</strong><small>'+(item.vehicleId?"Vehicle "+esc(item.vehicleId):"Vehicle ID unavailable")+' · '+esc(item.stationName||"Stop not supplied")+'</small></span><span class="rf-map-vehicle-time">'+due(Number(item.timeToStation)||0)+'</span></button>';
    }).join("");
    list.querySelectorAll("[data-vehicle]").forEach(button=>button.addEventListener("click",()=>focusVehicle(button.dataset.vehicle)));
  }
  function plot(items,route){
    markers.clearLayers();markerByVehicle.clear();
    const byVehicle=new Map();
    items.forEach(item=>{
      const lat=Number(item.lat),lon=Number(item.lon);
      if(!hasCoordinates(item)||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;
      const id=String(item.vehicleId||item.id||item.naptanId||"position-"+lat+"-"+lon);
      const previous=byVehicle.get(id);
      if(!previous||(Number(item.timeToStation)||0)<(Number(previous.timeToStation)||0))byVehicle.set(id,item);
    });
    const located=[...byVehicle.entries()];
    located.forEach(([id,item])=>{
      const icon=L.divIcon({className:"",html:'<span class="rf-bus-marker">'+esc(route)+'</span>',iconSize:[35,35],iconAnchor:[17,17]});
      const marker=L.marker([Number(item.lat),Number(item.lon)],{icon,title:"Route "+route+" bus"});
      marker.bindPopup(makePopup(item,route));markers.addLayer(marker);markerByVehicle.set(id,marker);
    });
    if(located.length&&map&&!hasFitCurrentRoute){const bounds=markers.getBounds();if(bounds.isValid()){map.fitBounds(bounds.pad(.18),{maxZoom:14});hasFitCurrentRoute=true;}}
    return located.length;
  }
  async function load(route,silent){
    if(loading||!route)return;
    loading=true;refresh.disabled=true;
    if(!silent){statusTitle.textContent="Loading route "+route;statusDetail.textContent="Requesting the latest TfL arrival predictions…";routeHeading.textContent="Route "+route;list.innerHTML='<div class="rf-map-empty">Loading live predictions…</div>';}
    try{
      const items=await fetchPredictions(route);if(route!==activeRoute)return;
      const mapped=plot(items,route);
      vehicleCount.textContent=mapped.toLocaleString("en-GB");predictionCount.textContent=items.length.toLocaleString("en-GB");
      updated.textContent=new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
      statusTitle.textContent="Route "+route+" · "+mapped+" mapped vehicle"+(mapped===1?"":"s");
      statusDetail.textContent=items.length+" TfL prediction"+(items.length===1?"":"s")+" received. Only predictions with coordinates appear on the map.";
      const unique=new Map();
      items.filter(hasCoordinates).forEach(item=>unique.set(String(item.vehicleId||item.id||item.naptanId||item.lat+"-"+item.lon),item));
      renderVehicleList([...unique.values()],route);
    }catch(error){
      if(!silent){statusTitle.textContent="Live tracking unavailable";statusDetail.textContent=error.message;list.innerHTML='<div class="rf-map-empty"><strong>Could not load this route</strong><p>'+esc(error.message)+'</p></div>';}
    }finally{loading=false;refresh.disabled=!activeRoute;}
  }
  function start(route){
    const normalized=String(route||"").trim().toUpperCase().replace(/\s+/g,"");
    if(!/^[A-Z]{0,3}\d{1,3}[A-Z]?$/.test(normalized)){statusTitle.textContent="Enter a valid bus route";statusDetail.textContent="Try a route such as 21, N1, D3 or SL6.";return;}
    activeRoute=normalized;input.value=normalized;refresh.disabled=false;hasFitCurrentRoute=false;
    if(timer)clearInterval(timer);load(normalized,false);
    timer=setInterval(()=>{if(!document.hidden&&activeRoute)load(activeRoute,true);},20000);
    const url=new URL(location.href);url.searchParams.set("route",normalized);history.replaceState({}, "", url);
  }
  if(!window.L){statusTitle.textContent="Map library unavailable";statusDetail.textContent="The interactive map could not be loaded. Check your connection and refresh the page.";}
  else{
    map=L.map("liveMap",{scrollWheelZoom:false}).setView([51.5074,-0.1278],11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
    markers=L.layerGroup().addTo(map);
  }
  form.addEventListener("submit",event=>{event.preventDefault();start(input.value);});
  refresh.addEventListener("click",()=>{if(activeRoute)load(activeRoute,false);});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&activeRoute)load(activeRoute,true);});
  window.addEventListener("pagehide",()=>{if(timer)clearInterval(timer);});
  const requested=new URLSearchParams(location.search).get("route");if(requested)start(requested);
  window.addEventListener("load",()=>setTimeout(()=>map&&map.invalidateSize(),120));
})();