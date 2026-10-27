let screenMode='welcome',draftPlayers=[];
const SESSION_STORE='inbetween-sessions-v1';let sessionLibrary={};
try{const saved=JSON.parse(localStorage.getItem(SESSION_STORE));if(saved&&typeof saved==='object'&&!Array.isArray(saved))sessionLibrary=saved}catch{}
function newSessionId(){return 'session-'+Array.from(crypto.getRandomValues(new Uint32Array(4)),v=>v.toString(16).padStart(8,'0')).join('')}
function persistSession(){if(!state)return;if(!state.id){state.id=newSessionId();state.createdAt=new Date().toISOString();state.name='Saved card night'}state.updatedAt=new Date().toISOString();try{const latest=JSON.parse(localStorage.getItem(SESSION_STORE));if(latest&&typeof latest==='object'&&!Array.isArray(latest))sessionLibrary={...sessionLibrary,...latest}}catch{}sessionLibrary[state.id]=JSON.parse(JSON.stringify(state));localStorage.setItem(SESSION_STORE,JSON.stringify(sessionLibrary))}
function renderScreen(){
 if(screenMode!=='game'||state?.ended)stopDigitalFlow();
 document.body.classList.toggle('playing',screenMode==='game'&&!!state);document.body.classList.toggle('digital-game',screenMode==='game'&&state?.mode==='digital');
 $('welcome').hidden=screenMode!=='welcome';$('setup').hidden=screenMode!=='setup';$('game').hidden=screenMode!=='game';
 if(screenMode==='welcome'){renderWelcome();return true}
 if(screenMode==='setup'){renderPlayerChips();return true}
 if(!state){screenMode='welcome';return renderScreen()}
 $('game-session-title').textContent='♠  '+(state.name||'Your table');return false;
}
function renderWelcome(){
 if(state&&(!state.id||!sessionLibrary[state.id])){save()}
 const sessions=Object.values(sessionLibrary).filter(s=>s&&Array.isArray(s.players)&&Array.isArray(s.events)).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
 $('welcome-sound').textContent=soundsEnabled?'Sound on ♪':'Sound off ♩';$('welcome-sound').setAttribute('aria-pressed',String(soundsEnabled));
 $('welcome-resume').hidden=!sessions.length;$('welcome-resume').onclick=()=>resumeSession(sessions[0].id);
 $('saved-sessions').hidden=!sessions.length;$('session-count').textContent=sessions.length+(sessions.length===1?' session':' sessions');
 $('session-list').innerHTML=sessions.map(s=>{const pot=totals(s).pot,amount=new Intl.NumberFormat('en-US',{style:'currency',currency:s.currency}).format(pot/100),date=new Date(s.updatedAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});return `<div class="saved-session"><div class="session-icon">♠</div><div class="session-description"><b>${esc(s.name||'Card night')}</b><small>${s.mode==='digital'?'Digital':'Live table'} · ${s.players.length} players · ${esc(amount)} pot · ${s.ended?'Completed':'In progress'}</small><small>${esc(date)}</small></div><button data-resume="${esc(s.id)}">${s.ended?'View':'Resume'} →</button></div>`}).join('');
 document.querySelectorAll('[data-resume]').forEach(b=>b.onclick=()=>resumeSession(b.dataset.resume));
}
function resumeSession(id){if(!sessionLibrary[id])return;state=JSON.parse(JSON.stringify(sessionLibrary[id]));screenMode='game';$('bet').value=(state.ante/100).toFixed(2);save();render();window.scrollTo({top:0,behavior:'instant'})}
function openNewGame(){if(state)save();screenMode='setup';draftPlayers=[];$('session-name').value='';$('player-name').value='';$('player-error').textContent='';render();$('player-name').focus()}
function openMenu(){if(state)save();clearCelebration();screenMode='welcome';render();window.scrollTo({top:0,behavior:'instant'})}
function renderPlayerChips(){
 $('player-chips').innerHTML=draftPlayers.map((name,i)=>`<span class="player-chip"><span class="chip-avatar">${esc(name.slice(0,1).toUpperCase())}</span><span>${esc(name)}</span><button type="button" data-remove-player="${i}" aria-label="Remove ${esc(name)}">×</button></span>`).join('');
 $('player-count').textContent=draftPlayers.length+' / 30 players added'+(draftPlayers.length<2?' · Add at least 2 to start.':' · Ready to play.');
 document.querySelectorAll('[data-remove-player]').forEach(b=>b.onclick=()=>{draftPlayers.splice(Number(b.dataset.removePlayer),1);$('player-error').textContent='';renderPlayerChips();$('player-name').focus()});
}
function addPlayer(){const name=$('player-name').value.trim();$('player-error').textContent='';if(!name){$('player-error').textContent='Enter a player name first.';arcadeCue('error');return}if(draftPlayers.length>=30){$('player-error').textContent='This table supports up to 30 players.';arcadeCue('error');return}if(draftPlayers.some(n=>n.toLowerCase()===name.toLowerCase())){$('player-error').textContent='That name is already at the table. Use a unique name.';arcadeCue('error');return}draftPlayers.push(name);$('player-name').value='';renderPlayerChips();$('player-name').focus();arcadeCue('add')}
document.getElementById('add-player').onclick=addPlayer;
document.getElementById('player-name').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addPlayer()}};
document.getElementById('welcome-new').onclick=openNewGame;
document.getElementById('welcome-sound').onclick=()=>{document.getElementById('sound-toggle').click();renderWelcome()};
document.getElementById('setup-menu').onclick=openMenu;
document.getElementById('game-menu').onclick=openMenu;

