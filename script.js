const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>"&#"+c.charCodeAt(0)+";");
const peso=n=>"₱"+n.toLocaleString();
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const today=iso(new Date());
const hr=h=>(h%12||12)+(h<12?" AM":" PM");
const span=b=>hr(b.start)+" – "+hr(b.start+b.dur);
const RATE={"Resident":100,"Non-resident":250,"Organization":150};
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

// ---------- data ----------
const seed=()=>[["Wahid Mustafa","Basketball Training",14,3],["Yumi Ussher","Volleyball Practice",18,2],["Stephen Villegas","Zumba Session",7,3],["Cedrick Bravo","Dance Practice",11,2]]
  .map((r,i)=>({id:i+1,user:"seed",name:r[0],contact:"09170000000",res:"Resident",court:"Covered Court",date:today,start:r[2],dur:r[3],purpose:r[1],notes:"",fee:r[3]*100,status:i==1?"Pending":"Approved"}));
let users=store.get("bdb_users",[{name:"Rafael, Julian S.",email:"resident@bdb.ph",pw:"1234",admin:false},{name:"Barangay Admin",email:"admin@bdb.ph",pw:"admin",admin:true}]);
let bookings=store.get("bdb_bookings",seed());
let me=null,mode="login";
const save=()=>{store.set("bdb_users",users);store.set("bdb_bookings",bookings)};
const clash=(court,date,s,d)=>bookings.some(b=>b.court==court&&b.date==date&&b.status!="Rejected"&&s<b.start+b.dur&&b.start<s+d);

// ---------- auth ----------
function authMode(m){mode=m;const s=m=="signup";$("#at").textContent=s?"Sign up":"Log in";$("#aB").textContent=s?"Sign up":"Log in";$("#aN").classList.toggle("hide",!s);$("#aS").textContent=s?"Have an account? Log in":"No account yet? Sign up";$("#aM").textContent=""}
$("#aS").onclick=()=>authMode(mode=="login"?"signup":"login");
$("#aB").onclick=()=>{
  const n=$("#aN").value.trim(),e=$("#aE").value.trim().toLowerCase(),p=$("#aP").value;
  if(!e||!p||(mode=="signup"&&!n))return $("#aM").textContent="Please fill in all fields.";
  if(mode=="signup"){
    if(users.some(u=>u.email==e))return $("#aM").textContent="That email is already registered.";
    users.push({name:n,email:e,pw:p,admin:false});save();me=users[users.length-1];
  }else{
    me=users.find(u=>u.email==e&&u.pw==p);
    if(!me)return $("#aM").textContent="Wrong email or password.";
  }
  start();
};
function start(){
  $("#auth").classList.add("hide");$("#app").classList.remove("hide");
  $("#who").textContent=me.name+" · Log out";$("#navAdmin").classList.toggle("hide",!me.admin);
  $("#date").value=today;go("schedule");
}
$("#who").onclick=()=>{me=null;$("#app").classList.add("hide");$("#auth").classList.remove("hide");$("#aP").value="";authMode("login")};

// ---------- navigation ----------
function go(v){
  if(v=="admin"&&!me.admin)v="schedule";
  $$("main>section").forEach(s=>s.classList.toggle("hide",s.id!="v-"+v));
  $$("nav [data-v]").forEach(b=>b.classList.toggle("on",b.dataset.v==v));
  ({schedule,book:openForm,requests,admin})[v]();
}
$$("nav [data-v]").forEach(b=>b.onclick=()=>go(b.dataset.v));

// ---------- 1. daily schedule ----------
function schedule(){
  const d=$("#date").value||today;
  $("#slots").innerHTML=Array.from({length:16},(_,i)=>{
    const h=6+i,b=bookings.find(x=>x.court=="Covered Court"&&x.date==d&&x.status!="Rejected"&&h>=x.start&&h<x.start+x.dur);
    if(!b)return `<div class="slot"><button class="btn" onclick="reserve(${h})">Reserve</button><b>${hr(h)} – ${hr(h+1)}</b><small>Available</small></div>`;
    return b.status=="Approved"
      ?`<div class="slot taken"><b>${esc(b.name)}</b><small>${esc(b.purpose)}</small><small>${span(b)}</small></div>`
      :`<div class="slot taken"><b>RESERVED SLOT</b><small>${hr(h)} – ${hr(h+1)}</small></div>`;
  }).join("");
}
$("#date").onchange=schedule;
$("#todayBtn").onclick=()=>{$("#date").value=today;schedule()};
function reserve(h){go("book");$("#fD").value=$("#date").value;$("#fS").value=h;fee()}

