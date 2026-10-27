let audioContext,masterGain,celebrationTimer;
let soundsEnabled=true;try{soundsEnabled=localStorage.getItem('inbetween-sound')!=='off'}catch{}
function ensureSeating(){if(!Array.isArray(state.seatOrder)||state.seatOrder.length!==state.players.length||new Set(state.seatOrder).size!==state.players.length||state.seatOrder.some(i=>!Number.isInteger(i)||i<0||i>=state.players.length))state.seatOrder=state.players.map((_,i)=>i);if(state.direction!==-1)state.direction=1}
function renderDirection(){const b=$('direction');b.textContent=state.direction===1?'↻ Clockwise':'↺ Anticlockwise';b.setAttribute('aria-label','Turn direction: '+(state.direction===1?'clockwise':'anticlockwise')+'. Click to reverse.');b.disabled=state.ended;document.querySelector('.felt').dataset.direction=state.direction;updateSoundButton()}
function updateSoundButton(){const b=document.getElementById('sound-toggle');b.textContent=soundsEnabled?'Sound on ♪':'Sound off ♩';b.setAttribute('aria-pressed',String(soundsEnabled))}
function unlockAudio(){if(!soundsEnabled)return;try{if(!audioContext){audioContext=new (window.AudioContext||window.webkitAudioContext)();masterGain=audioContext.createGain();masterGain.gain.value=.18;const compressor=audioContext.createDynamicsCompressor();masterGain.connect(compressor);compressor.connect(audioContext.destination)}if(audioContext.state==='suspended')audioContext.resume().catch(()=>{})}catch{}}
function tone(freq,at,duration,volume=.25,type='sine',endFreq){if(!soundsEnabled||!audioContext||audioContext.state!=='running')return;const start=audioContext.currentTime+at,o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(freq,start);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,start+duration);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(volume,start+.012);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g);g.connect(masterGain);o.start(start);o.stop(start+duration+.02)}
function sound(kind){unlockAudio();if(!soundsEnabled)return;if(kind==='full'){[523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>{tone(f,i*.10,.65,.28);tone(f*2,i*.10,.25,.06)});[523.25,659.25,783.99].forEach(f=>tone(f,.5,1.2,.12))}else if(kind==='win'){[659.25,987.77,1318.5].forEach((f,i)=>tone(f,i*.075,.38,.22))}else if(kind==='loss'){tone(260,0,.22,.24,'sine',170);tone(130,.025,.18,.2)}else if(kind==='match'){tone(392,0,.16,.22,'triangle');tone(311,.13,.28,.2,'triangle')}else if(kind==='ante'){[440,660,880].forEach((f,i)=>tone(f,i*.055,.2,.14))}else{tone(700,0,.065,.12,'sine',480)}}
document.addEventListener('pointerdown',unlockAudio,{passive:true});document.addEventListener('keydown',unlockAudio);
document.getElementById('sound-toggle').onclick=()=>{soundsEnabled=!soundsEnabled;try{localStorage.setItem('inbetween-sound',soundsEnabled?'on':'off')}catch{}if(masterGain&&audioContext)masterGain.gain.setTargetAtTime(soundsEnabled?.18:0,audioContext.currentTime,.02);updateSoundButton();if(soundsEnabled)sound('tap')};
document.getElementById('direction').onclick=()=>{if(!state||state.ended)return;state.direction*=-1;save();render();sound('tap');$('seating-status').textContent='Direction changed. '+state.players[state.turn]+' keeps the current turn.'};
function moveSeat(player,target){const from=state.seatOrder.indexOf(player);if(from===target)return;state.seatOrder.splice(from,1);state.seatOrder.splice(target,0,player);save();render();sound('tap');$('seating-status').textContent=state.players[player]+' moved to seat '+(target+1)+'. Turn order now follows the new seating.'}
function bindSeats(){document.querySelectorAll('[data-seat]').forEach(b=>{const player=Number(b.dataset.seat);let drag=null,suppressClick=false;
 b.onclick=()=>{if(suppressClick){suppressClick=false;return}if(state.ended)return;if(state.mode==='digital'){$('seating-status').textContent='The next turn starts automatically after this hand. Dragging still changes seat order.';return}state.turn=player;save();render();sound('tap')};
 b.onkeydown=e=>{if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();moveSeat(player,(state.seatOrder.indexOf(player)+(e.key==='ArrowRight'?1:-1)+state.players.length)%state.players.length);document.querySelector('[data-seat="'+player+'"]').focus()}};
 b.onpointerdown=e=>{if(state.ended||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,target:state.seatOrder.indexOf(player)};b.setPointerCapture(e.pointerId)};
 b.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7&&!drag.moved)return;drag.moved=true;const r=$('table-scene').getBoundingClientRect(),nx=(e.clientX-r.left-r.width/2)/(r.width*.36),ny=(e.clientY-r.top-r.height/2)/(r.height*(state.mode==='digital'?.40:.30)),angle=(Math.atan2(ny,nx)+Math.PI/2+Math.PI*2)%(Math.PI*2);drag.target=Math.round(angle/(Math.PI*2)*state.players.length)%state.players.length;b.classList.add('dragging');b.style.left=Math.max(4,Math.min(96,(e.clientX-r.left)/r.width*100))+'%';b.style.top=Math.max(4,Math.min(96,(e.clientY-r.top)/r.height*100))+'%';document.querySelectorAll('[data-seat]').forEach(s=>s.classList.toggle('drop-target',state.seatOrder.indexOf(Number(s.dataset.seat))===drag.target&&s!==b));};
 b.onpointerup=e=>{if(!drag)return;const d=drag;drag=null;if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);if(d.moved){suppressClick=true;e.preventDefault();const from=state.seatOrder.indexOf(player);if(from===d.target)render();else moveSeat(player,d.target)}};
 b.onpointercancel=()=>{drag=null;suppressClick=true;render()};
})}
function clearCelebration(){clearTimeout(celebrationTimer);const c=document.getElementById('celebration');if(c){c.innerHTML='';c.className=''}document.querySelectorAll('.winner-seat,.loser-seat').forEach(b=>b.classList.remove('winner-seat','loser-seat'))}
function playFeedback(e,potBefore){if(state.mode==='digital'&&['loss','match'].includes(e.type)){playLossFeedback(e,potBefore);return}if(e.type!=='win'){sound(e.type);return}const full=e.bet===potBefore;const c=$('celebration'),winner=state.players[e.player];c.className=full?'celebrate-full':'celebrate-small';c.innerHTML=`<div class="win-banner"><span>${full?'✦ FULL POT WIN ✦':'✧ NICE WIN'}</span><strong>${esc(winner)}</strong><b>+${money(e.bet)}</b></div>`+(full?Array.from({length:38},(_,i)=>`<i class="confetti" style="--x:${(i*41)%100}%;--delay:${(i%7)*.065}s;--color:${['#ecd58a','#b7d39b','#fff4c8','#8ac7ad'][i%4]};--rotate:${i*47}deg"></i>`).join(''):'');document.querySelector('[data-seat="'+e.player+'"]').classList.add('winner-seat');sound(full?'full':'win');celebrationTimer=setTimeout(clearCelebration,full?3500:1700)}

