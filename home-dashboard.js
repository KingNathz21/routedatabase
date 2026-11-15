(() => {
  const API=(window.ROUTEFLOW_CONFIG&&window.ROUTEFLOW_CONFIG.apiBaseUrl||"https://routeflow-api.nmorris210509.workers.dev").replace(/\/+$/,"");
  const ids={current:"statCurrent",withdrawn:"statWithdrawn",total:"statTotal",operators:"statOperators"};
  const section=document.querySelector(".rf-stats-section");
  const format=value=>Number(value||0).toLocaleString("en-GB");
  const esc=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  async function getJson(url){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{const response=await fetch(url,{headers:{Accept:"application/json"},cache:"no-store",signal:controller.signal});if(!response.ok)throw new Error("Server returned "+response.status);return await response.json();}
    finally{clearTimeout(timer);}
  }
  async function loadStats(){
    if(!section)return;
    const updated=document.getElementById("statsUpdated"),note=document.getElementById("statsNote");
    try{
      const payload=await getJson(API+"/api/stats"),data=payload.data||{};
      Object.keys(ids).forEach(key=>{const node=document.getElementById(ids[key]);if(node)node.textContent=format(data[key]);});
      updated.textContent="Updated "+new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
      note.textContent=format(data.garages)+" garages are also represented in the RouteFlow archive.";
      section.classList.remove("is-unavailable");
    }catch(error){updated.textContent="Live figures temporarily unavailable";note.textContent="The route archive is still available. Live summary figures could not be retrieved.";section.classList.add("is-unavailable");}
  }
  async function loadRoutes(){
    const host=document.getElementById("homeRouteGrid");if(!host)return;
    try{
      const payload=await getJson(API+"/api/routes?status=current&limit=6"),routes=Array.isArray(payload.data)?payload.data:[];
      if(!routes.length)throw new Error("No route records returned");
      host.innerHTML=routes.map(route=>{
        const number=route.route_number||route.routeNumber||"—";
        const start=route.start_point||route.startPoint||"Start not recorded";
        const destination=route.destination||"Destination not recorded";
        const operator=route.operator_name||route.operator||"Operator not recorded";
        return '<a class="rf-route-card" href="routes.html?route='+encodeURIComponent(number)+'"><span class="rf-route-number">'+esc(number)+'</span><span class="rf-route-copy"><strong>'+esc(start)+' → '+esc(destination)+'</strong><small>'+esc(operator)+'</small></span></a>';
      }).join("");
    }catch(error){host.innerHTML='<div class="rf-route-loading">Route highlights are temporarily unavailable. <a href="routes.html">Browse the full archive</a>.</div>';}
  }
  const form=document.getElementById("homeSearchForm");
  if(form)form.addEventListener("submit",event=>{
    event.preventDefault();
    const query=document.getElementById("homeSearchInput").value.trim(),type=document.getElementById("homeSearchType").value;
    const status=document.getElementById("homeSearchStatus");
    if(!query){status.textContent="Enter something to search for.";return;}
    if(type==="route")location.href="routes.html?search="+encodeURIComponent(query);
    else if(type==="stop")location.href="arrivals.html?search="+encodeURIComponent(query);
    else location.href="fleet.html?q="+encodeURIComponent(query);
  });
  loadStats();loadRoutes();
})();