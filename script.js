const sessions={tokyo:{zone:'Asia/Tokyo',open:9,close:18},london:{zone:'Europe/London',open:8,close:17},newYork:{zone:'America/New_York',open:8,close:17}};
const pad=n=>String(n).padStart(2,'0');
function zt(z){const p=new Intl.DateTimeFormat('en-GB',{timeZone:z,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date());return{h:+p.find(x=>x.type==='hour').value,m:+p.find(x=>x.type==='minute').value,s:+p.find(x=>x.type==='second').value};}
function tick(){for(const[k,v]of Object.entries(sessions)){const t=zt(v.zone);document.getElementById(k+'Clock').textContent=`${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`;} } tick();setInterval(tick,1000);
