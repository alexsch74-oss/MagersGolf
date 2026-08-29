
(function(){
  const matches = window.MAGERS_MATCHES || [];
  const byId = Object.fromEntries(matches.map(m => [String(m.id), m]));
  const STORAGE_PREFIX = "magers-live-v9-";

  function stateFor(id){
    try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX+id)) || {holes:Array(18).fill(null)}; }
    catch(e){ return {holes:Array(18).fill(null)}; }
  }
  function saveState(id,state){
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_PREFIX+id, JSON.stringify(state));
  }
  function contiguousThrough(holes){
    let n=0; for(let i=0;i<18;i++){ if(holes[i]) n=i+1; else break; } return n;
  }
  function calc(holes){
    const thru = contiguousThrough(holes);
    let h=0,a=0;
    for(let i=0;i<thru;i++){ if(holes[i]==="home")h++; else if(holes[i]==="away")a++; }
    const diff=h-a, remaining=18-thru, abs=Math.abs(diff);
    let final=false, finalText="";
    if(thru===18){
      final=true;
      finalText = diff===0 ? "MATCH HALVED" : ((diff>0?"SWEDEN ":"ENGLAND ")+abs+" UP");
    } else if(abs>remaining){
      final=true;
      finalText=(diff>0?"SWEDEN ":"ENGLAND ")+abs+" & "+remaining;
    }
    let status = diff===0 ? "ALL SQUARE" : ((diff>0?"SWEDEN ":"ENGLAND ")+abs+" UP");
    return {thru,h,a,diff,remaining,final,finalText,status};
  }
  function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function flag(side){return '<span class="team-flag flag-'+(side==="home"?"sweden":"england")+'"></span>';}
  function names(arr){return arr && arr.length ? arr.map(esc).join(" &amp; ") : "Drawn Saturday night";}

  function renderLive(){
    const root=document.getElementById("live-root"); if(!root)return;
    let officialH=0,officialA=0, projH=0,projA=0, active=0;
    matches.forEach(m=>{
      if(m.pending_draw)return;
      const c=calc(stateFor(m.id).holes);
      if(c.final){
        if(c.diff>0) officialH+=1; else if(c.diff<0) officialA+=1; else {officialH+=.5;officialA+=.5;}
      }
      if(c.thru>0 || c.final){
        active++;
        if(c.final){ if(c.diff>0) {projH+=1;} else if(c.diff<0){projA+=1;} else {projH+=.5;projA+=.5;} }
        else if(c.diff>0) projH+=1; else if(c.diff<0) projA+=1; else {projH+=.5;projA+=.5;}
      }
    });
    const totalEl=document.getElementById("official-total");
    if(totalEl) totalEl.textContent=officialH.toString().replace(".5","½")+" – "+officialA.toString().replace(".5","½");
    const proj=document.getElementById("projection");
    if(proj) proj.textContent=active ? ("Current live matches project "+projH.toString().replace(".5","½")+" – "+projA.toString().replace(".5","½")+".") : "Projection activates once hole scoring begins.";

    const groups=["Friday","Saturday","Sunday"];
    root.innerHTML=groups.map(day=>{
      const ms=matches.filter(m=>m.day===day);
      return `<section><div class="live-section-title"><div><div class="eyebrow">${day}</div><h2>${day} matches</h2></div><p class="subtle">${day==="Friday"?"West Course":day==="Saturday"?"East Course":"East Course · Singles"}</p></div>
      <div class="live-match-list">${ms.map(m=>{
        if(m.pending_draw){
          return `<div class="live-match pending"><div class="match-id"><small>Match</small>${m.id}</div><div class="live-pair"><div>${flag("home")} Sunday pairing pending</div><div>${flag("away")} Saturday-night draw</div></div><div class="live-status">${m.time}<small>Not yet assigned</small></div></div>`;
        }
        const st=stateFor(m.id), c=calc(st.holes);
        const status=c.final?c.finalText:(c.thru?c.status:"Not started");
        const sub=c.final?"Final":(c.thru?("Through "+c.thru):(m.time+" · "+m.format));
        return `<a class="live-match can-open" href="live-match.html?match=${m.id}">
          <div class="match-id"><small>Match</small>${m.id}</div>
          <div class="live-pair"><div>${flag("home")} ${names(m.home)}</div><div>${flag("away")} ${names(m.away)}</div></div>
          <div class="live-status">${status}<small>${sub}</small></div></a>`;
      }).join("")}</div></section>`;
    }).join("");
  }

  function renderEntry(){
    const root=document.getElementById("entry-root"); if(!root)return;
    const id=new URLSearchParams(location.search).get("match") || "244";
    const m=byId[id];
    if(!m || m.pending_draw){
      root.innerHTML='<div class="entry-card"><div class="entry-head"><h1>Match not available</h1><p class="entry-check">This Singles pairing has not yet been assigned.</p></div></div>'; return;
    }
    let st=stateFor(id); if(!Array.isArray(st.holes)||st.holes.length!==18)st={holes:Array(18).fill(null)};
    function paint(){
      const c=calc(st.holes);
      const scoreText=document.getElementById("entry-score");
      const through=document.getElementById("entry-through");
      if(scoreText) scoreText.textContent=c.final?c.finalText:c.status;
      if(through) through.textContent=c.final?"FINAL":(c.thru?"THROUGH "+c.thru:"READY TO START");
      const grid=document.getElementById("hole-grid");
      if(grid){
        grid.innerHTML=Array.from({length:18},(_,i)=>{
          const hole=i+1, val=st.holes[i], next=i===c.thru && !c.final, future=i>c.thru || c.final&&i>=c.thru;
          const cls="hole-row"+(next?" next":"")+(future?" future":"")+(c.final&&i>=c.thru?" finished":"");
          const disabled=future?' disabled':'';
          return `<div class="${cls}" data-hole="${hole}">
            <div class="hole-side home"><button class="hole-flag ${val==="home"?"selected":""}" data-result="home"${disabled} aria-label="Sweden wins hole ${hole}">${flag("home")}</button></div>
            <div class="hole-centre"><button class="hole-half ${val==="half"?"selected":""}" data-result="half"${disabled} aria-label="Hole ${hole} halved">${val==="half"?'½<small>HALF</small>':hole+'<small>Hole</small>'}</button></div>
            <div class="hole-side away"><button class="hole-flag ${val==="away"?"selected":""}" data-result="away"${disabled} aria-label="England wins hole ${hole}">${flag("away")}</button></div>
          </div>`;
        }).join("");
        grid.querySelectorAll("button[data-result]").forEach(btn=>{
          btn.addEventListener("click",()=>{
            const row=btn.closest(".hole-row"), idx=Number(row.dataset.hole)-1, result=btn.dataset.result;
            st.holes[idx] = st.holes[idx]===result ? null : result;
            // If a correction clears an earlier hole, clear all later holes to avoid an impossible gap.
            if(st.holes[idx]===null){ for(let j=idx+1;j<18;j++)st.holes[j]=null; }
            saveState(id,st); paint();
          });
        });
      }
      const save=document.getElementById("save-state");
      if(save){
        const when=st.updatedAt ? new Date(st.updatedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : null;
        save.innerHTML=when ? '<strong>Saved on this device</strong> · last change '+when : '<strong>Ready</strong> · no holes recorded yet';
      }
    }

    root.innerHTML=`<div class="entry-card">
      <div class="entry-head">
        <div class="match-kicker">${esc(m.day)} · ${esc(m.course)} Course · ${esc(m.time)} · ${esc(m.format)}</div>
        <h1>Match ${m.id}</h1>
        <div class="entry-teams">
          <div class="entry-team home">${names(m.home)} ${flag("home")}</div>
          <div><div class="entry-score" id="entry-score">ALL SQUARE</div><div class="entry-through" id="entry-through">READY TO START</div></div>
          <div class="entry-team away">${flag("away")} ${names(m.away)}</div>
        </div>
        <div class="entry-check">Check the names before entering a hole. Tap the winning flag; tap the hole number in the centre for a half.</div>
      </div>
      <div class="hole-key"><span>Sweden</span><span>Hole / Half</span><span>England</span></div>
      <div class="hole-grid" id="hole-grid"></div>
      <div class="save-state" id="save-state"></div>
      <div class="entry-actions"><a href="live.html">← Live Cup</a><button id="reset-match" type="button">Reset this demo</button></div>
    </div>`;
    document.getElementById("reset-match").addEventListener("click",()=>{
      if(confirm("Clear the locally saved demo scoring for Match "+id+"?")){
        st={holes:Array(18).fill(null)}; localStorage.removeItem(STORAGE_PREFIX+id); paint();
      }
    });
    paint();
  }

  document.addEventListener("DOMContentLoaded",function(){renderLive();renderEntry();});
})();
