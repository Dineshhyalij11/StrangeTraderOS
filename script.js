
const sessions={
tokyo:{tz:'Asia/Tokyo',open:9,close:18},
london:{tz:'Europe/London',open:8,close:17},
newyork:{tz:'America/New_York',open:8,close:17}
};

function update(){
const now=new Date();
document.getElementById('utc').textContent='UTC: '+now.toUTCString().split(' ')[4];
document.getElementById('date').textContent=now.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});

for(const [id,s] of Object.entries(sessions)){
const fmt=new Intl.DateTimeFormat('en-GB',{
timeZone:s.tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
const parts=fmt.formatToParts(now);
const h=+parts.find(x=>x.type==='hour').value;
const m=parts.find(x=>x.type==='minute').value;
const sec=parts.find(x=>x.type==='second').value;
document.getElementById(id).textContent=`${String(h).padStart(2,'0')}:${m}:${sec}`;

const st=document.getElementById(id+'Status');
if(h>=s.open && h<s.close){
st.textContent='● OPEN';
st.className='status open';
}else{
st.textContent='● CLOSED';
st.className='status closed';
}
}
}
update();
setInterval(update,1000);
