(() => {
  const form=document.querySelector("#journeyForm"),from=document.querySelector("#journeyFrom"),to=document.querySelector("#journeyTo");
  const results=document.querySelector("#journeyResults"),heading=document.querySelector("#journeyResultsHeading"),meta=document.querySelector("#journeyResultMeta"),submit=document.querySelector("#planJourneyButton");
  const dateInput=document.querySelector("#journeyDate"),timeInput=document.querySelector("#journeyTime");
  const today=new Date(),pad=n=>String(n).padStart(2,"0");\n  let lastJourneys=[],lastSearch={};
  dateInput.min=`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const escape=value=>String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const api=(path)=>{const key=window.APP_CONFIG?.tflApiKey?.trim();return `https://api.tfl.gov.uk${path}${key?`${path.includes("?")?"&":"?"}app_key=${encodeURIComponent(key)}`:""}`;};
  const dateCode=value=>value.replaceAll("-","");
  const timeCode=value=>value.replace(":","");
  const fmt=value=>{if(!value)return "Time unavailable";const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});};
  const duration=value=>{const n=Number(value);return Number.isFinite(n)?`${n} min`:"Duration unavailable";};
  const legIcon=leg=>{const mode=(leg.mode?.name||"").toLowerCase();return mode==="walking"?"↟":mode==="bus"?"▰":mode.includes("tube")||mode.includes("rail")||mode==="dlr"?"▤":"↗";};
  function renderJourneys(data){
    const journeys=Array.isArray(data.journeys)?data.journeys:[];lastJourneys=journeys;
    if(!journeys.length){results.innerHTML='<div class="empty-panel"><h3>No journeys returned</h3><p>Try a nearby station or a different time. TfL may not have a journey available for those locations.</p></div>';return;}
    heading.textContent=`${journeys.length} journey option${journeys.length===1?"":"s"}`;
    meta.textContent=data.searchCriteria?.date? `TfL results · ${data.searchCriteria.date}`:"TfL journey options";
    results.innerHTML=journeys.map((journey,index)=>{
      const legs=journey.legs||[];
      const legMarkup=legs.map((leg,i)=>`<div class="journey-leg"><span class="leg-dot" aria-hidden="true">${legIcon(leg)}</span><div><strong>${escape(leg.instruction?.summary||leg.instruction?.detailed||leg.mode?.name||"Journey leg")}</strong><small>${escape(leg.departurePoint?.commonName||"")} ${leg.departurePoint&&leg.arrivalPoint?"→":""} ${escape(leg.arrivalPoint?.commonName||"")}</small></div><span class="leg-duration">${duration(leg.duration)}</span></div>`).join("");
      const warnings=(journey.legs||[]).flatMap(l=>l.disruptions||[]).slice(0,2);
      return `<article class="journey-card"><div class="journey-card-top"><div><div class="journey-times">${fmt(journey.startDateTime)} <span>→</span> ${fmt(journey.arrivalDateTime)}</div><small>${legs.length} leg${legs.length===1?"":"s"} · ${escape(journey.routeOptions?.[0]?.name||"Public transport")}</small></div><div><span class="journey-duration">${duration(journey.duration)}</span> <button class="account-secondary save-journey-button" type="button" data-save-trip="${index}">Save journey</button></div></div><div class="journey-legs">${legMarkup}</div>${warnings.length?`<div class="journey-warning">${escape(warnings[0].description||"Disruption information supplied by TfL")}</div>`:""}</article>`;
    }).join("");
    results.querySelectorAll("[data-save-trip]").forEach(button=>button.addEventListener("click",async()=>{const user=await window.RouteFlowAuth?.ready;if(!user){location.href="login.html?next=dashboard.html";return;}button.disabled=true;try{const journey=lastJourneys[Number(button.dataset.saveTrip)]||{};await window.RouteFlowAuth.saveJourney({origin:lastSearch.origin,destination:lastSearch.destination,journey:{duration:journey.duration,startDateTime:journey.startDateTime,arrivalDateTime:journey.arrivalDateTime}});button.textContent="Saved";}catch(error){button.disabled=false;button.textContent="Try again";alert(error.message);}}));
  }
  async function plan(event){
    event.preventDefault();
    const origin=from.value.trim(),destination=to.value.trim();lastSearch={origin,destination};
    if(!origin||!destination)return;
    if(origin.toLowerCase()===destination.toLowerCase()){results.innerHTML='<div class="empty-panel"><h3>Choose two different places</h3><p>Your starting point and destination are currently the same.</p></div>';return;}
    submit.disabled=true;submit.textContent="Finding journeys…";heading.textContent="Searching London";meta.textContent="";
    results.innerHTML='<div class="empty-panel"><span class="empty-icon">↗</span><h3>Finding your options</h3><p>Checking available TfL journeys. This can take a few seconds.</p></div>';
    try{
      const date=dateInput.value?dateCode(dateInput.value):dateCode(`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`);
      const time=timeInput.value?timeCode(timeInput.value):timeCode(`${pad(today.getHours())}:${pad(today.getMinutes())}`);
      const mode=document.querySelector("#journeyMode").value;
      const when=document.querySelector("#journeyWhen").value;
      const query=new URLSearchParams({date,time,timeIs:when,mode,journeyPreference:"LeastTime"});
      const url=api(`/Journey/JourneyResults/${encodeURIComponent(origin)}/to/${encodeURIComponent(destination)}?${query}`);
      const response=await fetch(url);
      if(!response.ok)throw new Error(response.status===404?"TfL could not match one of those locations. Try a station name or postcode.":`TfL journey search returned ${response.status}. Please try again.`);
      renderJourneys(await response.json());
    }catch(error){heading.textContent="Journey search unavailable";results.innerHTML=`<div class="empty-panel"><h3>We couldn't plan that journey</h3><p>${escape(error.message||"Please check your connection and try again.")}</p></div>`;}
    finally{submit.disabled=false;submit.innerHTML='Find journeys <span>→</span>';}
  }
  form.addEventListener("submit",plan);
  document.querySelector("#swapJourney").addEventListener("click",()=>{const v=from.value;from.value=to.value;to.value=v;from.focus();});
})();