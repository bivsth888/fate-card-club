let audioContext,masterGain,celebrationTimer;
let soundsEnabled=true;try{soundsEnabled=localStorage.getItem('inbetween-sound')!=='off'}catch{}
function ensureSeating(){if(!Array.isArray(state.seatOrder)||state.seatOrder.length!==state.players.length||new Set(state.seatOrder).size!==state.players.length||state.seatOrder.some(i=>!Number.isInteger(i)||i<0||i>=state.players.length))state.seatOrder=state.players.map((_,i)=>i);if(state.direction!==-1)state.direction=1}
function renderDirection(){const b=$('direction');b.textContent=state.direction===1?'↻ Clockwise':'↺ Anticlockwise';b.setAttribute('aria-label','Turn direction: '+(state.direction===1?'clockwise':'anticlockwise')+'. Click to reverse.');b.disabled=state.ended;document.querySelector('.felt').dataset.direction=state.direction;updateSoundButton()}
function updateSoundButton(){const b=document.getElementById('sound-toggle');b.textContent=soundsEnabled?'Sound on ♪':'Sound off ♩';b.setAttribute('aria-pressed',String(soundsEnabled))}
function unlockAudio(){if(!soundsEnabled)return;try{if(!audioContext){audioContext=new (window.AudioContext||window.webkitAudioContext)();masterGain=audioContext.createGain();masterGain.gain.value=.18;const compressor=audioContext.createDynamicsCompressor();masterGain.connect(compressor);compressor.connect(audioContext.destination)}if(audioContext.state==='suspended')audioContext.resume().catch(()=>{})}catch{}}
function tone(freq,at,duration,volume=.25,type='sine',endFreq){if(!soundsEnabled||!audioContext||audioContext.state!=='running')return;const start=audioContext.currentTime+at,o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(freq,start);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,start+duration);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(volume,start+.012);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g);g.connect(masterGain);o.start(start);o.stop(start+duration+.02)}
// A quiet shared room gives the mallets and impacts a natural tail.
let soundRoom;
function roomBus(){
 if(soundRoom)return soundRoom;
 const convolver=audioContext.createConvolver(),wet=audioContext.createGain();
 const length=Math.floor(audioContext.sampleRate*.65),impulse=audioContext.createBuffer(2,length,audioContext.sampleRate);
 for(let c=0;c<2;c++){const data=impulse.getChannelData(c);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,3)*.45}
 convolver.buffer=impulse;wet.gain.value=.16;convolver.connect(wet);wet.connect(masterGain);soundRoom=convolver;return convolver;
}
function mallet(freq,at,duration,level=.28){
 const start=audioContext.currentTime+at;
 // Soft fundamental, bell-like overtones, and a brief wooden attack.
 [[1,1],[2.76,.19],[5.4,.035]].forEach(([ratio,weight])=>{
 const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
 oscillator.frequency.value=freq*ratio;
 gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(level*weight,start+.006);
 gain.gain.exponentialRampToValueAtTime(.0001,start+duration/(ratio===1?1:1.7));
 oscillator.connect(gain);gain.connect(masterGain);gain.connect(roomBus());
 oscillator.start(start);oscillator.stop(start+duration+.03);
 oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
 });
}
function brushedImpact(at,duration,level=.22,frequency=800){
 const start=audioContext.currentTime+at,source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
 const buffer=audioContext.createBuffer(1,Math.ceil(audioContext.sampleRate*duration),audioContext.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);
 source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(frequency,start);filter.frequency.exponentialRampToValueAtTime(180,start+duration);
 gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(level,start+.009);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
 source.connect(filter);filter.connect(gain);gain.connect(masterGain);gain.connect(roomBus());source.start(start);source.stop(start+duration+.02);
 source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};
}
// Neon arcade UI: rounded synth plucks, a subtle detuned layer and short echoes.
// Keep cues brief so rapid button presses never turn into a wall of sound.
let lastUiCue=-Infinity;
function neonNote(freq,at=0,duration=.16,level=.25){
 const start=audioContext.currentTime+at;
 [[0,'triangle',1],[7,'sawtooth',.12]].forEach(([detune,type,weight])=>{
 const oscillator=audioContext.createOscillator(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
 oscillator.type=type;oscillator.frequency.value=freq*Math.pow(2,detune/1200);
 filter.type='lowpass';filter.frequency.setValueAtTime(Math.min(freq*5,6000),start);filter.frequency.exponentialRampToValueAtTime(Math.max(350,freq*1.2),start+duration);
 gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(level*weight,start+.005);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
 oscillator.connect(filter);filter.connect(gain);gain.connect(masterGain);gain.connect(roomBus());oscillator.start(start);oscillator.stop(start+duration+.02);
 oscillator.onended=()=>{oscillator.disconnect();filter.disconnect();gain.disconnect()};
 });
}
function arcadeCue(kind){
 unlockAudio();if(!soundsEnabled||!audioContext||audioContext.state!=='running')return;
 const now=audioContext.currentTime;if(now-lastUiCue<.035)return;lastUiCue=now;
 const patterns={
 tap:[784],add:[659,988,1319],remove:[660,440],up:[880,1175],down:[784,587],
 choose:[784,988],open:[523,784],close:[784,523],toggle:[740,988],
 start:[523,659,784,1047],download:[784,988,1175],undo:[988,784,659],
 pass:[659,523],draw:[587,880],error:[294,277],seat:[698,880]
 };
 const notes=patterns[kind]||patterns.tap;
 notes.forEach((f,i)=>neonNote(f,i*.052,kind==='start'?.23:.14,kind==='tap'?.18:.25));
 if(['add','start','download'].includes(kind))neonNote(notes.at(-1),notes.length*.052+.055,.17,.065);
}
// One delegated listener covers dynamic buttons and keyboard activation too.
// Internal .click() forwarding is ignored so one press has one UI cue.
document.addEventListener('click',event=>{
 if(!event.isTrusted)return;
 const button=event.target.closest('button');if(!button||button.disabled||button.getAttribute('aria-disabled')==='true')return;
 const id=button.id;
 if(['sound-toggle','welcome-sound','add-player'].includes(id))return;
 let cue='tap';
 if(button.hasAttribute('data-remove-player'))cue='remove';
 else if(button.hasAttribute('data-seat'))cue='seat';
 else if(button.hasAttribute('data-fraction')||button.hasAttribute('data-quick-bet')||button.hasAttribute('data-detail-tab'))cue='choose';
 else if(button.hasAttribute('data-resume')||['welcome-resume','welcome-new','reset'].includes(id)||(button.type==='submit'&&button.form))cue='start';
 else if(['show-balances','show-history','digital-rules-button'].includes(id))cue='open';
 else if(['close-details','game-menu','setup-menu'].includes(id))cue='close';
 else if(['direction','motion-toggle','match-double'].includes(id))cue='toggle';
 else if(id==='bet-up')cue='up';else if(id==='bet-down')cue='down';
 else if(id==='export')cue='download';else if(id==='undo')cue='undo';
 else if(['digital-pass','table-pass'].includes(id))cue='pass';
 else if(id==='digital-primary')cue='draw';
 arcadeCue(cue);
},true);
document.addEventListener('change',event=>{
 if(event.isTrusted&&event.target.matches('select,input[type="radio"]'))arcadeCue('choose');
});
document.addEventListener('keydown',event=>{
 if(event.target.id==='table-bet'&&['ArrowUp','ArrowDown'].includes(event.key))arcadeCue(event.key==='ArrowUp'?'up':'down');
});
function sound(kind){
 unlockAudio();if(!soundsEnabled||!audioContext||audioContext.state!=='running')return;
 if(kind==='win'||kind==='full'){
 const full=kind==='full';
 brushedImpact(0,.12,.12,1900);
 (full?[392,493.88,587.33,783.99,987.77,1174.66]:[587.33,783.99,987.77]).forEach((f,i)=>mallet(f,i*(full?.105:.09),full?1.05:.65,full?.32:.27));
 if(full){[196,293.66,392].forEach(f=>tone(f,.38,1.1,.13,'sine'));[1567.98,1174.66,1975.53].forEach((f,i)=>mallet(f,.8+i*.14,.65,.08))}
 }else if(['loss','match','full-loss','full-match'].includes(kind)){
 const full=kind.startsWith('full-'),match=kind.endsWith('match');
 // Muted felt impact and a short descending minor phrase, never a harsh buzzer.
 brushedImpact(0,full?.48:.23,full?.52:.30,full?1100:700);
 tone(full?120:160,0,full?.65:.3,full?.48:.3,'sine',full?48:85);
 (match?[349.23,311.13,233.08]:[311.13,233.08]).forEach((f,i)=>mallet(f,.035+i*.14,full?.8:.45,.19));
 if(full){brushedImpact(.23,.55,.22,550);mallet(155.56,.43,.9,.23);tone(77.78,.3,.85,.18)}
 }else if(kind==='ante'){[440,660,880].forEach((f,i)=>mallet(f,i*.055,.25,.12))}
 else{arcadeCue(kind==='tap'?'tap':kind==='pass'?'pass':'choose')}
}
document.addEventListener('pointerdown',unlockAudio,{passive:true});document.addEventListener('keydown',unlockAudio);
document.getElementById('sound-toggle').onclick=()=>{soundsEnabled=!soundsEnabled;try{localStorage.setItem('inbetween-sound',soundsEnabled?'on':'off')}catch{}if(masterGain&&audioContext)masterGain.gain.setTargetAtTime(soundsEnabled?.18:0,audioContext.currentTime,.02);updateSoundButton();if(soundsEnabled)arcadeCue('toggle')};
document.getElementById('direction').onclick=()=>{if(!state||state.ended)return;state.direction*=-1;save();render();$('seating-status').textContent='Direction changed. '+state.players[state.turn]+' keeps the current turn.'};
function moveSeat(player,target){const from=state.seatOrder.indexOf(player);if(from===target)return;state.seatOrder.splice(from,1);state.seatOrder.splice(target,0,player);save();render();arcadeCue('seat');$('seating-status').textContent=state.players[player]+' moved to seat '+(target+1)+'. Turn order now follows the new seating.'}
function bindSeats(){document.querySelectorAll('[data-seat]').forEach(b=>{const player=Number(b.dataset.seat);let drag=null,suppressClick=false;
 b.onclick=()=>{if(suppressClick){suppressClick=false;return}if(state.ended)return;if(state.mode==='digital'){$('seating-status').textContent='The next turn starts automatically after this hand. Dragging still changes seat order.';return}state.turn=player;save();render()};
 b.onkeydown=e=>{if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();moveSeat(player,(state.seatOrder.indexOf(player)+(e.key==='ArrowRight'?1:-1)+state.players.length)%state.players.length);document.querySelector('[data-seat="'+player+'"]').focus()}};
 b.onpointerdown=e=>{if(state.ended||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,target:state.seatOrder.indexOf(player)};b.setPointerCapture(e.pointerId)};
 b.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7&&!drag.moved)return;drag.moved=true;const r=$('table-scene').getBoundingClientRect(),nx=(e.clientX-r.left-r.width/2)/(r.width*.36),ny=(e.clientY-r.top-r.height/2)/(r.height*(state.mode==='digital'?.40:.30)),angle=(Math.atan2(ny,nx)+Math.PI/2+Math.PI*2)%(Math.PI*2);drag.target=Math.round(angle/(Math.PI*2)*state.players.length)%state.players.length;b.classList.add('dragging');b.style.left=Math.max(4,Math.min(96,(e.clientX-r.left)/r.width*100))+'%';b.style.top=Math.max(4,Math.min(96,(e.clientY-r.top)/r.height*100))+'%';document.querySelectorAll('[data-seat]').forEach(s=>s.classList.toggle('drop-target',state.seatOrder.indexOf(Number(s.dataset.seat))===drag.target&&s!==b));};
 b.onpointerup=e=>{if(!drag)return;const d=drag;drag=null;if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);if(d.moved){suppressClick=true;e.preventDefault();const from=state.seatOrder.indexOf(player);if(from===d.target)render();else moveSeat(player,d.target)}};
 b.onpointercancel=()=>{drag=null;suppressClick=true;render()};
})}
function clearCelebration(){clearTimeout(celebrationTimer);const c=document.getElementById('celebration');if(c){c.innerHTML='';c.className=''}document.querySelectorAll('.winner-seat,.loser-seat').forEach(b=>b.classList.remove('winner-seat','loser-seat'))}
function playFeedback(e,potBefore){if(state.mode==='digital'&&['loss','match'].includes(e.type)){playLossFeedback(e,potBefore);return}if(e.type!=='win'){sound(['loss','match'].includes(e.type)&&e.bet===potBefore?'full-'+e.type:e.type);return}const full=e.bet===potBefore;const c=$('celebration'),winner=state.players[e.player];c.className=full?'celebrate-full':'celebrate-small';c.innerHTML=`<div class="win-banner"><span>${full?'✦ FULL POT WIN ✦':'✧ NICE WIN'}</span><strong>${esc(winner)}</strong><b>+${money(e.bet)}</b></div>`+(full?Array.from({length:38},(_,i)=>`<i class="confetti" style="--x:${(i*41)%100}%;--delay:${(i%7)*.065}s;--color:${['#ecd58a','#b7d39b','#fff4c8','#8ac7ad'][i%4]};--rotate:${i*47}deg"></i>`).join(''):'');document.querySelector('[data-seat="'+e.player+'"]').classList.add('winner-seat');sound(full?'full':'win');celebrationTimer=setTimeout(clearCelebration,full?3500:1700)}

function playLossFeedback(e,potBefore){
 clearCelebration();const full=e.bet===potBefore,c=$('celebration'),amount=-e.deltas[e.player];
 c.className=full?'loss-full':'loss-small';
 c.innerHTML='<div class="loss-ripple"></div><div class="loss-banner"><span>'+(e.type==='match'?(amount===e.bet*2?'MATCH · DOUBLE PAYMENT':'MATCH · BET PAID'):full?'FULL-POT BET LOST':'OUTSIDE THE CARDS')+'</span><strong>'+esc(state.players[e.player])+'</strong><b>−'+money(amount)+'</b><small>Added to the pot'+(full&&e.type==='match'?' · Full-pot bet':'')+'</small></div>'+(full?Array.from({length:12},(_,i)=>'<i class="loss-fragment" style="--angle:'+i*30+'deg;--travel:'+(65+i%3*20)+'px"></i>').join(''):'');
 document.querySelector('[data-seat="'+e.player+'"]').classList.add('loser-seat');
 sound(full?'full-'+e.type:e.type);
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

