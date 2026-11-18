var KEY="mm_user", HKEY="mm_hotels", editI=-1, hereHotel="";
var HERE_BASES=["https://photography-word-essence-knowledge.trycloudflare.com","http://186.246.3.44"];
function hereFetch(extra){
  var i=0;
  function one(){
    if(i>=HERE_BASES.length) return Promise.reject(new Error("here"));
    var extraQ = extra ? ("?" + String(extra).replace(/^[?&]/, "")) : "";
    var url=HERE_BASES[i++]+"/here"+extraQ;
    var ctrl=typeof AbortController!=="undefined"?new AbortController():null;
    var t=ctrl?setTimeout(function(){ try{ctrl.abort();}catch(e){} }, 8000):null;
    return fetch(url,{cache:"no-store",signal:ctrl?ctrl.signal:undefined}).then(function(r){
      if(t) clearTimeout(t);
      if(!r.ok) throw new Error("bad");
      return r.json();
    }).catch(function(){ if(t) clearTimeout(t); return one(); });
  }
  return one();
}
var PHOTOS=["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=60"];
var KNOWN=[["екатеринбург","Екатеринбург"],["новосибирск","Новосибирск"],["барнаул","Барнаул"],["бийск","Бийск"],["новоалтайск","Новоалтайск"],["омск","Омск"],["перм","Пермь"],["кунгур","Кунгур"],["москв","Москва"],["петербург","Санкт-Петербург"],["с-петербург","Санкт-Петербург"],["волгоград","Волгоград"],["саратов","Саратов"],["владимир","Владимир"],["муром","Муром"],["коломн","Коломна"],["мурманск","Мурманск"],["северодвинск","Северодвинск"],["йошкар","Йошкар-Ола"],["мамадыш","Мамадыш"],["сызрань","Сызрань"],["барабинск","Барабинск"],["тюкалинск","Тюкалинск"],["очер","Очер"],["тейково","Тейково"],["шахты","Шахты"],["дивеево","Дивеево"],["посад","Сергиев Посад"],["плесецк","Плесецк"],["мирный","Мирный"],["знаменск","Знаменск"],["нижняя тура","Нижняя Тура"],["вязники","Вязники"],["кугеси","Кугеси"],["ярослав","Ярославль"],["исаково","Исаково"],["воротынец","Воротынец"],["дзержин","Дзержинск"],["дружинино","Дружинино"],["менделеев","Менделеевск"],["татарстан","Татарстан"]];
function norm(s){return String(s||"").trim().toLowerCase().replace(/ё/g,"е");}
function cityOf(h){
if(h.c) return h.c;
var t=norm(h.n+" "+(h.a||""));
for(var i=0;i<KNOWN.length;i++) if(t.indexOf(KNOWN[i][0])>=0) return KNOWN[i][1];
var m=String(h.n||"").match(/\(([^)]+)\)/);
if(m) return m[1].replace(/обл\.?/i,"").trim();
return "Другие";
}
function hotels(){
try{var s=localStorage.getItem(HKEY); if(s) return JSON.parse(s);}catch(e){}
return (window.HOTELS||[]).slice();
}
function setHotels(arr){ window.HOTELS=arr; try{localStorage.setItem(HKEY, JSON.stringify(arr));}catch(e){} }
function user(){ try{return JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){return null;} }
function enter(){
var l=norm(document.getElementById("login").value), p=String(document.getElementById("pass").value||"").trim();
var u=(window.HOTEL_USERS||[]).find(function(x){return norm(x.login)===l && String(x.pass)===p;});
if(!u){document.getElementById("err").textContent="Неверный логин или пароль"; return;}
localStorage.setItem(KEY, JSON.stringify({login:u.login, admin:!!u.admin, name:u.name||u.login}));
showApp();
}
function out(){ localStorage.removeItem(KEY); location.reload(); }
function fillCities(){
var sel=document.getElementById("city"), cur=sel.value, set={};
hotels().forEach(function(h){ set[cityOf(h)]=1; });
var names=Object.keys(set).sort(function(a,b){return a.localeCompare(b,"ru");});
sel.innerHTML="<option value=''>Все города</option>"+names.map(function(n){return "<option>"+n+"</option>";}).join("");
if(cur) sel.value=cur;
}
async function loadHere(){
  var el=document.getElementById("hereLine"); if(!el) return;
  try{
    var j=await hereFetch("");
    el.innerHTML="<a href='where.html' style='color:#7ec8ff'>Кто где сегодня</a> · на местах "+((j.people||[]).length);
  }catch(e){}
}
async function imHere(){
  var u=user(); if(!u) return;
  var h=hereHotel; if(!h) return;
  try{
    await hereFetch("action=set&login="+encodeURIComponent(u.login)+"&name="+encodeURIComponent(u.name)+"&hotel="+encodeURIComponent(h.n)+"&city="+encodeURIComponent(cityOf(h)));
    loadHere();
    fillHereIn(h);
    alert("Отмечены: "+h.n);
  }catch(e){alert("Не удалось отметить");}
}
function showApp(){
var u=user(); if(!u) return;
document.getElementById("gate").style.display="none";
document.getElementById("app").style.display="block";
document.getElementById("who").textContent=u.name+(u.admin?" · админ":"");
document.getElementById("addBtn").style.display=u.admin?"inline-block":"none";
fillCities(); draw();
}
function rub(n){return Number(n||0).toLocaleString("ru-RU")+" ₽";}
function phonesHtml(h){
  var parts=[];
  if(h.t) parts.push("<a href='tel:"+h.t+"'>"+h.t+"</a>");
  (h.phones||[]).forEach(function(p){
    if(p && p.number) parts.push((p.label?p.label+": ":"")+"<a href='tel:"+p.number+"'>"+p.number+"</a>");
  });
  return parts.length?parts.join("<br>"):"не указан";
}
function fieldsHtml(h){
  var html="";
  (h.fields||[]).forEach(function(f){
    if(f && f.label) html+="<div class='field-line'><b>"+f.label+"</b><span>"+(f.value||"")+"</span></div>";
  });
  return html;
}
function openHotel(i){
var h=hotels()[i]; if(!h) return;
function put(id, text, html){
  var el=document.getElementById(id); if(!el) return;
  if(html) el.innerHTML=text; else el.textContent=text;
}
put("hn", h.n);
put("hc", "Город: "+cityOf(h));
put("ha", "Адрес: "+(h.a||"не указан"));
put("ht", phonesHtml(h), true);
put("hfields", fieldsHtml(h), true);
put("hrep", rub(h.p));
put("hstay", rub(h.s||h.p));
var hp=document.getElementById("hp"); if(hp) hp.src=h.img||PHOTOS[0];
var eo=document.getElementById("editOpen");
var adm=user()&&user().admin;
if(eo){
  eo.style.display=adm?"inline-block":"none";
  eo.onclick=function(){ document.getElementById("m").classList.remove("show"); editHotel(i); };
}
hereHotel=h;
put("hereIn", "Кто здесь: загрузка…");
window._openedAt=Date.now();
var modal=document.getElementById("m");
if(modal) modal.classList.add("show");
fillHereIn(h);
}
async function fillHereIn(h){
  var el=document.getElementById("hereIn"); if(!el||!h) return;
  try{
    var j=await hereFetch("");
    var want=norm(h.n);
    var names=(j.people||[]).filter(function(p){return norm(p.hotel)===want || norm(p.hotel).indexOf(want)>=0 || want.indexOf(norm(p.hotel))>=0;}).map(function(p){return p.name||p.login;});
    el.textContent=names.length?("Сегодня здесь: "+names.join(", ")): "Сегодня здесь никто не отметился";
  }catch(e){el.textContent="";}
}
function addPhoneRow(label, number){
  var box=document.getElementById("extraPhones");
  var row=document.createElement("div");
  row.className="extra-row";
  row.innerHTML='<div><label class="l" style="margin-top:0">Подпись</label><input class="pl" value="'+(label||"")+'"></div><div><label class="l" style="margin-top:0">Номер</label><input class="pn" value="'+(number||"")+'"></div><button type="button" class="btn" onclick="this.parentNode.remove()">×</button>';
  box.appendChild(row);
}
function addCustomRow(label, value){
  var box=document.getElementById("customFields");
  var row=document.createElement("div");
  row.className="extra-row";
  row.innerHTML='<div><label class="l" style="margin-top:0">Название поля</label><input class="fl" value="'+(label||"")+'"></div><div><label class="l" style="margin-top:0">Значение</label><input class="fv" value="'+(value||"")+'"></div><button type="button" class="btn" onclick="this.parentNode.remove()">×</button>';
  box.appendChild(row);
}
function editHotel(i){
if(!(user()&&user().admin)) return;
editI=i; var h=i>=0?hotels()[i]:{n:"",a:"",t:"",p:"",s:"",img:"",c:"",phones:[],fields:[]};
document.getElementById("edTitle").textContent=i>=0?"Правка":"Новая гостиница";
document.getElementById("en").value=h.n||""; document.getElementById("ec").value=h.c||cityOf(h);
document.getElementById("ea").value=h.a||""; document.getElementById("et").value=h.t||"";
document.getElementById("ep").value=h.p||""; document.getElementById("es").value=h.s||h.p||""; document.getElementById("ei").value=h.img||"";
document.getElementById("extraPhones").innerHTML="";
(h.phones||[]).forEach(function(p){ addPhoneRow(p.label, p.number); });
document.getElementById("customFields").innerHTML="";
(h.fields||[]).forEach(function(f){ addCustomRow(f.label, f.value); });
document.getElementById("ed").classList.add("show");
}
function collectPhones(){
  var out=[];
  [].forEach.call(document.querySelectorAll("#extraPhones .extra-row"), function(row){
    var lab=row.querySelector(".pl").value.trim();
    var num=row.querySelector(".pn").value.trim();
    if(num) out.push({label:lab, number:num});
  });
  return out;
}
function collectFields(){
  var out=[];
  [].forEach.call(document.querySelectorAll("#customFields .extra-row"), function(row){
    var lab=row.querySelector(".fl").value.trim();
    var val=row.querySelector(".fv").value.trim();
    if(lab) out.push({label:lab, value:val});
  });
  return out;
}
function saveHotel(){
var arr=hotels();
var row={n:document.getElementById("en").value.trim(), c:document.getElementById("ec").value.trim(), a:document.getElementById("ea").value.trim(), t:document.getElementById("et").value.trim(), p:+document.getElementById("ep").value||0, s:+document.getElementById("es").value||0, img:document.getElementById("ei").value.trim(), phones:collectPhones(), fields:collectFields()};
if(editI>=0) arr[editI]=Object.assign({}, arr[editI], row); else arr.push(row);
setHotels(arr); document.getElementById("ed").classList.remove("show"); fillCities(); draw();
}
function draw(){
var q=norm(document.getElementById("q").value), city=document.getElementById("city").value;
var adm=user()&&user().admin, html="", rows=hotels();
rows.forEach(function(h,i){
var c=cityOf(h);
if(city && c!==city) return;
if(q && norm(h.n+" "+(h.a||"")+" "+c).indexOf(q)<0) return;
html+="<tr><td><button class='name' type='button' data-i='"+i+"'>"+h.n+"</button></td><td>"+c+"</td><td>"+(h.a||"—")+"</td><td class='price'>"+Number(h.p||0).toLocaleString("ru-RU")+"</td><td>"+(adm?"<button class='btn' type='button' onclick='editHotel("+i+")'>Изменить</button>":"")+"</td></tr>";
});
document.getElementById("tb").innerHTML=html||"<tr><td colspan='5'>Нет совпадений</td></tr>";
[].forEach.call(document.querySelectorAll("#tb .name"), function(btn){
  var open=function(ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); }
    openHotel(+btn.getAttribute("data-i"));
  };
  btn.addEventListener("click", open);
});
}

document.getElementById("q").oninput=draw;
document.getElementById("city").onchange=draw;
if(user()) showApp();
loadHere();
setInterval(loadHere, 30000);
