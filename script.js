// ===============================
// STRANGE TRADER OS v2
// ===============================

const sessions = {
  tokyo: {
    zone: "Asia/Tokyo",
    open: 9,
    close: 18
  },

  london: {
    zone: "Europe/London",
    open: 8,
    close: 17
  },

  newyork: {
    zone: "America/New_York",
    open: 8,
    close: 17
  }
};

function pad(n){
    return String(n).padStart(2,"0");
}

function getTime(zone){

    const now = new Date();

    const formatter = new Intl.DateTimeFormat("en-GB",{

        timeZone:zone,

        hour:"2-digit",

        minute:"2-digit",

        second:"2-digit",

        hour12:false

    });

    const parts = formatter.formatToParts(now);

    return{

        hour:Number(parts.find(p=>p.type==="hour").value),

        minute:Number(parts.find(p=>p.type==="minute").value),

        second:Number(parts.find(p=>p.type==="second").value)

    };

}

function updateClock(id,data){

    const t=getTime(data.zone);

    document.getElementById(id).textContent=

        `${pad(t.hour)}:${pad(t.minute)}:${pad(t.second)}`;

    const status=document.getElementById(id+"Status");

    const progress=document.getElementById(id+"Bar");

    const total=t.hour*60+t.minute;

    const open=data.open*60;

    const close=data.close*60;

    if(total>=open && total<close){

        status.textContent="🟢 OPEN";

        status.className="open";

        const percent=((total-open)/(close-open))*100;

        progress.style.width=percent+"%";

    }

    else{

        status.textContent="🔴 CLOSED";

        status.className="closed";

        progress.style.width="0%";

    }

}

function updateUTC(){

    const now=new Date();

    document.getElementById("utc").textContent=

        now.toUTCString().split(" ")[4];

}

function updateLocal(){

    const now=new Date();

    document.getElementById("local").textContent=

        now.toLocaleTimeString();

}

function updateDate(){

    const now=new Date();

    document.getElementById("date").textContent=

        now.toLocaleDateString(undefined,{

            weekday:"long",

            year:"numeric",

            month:"long",

            day:"numeric"

        });

}

function updateKillZone(){

    const london=getTime("Europe/London");

    const h=london.hour;

    const m=london.minute;

    const minutes=h*60+m;

    const zone=document.getElementById("killzone");

    if(minutes>=420 && minutes<600){

        zone.textContent="🟢 London Open Kill Zone";

    }

    else if(minutes>=720 && minutes<840){

        zone.textContent="🟡 New York Kill Zone";

    }

    else{

        zone.textContent="⚪ No Active Kill Zone";

    }

}

function update(){

    updateClock("tokyo",sessions.tokyo);

    updateClock("london",sessions.london);

    updateClock("newyork",sessions.newyork);

    updateUTC();

    updateLocal();

    updateDate();

    updateKillZone();

}

update();

setInterval(update,1000);