function playLossFeedback(e,potBefore){
 clearCelebration();const full=e.bet===potBefore,c=$('celebration'),amount=-e.deltas[e.player];
 c.className=full?'loss-full':'loss-small';
 c.innerHTML='<div class="loss-ripple"></div><div class="loss-banner"><span>'+(e.type==='match'?'MATCH · DOUBLE PAYMENT':full?'FULL-POT BET LOST':'OUTSIDE THE CARDS')+'</span><strong>'+esc(state.players[e.player])+'</strong><b>−'+money(amount)+'</b><small>Added to the pot'+(full&&e.type==='match'?' · Full-pot bet':'')+'</small></div>'+(full?Array.from({length:12},(_,i)=>'<i class="loss-fragment" style="--angle:'+i*30+'deg;--travel:'+(65+i%3*20)+'px"></i>').join(''):'');
 document.querySelector('[data-seat="'+e.player+'"]').classList.add('loser-seat');
 sound(e.type);if(full){tone(110,.2,.7,.3,'triangle',55);tone(82,.4,.8,.2,'sine',41)}
 celebrationTimer=setTimeout(clearCelebration,full?2700:1500);
}

let animationsEnabled=true;
try{animationsEnabled=localStorage.getItem('inbetween-motion')!=='off'}catch{}
function updateMotionPreference(){
 document.body.classList.toggle('motion-off',!animationsEnabled);
 const button=document.getElementById('motion-toggle');
 button.textContent=animationsEnabled?'Animations on':'Animations off';
 button.setAttribute('aria-pressed',String(animationsEnabled));
}
document.getElementById('motion-toggle').onclick=()=>{
 animationsEnabled=!animationsEnabled;
 try{localStorage.setItem('inbetween-motion',animationsEnabled?'on':'off')}catch{}
 updateMotionPreference();
};
updateMotionPreference();