// ---------- 2. booking form ----------
$("#fS").innerHTML=Array.from({length:16},(_,i)=>`<option value="${6+i}">${hr(6+i)}</option>`).join("");
$("#fH").innerHTML=Array.from({length:8},(_,i)=>`<option value="${i+1}">${i+1} hour${i?"s":""}</option>`).join("");
const res=()=>document.querySelector("[name=res]:checked").value;
const fee=()=>{$("#fFee").textContent=peso(RATE[res()]*$("#fH").value)};
function openForm(){
  $("#fN").value=me.name;$("#fE").textContent="";$("#fD").min=today;
  if(!$("#fD").value)$("#fD").value=$("#date").value||today;
  fee();
}
["#fH","#fR"].forEach(s=>$(s).onchange=fee);
$("#fX").onclick=()=>{$("#bf").reset();go("schedule")};
$("#bf").onsubmit=e=>{
  e.preventDefault();
  const court=$("#fCt").value,date=$("#fD").value,s=+$("#fS").value,d=+$("#fH").value;
  if(date<today)return $("#fE").textContent="Pick today or a later date.";
  if(s+d>22)return $("#fE").textContent="The facility closes at 10 PM. Shorten the duration or start earlier.";
  if(clash(court,date,s,d))return $("#fE").textContent="That time overlaps another reservation. Check the Daily Schedule for open slots.";
  bookings.push({id:Date.now(),user:me.email,name:$("#fN").value.trim(),contact:$("#fC").value,res:res(),court,date,start:s,dur:d,
    purpose:$("#fP").value.trim(),notes:$("#fNt").value.trim(),fee:RATE[res()]*d,status:me.admin?"Approved":"Pending"});
  save();$("#bf").reset();go(me.admin?"admin":"requests");
};

// ---------- 3. my requests ----------
function requests(){
  const mine=bookings.filter(b=>b.user==me.email);
  $("#reqT").innerHTML=mine.length?`<table><tr><th>Facility</th><th>Event Title</th><th>Date &amp; Time</th><th>Estimated Fee</th><th>Status</th><th></th></tr>`+
    mine.map(b=>`<tr><td>${esc(b.court)}</td><td>${esc(b.purpose)}</td><td>${b.date} (${span(b)})</td><td>${peso(b.fee)}</td><td class="st ${b.status}">${b.status}</td>
    <td>${b.status=="Pending"?`<button class="btn alt" onclick="cancel(${b.id})">Cancel</button>`:""}</td></tr>`).join("")+"</table>"
    :`<div class="empty">No requests yet. Choose Add New Request to book a facility.</div>`;
}
const cancel=id=>{bookings=bookings.filter(b=>b.id!=id);save();requests()};
$("#addReq").onclick=()=>go("book");

// ---------- 4. admin dashboard ----------
function admin(){
  const n=s=>bookings.filter(b=>b.status==s);
  const st=[["Pending Review",n("Pending").length],["Approved Events",n("Approved").length],
    ["Total Bookings Today",bookings.filter(b=>b.date==today&&b.status!="Rejected").length],
    ["Est. Fees Collected",peso(n("Approved").reduce((t,b)=>t+b.fee,0))]];
  $("#stats").innerHTML=st.map(x=>`<div class="stat"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("");
  $("#admT").innerHTML=`<table><tr><th>Applicant</th><th>Event</th><th>Date &amp; Time</th><th>Fee</th><th>Status</th><th>Action</th></tr>`+
    bookings.map(b=>`<tr><td>${esc(b.name)}<br><small>${esc(b.res)} · ${esc(b.contact)}</small></td><td>${esc(b.purpose)}</td><td>${b.date} (${span(b)})</td><td>${peso(b.fee)}</td>
    <td class="st ${b.status}">${b.status}</td><td>${b.status=="Pending"?`<button class="btn" onclick="review(${b.id},'Approved')">Approve</button> <button class="btn alt" onclick="review(${b.id},'Rejected')">Reject</button>`:""}</td></tr>`).join("")+"</table>";
}
const review=(id,s)=>{bookings.find(b=>b.id==id).status=s;save();admin()};
$("#addEv").onclick=()=>go("book");
