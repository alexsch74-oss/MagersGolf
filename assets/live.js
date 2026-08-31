(function(){
  const matches = window.MAGERS_MATCHES || [];
  const byId = Object.fromEntries(matches.map(m => [String(m.id), m]));
  const STORAGE_PREFIX = "magers-live-v10-";
  function blank(){ return {holes:Array(18).fill(null), locked:false, confirmedResult:null, confirmedAt:null}; }
  function stateFor(id){ try { const s=JSON.parse(localStorage.getItem(STORAGE_PREFIX+id)); return s?Object.assign(blank(),s):blank(); } catch(e){ return blank(); } }
  function saveState(id,state){ state.updatedAt=new Date().toISOString(); localStorage.setItem(STORAGE_PREFIX+id,JSON.stringify(state)); }
  function contiguousThrough(holes){ let n=0; for(let i=0;i<18;i++){if(holes[i])n=i+1;else break;} return n; }
  function calc(holes){
    const thru=contiguousThrough(holes); let h=0,a=0;
    for(let i=0;i<thru;i++){ if(holes[i]==="home")h++; else if(holes[i]==="away")a++; }
    const diff=h-a, remaining=18-thru, abs=Math.abs(diff); let final=false, finalText="";
    if(thru===18){final=true;finalText=diff===0?"MATCH HALVED":((diff>0?"SWEDEN ":"ENGLAND ")+abs+" UP");}
    else if(abs>remaining){final=true;finalText=(diff>0?"SWEDEN ":"ENGLAND ")+abs+" & "+remaining;}
    const status=diff===0?"ALL SQUARE":((diff>0?"SWEDEN ":"ENGLAND ")+abs+" UP");
    return {thru,h,a,diff,remaining,final,finalText,status};
  }
  function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function flag(side){return '<span class="team-flag flag-'+(side==="home"?"sweden":"england")+'"></span>';}
  function names(arr){return arr&&arr.length?arr.map(esc).join(" &amp; "):"Drawn Saturday night";}
  function pointsFrom(c){ if(c.diff>0)return [1,0]; if(c.diff<0)return [0,1]; return [.5,.5]; }

  function renderLive(){
    const root=document.getElementById("live-root"); if(!root)return;
    let officialH=0,officialA=0,projH=0,projA=0,active=0;
    matches.forEach(m=>{ if(m.pending_draw)return; const st=stateFor(m.id),c=calc(st.holes);
      if(st.locked&&c.final){const p=pointsFrom(c);officialH+=p[0];officialA+=p[1];}
      if(c.thru>0){active++; const p=pointsFrom(c);projH+=p[0];projA+=p[1];}
    });
    const total=document.getElementById("official-total"); if(total)total.textContent=officialH.toString().replace(".5","½")+" – "+officialA.toString().replace(".5","½");
    const proj=document.getElementById("projection"); if(proj)proj.textContent=active?("Current live matches project "+projH.toString().replace(".5","½")+" – "+projA.toString().replace(".5","½")+". Official score counts confirmed, locked matches only."):"Projection activates once hole scoring begins.";
    root.innerHTML=["Friday","Saturday","Sunday"].map(day=>{const ms=matches.filter(m=>m.day===day);return `<section><div class="live-section-title"><div><div class="eyebrow">${day}</div><h2>${day} matches</h2></div><p class="subtle">${day==="Friday"?"West Course":day==="Saturday"?"East Course":"East Course · Singles"}</p></div><div class="live-match-list">${ms.map(m=>{
      if(m.pending_draw)return `<div class="live-match pending"><div class="match-id"><small>Match</small>${m.id}</div><div class="live-pair"><div>${flag("home")} Sunday pairing pending</div><div>${flag("away")} Saturday-night draw</div></div><div class="live-status">${m.time}<small>Not yet assigned</small></div></div>`;
      const st=stateFor(m.id),c=calc(st.holes); let status="Not started",sub=m.time+" · "+m.format;
      if(st.locked&&c.final){status=c.finalText;sub="Final · locked";} else if(c.final){status=c.finalText;sub="Decided · awaiting confirmation";} else if(c.thru){status=c.status;sub="Through "+c.thru;}
      return `<a class="live-match can-open ${st.locked?'locked':''}" href="live-match.html?match=${m.id}"><div class="match-id"><small>Match</small>${m.id}</div><div class="live-pair"><div>${flag("home")} ${names(m.home)}</div><div>${flag("away")} ${names(m.away)}</div></div><div class="live-status">${status}<small>${sub}</small></div></a>`;
    }).join("")}</div></section>`;}).join("");
  }

  function renderEntry(){
    const root=document.getElementById("entry-root"); if(!root)return;
    const id=new URLSearchParams(location.search).get("match")||"244",m=byId[id];
    if(!m||m.pending_draw){root.innerHTML='<div class="entry-card"><div class="entry-head"><h1>Match not available</h1><p class="entry-check">This Singles pairing has not yet been assigned.</p></div></div>';return;}
    let st=stateFor(id); if(!Array.isArray(st.holes)||st.holes.length!==18)st=blank();
    root.innerHTML=`<div class="entry-card"><div class="entry-head"><div class="match-kicker">${esc(m.day)} · ${esc(m.course)} Course · ${esc(m.time)} · ${esc(m.format)}</div><h1>Match ${m.id}</h1><div class="entry-teams"><div class="entry-team home">${names(m.home)} ${flag("home")}</div><div><div class="entry-score" id="entry-score">ALL SQUARE</div><div class="entry-through" id="entry-through">READY TO START</div></div><div class="entry-team away">${flag("away")} ${names(m.away)}</div></div><div class="entry-check">Check the names before entering a hole. Tap the winning flag; tap the hole number in the centre for a half.</div></div><div class="hole-key"><span>Sweden</span><span>Hole / Half</span><span>England</span></div><div class="hole-grid" id="hole-grid"></div><div id="close-panel"></div><div class="save-state" id="save-state"></div><div class="entry-actions"><a href="live.html">← Live Cup</a><button id="reset-match" type="button">Reset this test match</button></div></div>`;
    function paint(){
      const c=calc(st.holes),score=document.getElementById("entry-score"),through=document.getElementById("entry-through"),grid=document.getElementById("hole-grid");
      if(score)score.textContent=c.final?c.finalText:c.status;
      if(through)through.textContent=st.locked?"FINAL · LOCKED":c.final?"DECIDED · CONFIRM RESULT":c.thru?"THROUGH "+c.thru:"READY TO START";
      if(grid){grid.innerHTML=Array.from({length:18},(_,i)=>{const hole=i+1,val=st.holes[i],next=i===c.thru&&!c.final&&!st.locked,future=i>c.thru,disabled=st.locked||future||(c.final&&i>=c.thru);return `<div class="hole-row${next?' next':''}${future?' future':''}${st.locked?' locked-row':''}" data-hole="${hole}"><div class="hole-side home"><button class="hole-flag ${val==='home'?'selected':''}" data-result="home"${disabled?' disabled':''}>${flag("home")}</button></div><div class="hole-centre"><button class="hole-half ${val==='half'?'selected':''}" data-result="half"${disabled?' disabled':''}>${val==='half'?'½<small>HALF</small>':hole+'<small>Hole</small>'}</button></div><div class="hole-side away"><button class="hole-flag ${val==='away'?'selected':''}" data-result="away"${disabled?' disabled':''}>${flag("away")}</button></div></div>`;}).join("");
        grid.querySelectorAll("button[data-result]:not([disabled])").forEach(btn=>btn.addEventListener("click",()=>{const idx=Number(btn.closest('.hole-row').dataset.hole)-1,res=btn.dataset.result;st.holes[idx]=st.holes[idx]===res?null:res;if(st.holes[idx]===null){for(let j=idx+1;j<18;j++)st.holes[j]=null;}saveState(id,st);paint();}));}
      const cp=document.getElementById("close-panel"); if(cp){
        if(st.locked){cp.innerHTML=`<div class="match-locked"><strong>Match closed and locked</strong><span>${esc(st.confirmedResult||c.finalText)} · normal scorer editing is disabled.</span><small>Any post-close correction will require administrator access in the shared database version.</small></div>`;}
        else if(c.final){cp.innerHTML=`<div class="close-confirm"><div><strong>Match decided — ${esc(c.finalText)}</strong><span>Please confirm that the players have ended the match.</span></div><button id="confirm-close" type="button">Confirm match result</button></div>`;document.getElementById('confirm-close').addEventListener('click',()=>{if(confirm('Confirm '+c.finalText+' as the final result for Match '+id+'? After confirmation, normal scoring will be locked.')){st.locked=true;st.confirmedResult=c.finalText;st.confirmedAt=new Date().toISOString();saveState(id,st);paint();}});}
        else cp.innerHTML='';
      }
      const save=document.getElementById("save-state"),when=st.updatedAt?new Date(st.updatedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):null;if(save)save.innerHTML=when?'<strong>Saved on this device</strong> · last change '+when:'<strong>Ready</strong> · no holes recorded yet';
      const reset=document.getElementById('reset-match'); if(reset){reset.disabled=st.locked;reset.title=st.locked?'Locked matches require admin correction/reset in production':'';}
    }
    document.getElementById("reset-match").addEventListener("click",()=>{if(st.locked)return;if(confirm("Clear the locally saved test scoring for Match "+id+"?")){st=blank();localStorage.removeItem(STORAGE_PREFIX+id);paint();}}); paint();
  }
  document.addEventListener("DOMContentLoaded",()=>{renderLive();renderEntry();const all=document.getElementById('reset-all-test');if(all)all.addEventListener('click',()=>{if(confirm('Reset ALL locally stored V10 test scoring on this device? This is for rehearsal only.')){Object.keys(localStorage).filter(k=>k.startsWith(STORAGE_PREFIX)).forEach(k=>localStorage.removeItem(k));location.reload();}});});
})();
