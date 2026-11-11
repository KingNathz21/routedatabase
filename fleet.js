(() => {
  const grid=document.querySelector("#fleetGrid"),search=document.querySelector("#fleetSearch"),power=document.querySelector("#powerFilter"),deck=document.querySelector("#deckFilter"),sort=document.querySelector("#fleetSort"),summary=document.querySelector("#fleetSummary");
  let models=[];
  const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const clean=v=>String(v||"").trim();
  const split=v=>clean(v).split(/[,;\n]+/).map(x=>x.trim()).filter(x=>x&&x.toLowerCase()!=="not yet verified");
  function render(){
    const q=search.value.trim().toLowerCase(),p=power.value,d=deck.value;
    let list=models.filter(m=>(!p||m.powers.includes(p))&&(!d||m.decks.includes(d))&&`${m.name} ${m.power} ${m.deck} ${m.operators.join(" ")} ${m.routes.join(" ")}`.toLowerCase().includes(q));
    list.sort(sort.value==="name"?(a,b)=>a.name.localeCompare(b.name):(a,b)=>b.routes.length-a.routes.length||a.name.localeCompare(b.name));
    summary.textContent=`Showing ${list.length} of ${models.length} model records. Route associations come from the archive, not live vehicle allocations.`;
    grid.innerHTML=list.length?list.map(m=>`<article class="fleet-card"><div class="fleet-card-head"><div><h3>${esc(m.name)}</h3><p>${m.routes.length} route records</p></div><strong>${m.routes.length? "IN ARCHIVE":"—"}</strong></div><div class="operator-meta"><span>${esc(m.powers.join(", ")||"Power type not recorded")}</span><span>${esc(m.decks.join(", ")||"Vehicle size not recorded")}</span></div><p>Operators: ${esc(m.operators.slice(0,3).join(", ")||"Not recorded")}${m.operators.length>3?" and more":""}</p><div class="fleet-card-routes">Example routes: ${m.routes.slice(0,12).map(r=>`<a href="routes.html?route=${encodeURIComponent(r)}">${esc(r)}</a>`).join(", ")||"Not recorded"}${m.routes.length>12?" …":""}</div></article>`).join(""):'<div class="empty-panel"><h3>No matching vehicles</h3><p>Try changing the search or filters.</p></div>';
  }
  async function init(){
    try{
      const data=await window.RouteFlowDatabase.getArchive(),map=new Map(),all=data.current||[];
      all.forEach(route=>{
        const names=split(route["Models Used"]);names.forEach(name=>{
          if(!map.has(name))map.set(name,{name,routes:new Set(),operators:new Set(),powers:new Set(),decks:new Set()});
          const m=map.get(name);if(route.Route)m.routes.add(String(route.Route));if(route.Operator)m.operators.add(route.Operator);if(route["Power Type"]&&route["Power Type"]!=="Not yet verified")m.powers.add(route["Power Type"]);if(route["Vehicle Type (Single/Double Deck)"]&&route["Vehicle Type (Single/Double Deck)"]!=="Not yet verified")m.decks.add(route["Vehicle Type (Single/Double Deck)"]);
        });
      });
      models=[...map.values()].map(m=>({name:m.name,routes:[...m.routes].sort((a,b)=>a.localeCompare(b,"en",{numeric:true})),operators:[...m.operators].sort(),powers:[...m.powers].sort(),decks:[...m.decks].sort()})).sort((a,b)=>a.name.localeCompare(b.name));
      const unique=(key)=>[...new Set(models.flatMap(m=>m[key]).filter(Boolean))].sort();
      unique("power").forEach(v=>power.add(new Option(v,v)));unique("deck").forEach(v=>deck.add(new Option(v,v)));
      document.querySelector("#fleetModelTotal").textContent=models.length;
      document.querySelector("#fleetRouteTotal").textContent=all.length;
      document.querySelector("#fleetPowerTotal").textContent=unique("power").length;
      document.querySelector("#fleetOperatorTotal").textContent=new Set(all.map(r=>r.Operator).filter(Boolean)).size;
      render();
    }catch(error){summary.textContent=error.message;grid.innerHTML='<div class="empty-panel"><h3>Fleet archive unavailable</h3><p>Please refresh and try again.</p></div>';}
  }
  [search,power,deck,sort].forEach(el=>el.addEventListener(el===search?"input":"change",render));init();
})();