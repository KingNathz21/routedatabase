(() => {
  const grid=document.querySelector("#operatorGrid"),search=document.querySelector("#operatorSearch"),summary=document.querySelector("#operatorSummary"),total=document.querySelector("#operatorTotal");
  let groups=[];
  const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const clean=v=>String(v||"Not recorded").trim().replace(/\s+/g," ");
  const operatorName=v=>clean(v).replace(/^GoAhead London:\s*/i,"Go-Ahead London · ").replace(/^GoAhead\s*/i,"Go-Ahead ");
  function render(){
    const q=search.value.trim().toLowerCase();
    const list=groups.filter(g=>`${g.name} ${g.garages.join(" ")} ${g.routes.join(" ")}`.toLowerCase().includes(q));
    summary.textContent=`Showing ${list.length} of ${groups.length} operators · route counts are archive records, not live fleet totals.`;
    grid.innerHTML=list.length?list.map(g=>`<article class="operator-card"><h3>${esc(g.name)}</h3><p>${g.routes.length} route records in the archive</p><div class="operator-meta"><span>${g.garages.length} garage${g.garages.length===1?"":"s"} listed</span><span>${g.withdrawn} withdrawn</span></div><div class="operator-meta">${g.garages.slice(0,8).map(garage=>`<span>${esc(garage)}</span>`).join("")}${g.garages.length>8?`<span>+${g.garages.length-8} garages</span>`:""}</div><div class="operator-routes">${g.routes.slice(0,18).map(route=>`<a href="routes.html?route=${encodeURIComponent(route)}" title="Open route ${esc(route)}">${esc(route)}</a>`).join("")}${g.routes.length>18?`<span class="fleet-tag">+${g.routes.length-18} more</span>`:""}</div></article>`).join(""):'<div class="empty-panel"><h3>No operators found</h3><p>Try another operator, garage or route number.</p></div>';
  }
  async function init(){
    try{
      const data=await window.RouteFlowDatabase.getArchive(),map=new Map();
      [...(data.current||[]).map(r=>({...r,__withdrawn:false})),...(data.withdrawn||[]).map(r=>({...r,__withdrawn:true}))].forEach(route=>{
        const name=operatorName(route.Operator||route["Final Operator"]);if(!map.has(name))map.set(name,{name,routes:new Set(),garages:new Set(),withdrawn:0});
        const group=map.get(name);if(route.Route)group.routes.add(String(route.Route));const garage=route.Garage||route["Final Garage"];if(garage&&garage!=="Not yet verified")group.garages.add(clean(garage));if(route.__withdrawn)group.withdrawn++;
      });
      groups=[...map.values()].map(g=>({...g,routes:[...g.routes].sort((a,b)=>a.localeCompare(b,"en",{numeric:true})),garages:[...g.garages].sort()})).sort((a,b)=>a.name.localeCompare(b.name));
      total.textContent=groups.length;render();
    }catch(error){summary.textContent=error.message;grid.innerHTML='<div class="empty-panel"><h3>Directory unavailable</h3><p>Please refresh and try again.</p></div>';}
  }
  search.addEventListener("input",render);init();
})();