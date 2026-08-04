const CONTRACT='0xe9Bc5C6A86caA44fD7b469bf3cc7c563E4F77777';
const $=id=>document.getElementById(id);
const toast=msg=>{const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(window.__t);window.__t=setTimeout(()=>el.classList.remove('show'),2200)};
addEventListener('scroll',()=>{const max=document.documentElement.scrollHeight-innerHeight;const y=scrollY;$('progress').style.width=`${max?y/max*100:0}%`;$('nav').classList.toggle('visible',y>220)});
$('copyContract').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(CONTRACT);toast('Contract copied')}catch{toast(CONTRACT)}});

const observer=new IntersectionObserver(entries=>entries.forEach(e=>e.isIntersecting&&e.target.classList.add('visible')),{threshold:.14});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
let journeyTimer;function playJourney(){clearInterval(journeyTimer);const steps=[...document.querySelectorAll('.journey-step')];let i=0;steps.forEach(s=>s.classList.remove('active'));steps[0].classList.add('active');const coin=$('travelCoin');coin.style.left='10%';journeyTimer=setInterval(()=>{i++;if(i>=steps.length){clearInterval(journeyTimer);return}steps[i].classList.add('active');coin.style.left=`${10+i*26}%`},950)}
$('replayJourney').addEventListener('click',playJourney);const jObs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){playJourney();jObs.disconnect()}}),{threshold:.5});jObs.observe($('journeyMachine'));
const video=document.querySelector('.video-card video');$('toggleVideo').addEventListener('click',()=>{if(video.paused){video.play();$('toggleVideo').textContent='Pause adventure ❚❚'}else{video.pause();$('toggleVideo').textContent='Play MAX’s adventure ▶'}});
function fmtBNB(v){return `${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:5})} BNB`}
async function loadDashboard(){const status=$('statusText');$('statusDot').parentElement.classList.remove('connected');status.textContent='Connecting to BNB Chain';$('refresh').disabled=true;try{const r=await fetch('/api/donations');if(!r.ok)throw new Error(`API ${r.status}`);const d=await r.json();if(!d.ok)throw new Error(d.error||'Unavailable');$('totalDelivered').textContent=fmtBNB(d.totalDeliveredBNB);$('pending').textContent=fmtBNB(d.pendingBNB);$('transferCount').textContent=Number(d.transferCount||0).toLocaleString();$('deliveredNote').textContent=d.historyConfigured?'Confirmed processor → recipient transfers':'Add BSCSCAN_API_KEY for history';$('latestTransfer').textContent=d.latestTimestamp?`Latest ${new Date(d.latestTimestamp*1000).toLocaleString()}`:'No transfer returned';status.textContent='Live BNB Chain data';$('statusDot').parentElement.classList.add('connected');const txs=d.transactions||[];$('transactions').innerHTML=txs.length?txs.slice(0,5).map(t=>`<div class="tx"><strong>${fmtBNB(t.valueBNB)}</strong><time>${new Date(t.timestamp*1000).toLocaleString()}</time><a href="https://bscscan.com/tx/${t.hash}" target="_blank" rel="noopener">Proof ↗</a></div>`).join(''):'<p class="empty">Live processor data connected. Verified transfer history appears after adding a free BscScan API key in Vercel.</p>'}catch(e){status.textContent='Preview mode — connect after Vercel deployment';$('transactions').innerHTML='<p class="empty">The design is ready. Deploy this folder to Vercel and configure the optional BscScan API key for donation history.</p>';console.warn(e)}finally{$('refresh').disabled=false}}
$('refresh').addEventListener('click',loadDashboard);loadDashboard();


function compactMoney(value){
  const n=Number(value);
  if(!Number.isFinite(n)) return '—';
  return '$'+Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:2}).format(n);
}
function formatPrice(value){
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0) return '—';
  if(n>=1) return '$'+n.toLocaleString(undefined,{maximumFractionDigits:4});
  return '$'+n.toPrecision(4);
}
async function loadMarket(){
  const token=CONTRACT.toLowerCase();
  try{
    const r=await fetch(`https://api.dexscreener.com/token-pairs/v1/bsc/${token}`);
    if(!r.ok) throw new Error(`DEX API ${r.status}`);
    const pairs=await r.json();
    if(!Array.isArray(pairs)||!pairs.length) throw new Error('No market found');
    const pair=pairs.sort((a,b)=>Number(b.liquidity?.usd||0)-Number(a.liquidity?.usd||0))[0];
    const pairAddress=pair.pairAddress;
    const pairUrl=`https://dexscreener.com/bsc/${pairAddress}`;
    $('dexChart').src=`${pairUrl}?embed=1&theme=dark&trades=0&info=0`;
    $('openChart').href=pairUrl;
    $('marketPrice').textContent=formatPrice(pair.priceUsd);
    $('marketCap').textContent=compactMoney(pair.marketCap||pair.fdv);
    $('marketLiquidity').textContent=compactMoney(pair.liquidity?.usd);
    $('marketVolume').textContent=compactMoney(pair.volume?.h24);
    const change=Number(pair.priceChange?.h24);
    $('priceChange').textContent=Number.isFinite(change)?`${change>=0?'+':''}${change.toFixed(2)}% in 24h`:'Live from DEX Screener';
    $('marketDex').textContent=`${pair.dexId||'DEX'} · 24h`;
    $('chartStatus').textContent=`Live primary pool · ${pair.dexId||'BNB Chain'}`;
  }catch(err){
    $('chartStatus').textContent='Live chart loaded by token address';
    $('priceChange').textContent='Open full chart for current data';
    console.warn('Market data:',err);
  }
}
loadMarket();
setInterval(loadMarket,60000);
