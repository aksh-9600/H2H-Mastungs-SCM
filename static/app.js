// ===== Routing =====
const views = ['dashboard-content','customers-content','actions-content','analytics-content'];
const navIds = ['nav-dashboard','nav-customers','nav-actions','nav-analytics'];
const routes = {'/':{view:'dashboard-content',nav:'nav-dashboard',fn:fetchDashboardData},'/customers':{view:'customers-content',nav:'nav-customers',fn:fetchCustomersData},'/action-center':{view:'actions-content',nav:'nav-actions',fn:fetchActionsData},'/analytics':{view:'analytics-content',nav:'nav-analytics',fn:fetchAnalyticsData}};

function handleRoute(){
    const path=window.location.pathname;
    const route=routes[path]||routes['/'];
    views.forEach(v=>{const el=document.getElementById(v);if(el)el.classList.add('hidden');});
    navIds.forEach(n=>{const el=document.getElementById(n);if(el){el.classList.remove('bg-slate-800/50','text-white','border','border-slate-700/50');el.classList.add('text-slate-400');}});
    const viewEl=document.getElementById(route.view);if(viewEl)viewEl.classList.remove('hidden');
    const navEl=document.getElementById(route.nav);if(navEl){navEl.classList.add('bg-slate-800/50','text-white','border','border-slate-700/50');navEl.classList.remove('text-slate-400');}
    route.fn();
}

navIds.forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('click',e=>{e.preventDefault();const href=el.getAttribute('href');window.history.pushState({},'',href);handleRoute();});});
window.addEventListener('popstate',handleRoute);
handleRoute();

// ===== Search =====
const form=document.getElementById('nlq-form');
const nlqInput=document.getElementById('nlq-input');
const suggestionsContainer=document.getElementById('search-suggestions');
const suggestionsList=document.getElementById('suggestions-list');
const suggestions=["Top 10 Healthy Customers","Customers at Risk","Most Active Customers","Customers with High Complaints"];

function populateSuggestions(){if(!suggestionsList)return;suggestionsList.innerHTML='';suggestions.forEach(s=>{const li=document.createElement('li');li.className='px-4 py-2 hover:bg-slate-700 cursor-pointer transition-colors';li.innerHTML=`<div class="flex items-center gap-2"><svg class="w-4 h-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>${s}</div>`;li.addEventListener('click',()=>{nlqInput.value=s;suggestionsContainer.classList.add('hidden','opacity-0');form.dispatchEvent(new Event('submit',{cancelable:true}));});suggestionsList.appendChild(li);});}

if(nlqInput&&suggestionsContainer){populateSuggestions();nlqInput.addEventListener('focus',()=>{suggestionsContainer.classList.remove('hidden');setTimeout(()=>suggestionsContainer.classList.remove('opacity-0'),10);});document.addEventListener('click',e=>{if(!form.contains(e.target)){suggestionsContainer.classList.add('opacity-0');setTimeout(()=>suggestionsContainer.classList.add('hidden'),200);}});}

if(form){form.addEventListener('submit',async e=>{e.preventDefault();const input=nlqInput.value;if(!input.trim())return;if(window.location.pathname!=='/'){window.history.pushState({},'','/');handleRoute();}showLoader();try{const r=await fetch('/api/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:input})});const data=await r.json();renderDashboard(data);}catch(err){console.error(err);hideLoader();}});}

// ===== Loader =====
function showLoader(){const l=document.getElementById('loader');if(l){l.classList.remove('hidden');l.classList.add('flex');}const r=document.getElementById('results');if(r)r.classList.add('hidden');}
function hideLoader(){const l=document.getElementById('loader');if(l){l.classList.add('hidden');l.classList.remove('flex');}const r=document.getElementById('results');if(r)r.classList.remove('hidden');}

// ===== Dashboard =====
async function fetchDashboardData(){showLoader();try{const r=await fetch('/api/dashboard');const data=await r.json();renderDashboard(data.slice(0,20));}catch(e){console.error(e);hideLoader();}}

const fmt=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});

function renderDashboard(customers){
    const tb=document.getElementById('table-body');
    const ac=document.getElementById('action-cards-container');
    if(!tb||!ac)return;
    tb.innerHTML='';ac.innerHTML='';
    let actionCount=0;
    customers.forEach((c,i)=>{
        let rfHtml=`<span class="text-slate-500 text-sm">Optimal</span>`;
        if(c.top_risk_factors&&c.top_risk_factors.length>0&&c.health_score<70){rfHtml=c.top_risk_factors.map(rf=>`<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 mr-1 mb-1">${rf}</span>`).join('');}
        let scc='text-emerald-400 bg-emerald-400/10 ring-emerald-400/20',bc='bg-emerald-500';
        if(c.health_score<50){scc='text-rose-400 bg-rose-400/10 ring-rose-400/20';bc='bg-rose-500';}else if(c.health_score<70){scc='text-amber-400 bg-amber-400/10 ring-amber-400/20';bc='bg-amber-500';}
        const tr=document.createElement('tr');tr.className='hover:bg-slate-800/30 transition-colors group';
        tr.innerHTML=`<td class="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6"><div class="flex items-center"><div class="h-8 w-8 rounded-md bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700">${(c.customer_name||'U').charAt(0)}</div><div class="ml-4"><div class="font-medium text-slate-200">${c.customer_name||'Unknown'}</div><div class="text-xs text-slate-500">Last login: ${c.last_login_date||'N/A'}</div></div></div></td><td class="whitespace-nowrap px-3 py-4 text-sm"><div class="flex items-center gap-2"><span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${scc}">${c.health_score}</span><div class="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div class="h-full ${bc}" style="width:${c.health_score}%"></div></div></div></td><td class="px-3 py-4 text-sm text-slate-300 max-w-[200px]">${rfHtml}</td><td class="whitespace-nowrap px-3 py-4 text-sm"><div class="w-24 h-8 relative"><canvas id="chart-${i}"></canvas></div></td><td class="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-300">${fmt.format(c.contract_value)}</td>`;
        tb.appendChild(tr);
        setTimeout(()=>{const ctx=document.getElementById(`chart-${i}`);if(ctx&&c.sentiment_history){new Chart(ctx,{type:'line',data:{labels:['M1','M2','M3','M4','M5','M6'],datasets:[{data:c.sentiment_history,borderColor:c.health_score<50?'#f43f5e':(c.health_score<70?'#f59e0b':'#10b981'),borderWidth:1.5,tension:0.4,pointRadius:0,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false,min:0,max:100}},animation:false}});}},0);
        if(c.action_card&&actionCount<3){actionCount++;let cardCls,btnCls,icon;
            if(c.action_card.includes('Warning')){cardCls='border-rose-500/30 bg-rose-500/5';btnCls='bg-rose-500/20 text-rose-300 hover:bg-rose-500/30';icon=`<svg class="w-5 h-5 text-rose-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;}
            else if(c.action_card.includes('Engagement')){cardCls='border-amber-500/30 bg-amber-500/5';btnCls='bg-amber-500/20 text-amber-300 hover:bg-amber-500/30';icon=`<svg class="w-5 h-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>`;}
            else{cardCls='border-indigo-500/30 bg-indigo-500/5';btnCls='bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30';icon=`<svg class="w-5 h-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>`;}
            const card=document.createElement('div');card.className=`glass-panel rounded-xl p-4 border shadow-lg shadow-black/20 ${cardCls} flex flex-col justify-between transform transition-all hover:scale-[1.02]`;
            card.innerHTML=`<div class="flex items-start gap-3"><div class="p-2 rounded-lg bg-slate-900/50 border border-white/5">${icon}</div><div><h4 class="text-slate-100 font-medium text-sm">Proactive Suggestion</h4><p class="text-slate-400 text-xs mt-1 leading-relaxed">${c.action_card}</p></div></div><div class="mt-4 flex justify-end"><button class="px-3 py-1.5 rounded-md text-xs font-semibold ${btnCls} transition-colors">Execute Action</button></div>`;
            ac.appendChild(card);}
    });
    hideLoader();
}

// ===== Customers View =====
async function fetchCustomersData(){
    try{const r=await fetch('/api/customers');const data=await r.json();renderCustomers(data);}catch(e){console.error(e);}
}

function renderCustomers(customers){
    const tb=document.getElementById('customers-table-body');
    const sc=document.getElementById('customer-summary-cards');
    if(!tb)return;
    const total=customers.length;
    const critical=customers.filter(c=>c.health_score<50).length;
    const atRisk=customers.filter(c=>c.health_score>=50&&c.health_score<70).length;
    const healthy=customers.filter(c=>c.health_score>=70).length;
    if(sc){sc.innerHTML=`
        <div class="glass-panel rounded-xl p-4 border border-slate-700/50"><div class="text-xs text-slate-400 mb-1">Total Customers</div><div class="text-2xl font-bold text-white">${total}</div></div>
        <div class="glass-panel rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/5"><div class="text-xs text-emerald-400 mb-1">Healthy</div><div class="text-2xl font-bold text-emerald-400">${healthy}</div></div>
        <div class="glass-panel rounded-xl p-4 border border-amber-500/30 bg-amber-500/5"><div class="text-xs text-amber-400 mb-1">At Risk</div><div class="text-2xl font-bold text-amber-400">${atRisk}</div></div>
        <div class="glass-panel rounded-xl p-4 border border-rose-500/30 bg-rose-500/5"><div class="text-xs text-rose-400 mb-1">Critical</div><div class="text-2xl font-bold text-rose-400">${critical}</div></div>`;}
    tb.innerHTML='';
    customers.forEach(c=>{
        let scc='text-emerald-400 bg-emerald-400/10 ring-emerald-400/20';
        if(c.health_score<50)scc='text-rose-400 bg-rose-400/10 ring-rose-400/20';
        else if(c.health_score<70)scc='text-amber-400 bg-amber-400/10 ring-amber-400/20';
        const tr=document.createElement('tr');tr.className='hover:bg-slate-800/30 transition-colors';
        tr.innerHTML=`<td class="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6"><div class="flex items-center gap-3"><div class="h-7 w-7 rounded-md bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-bold border border-slate-700">${(c.customer_name||'U').charAt(0)}</div><span class="text-sm font-medium text-slate-200">${c.customer_name||'Unknown'}</span></div></td><td class="px-3 py-3 text-sm"><span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${scc}">${c.health_score}</span></td><td class="px-3 py-3 text-sm text-slate-300">${c.support_tickets||0}</td><td class="px-3 py-3 text-sm text-slate-300">${c.outages_experienced||0}</td><td class="px-3 py-3 text-sm text-slate-300">${c.login_frequency_days_per_month||0}</td><td class="px-3 py-3 text-sm text-slate-300">${(c.usage_hours||0).toFixed(1)}</td><td class="px-3 py-3 text-sm font-medium text-slate-300">${fmt.format(c.contract_value||0)}</td><td class="px-3 py-3 text-sm text-slate-400">${c.last_login_date||'N/A'}</td>`;
        tb.appendChild(tr);
    });
}

// ===== Action Center =====
async function fetchActionsData(){
    try{const r=await fetch('/api/actions');const data=await r.json();renderActions(data);}catch(e){console.error(e);}
}

function renderActions(actions){
    const container=document.getElementById('all-action-cards');
    const badge=document.getElementById('action-count-badge');
    if(!container)return;
    if(badge)badge.textContent=`${actions.length} actions pending`;
    container.innerHTML='';
    if(actions.length===0){container.innerHTML='<div class="col-span-full text-center py-16 text-slate-500">No pending actions. All customers are healthy!</div>';return;}
    actions.forEach(a=>{
        let cardCls,btnCls,icon,priority;
        if(a.action_card.includes('Warning')){cardCls='border-rose-500/30 bg-rose-500/5';btnCls='bg-rose-500/20 text-rose-300 hover:bg-rose-500/30';priority='Critical';icon=`<svg class="w-5 h-5 text-rose-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;}
        else if(a.action_card.includes('Alert')){cardCls='border-amber-500/30 bg-amber-500/5';btnCls='bg-amber-500/20 text-amber-300 hover:bg-amber-500/30';priority='High';icon=`<svg class="w-5 h-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>`;}
        else if(a.action_card.includes('Engagement')){cardCls='border-cyan-500/30 bg-cyan-500/5';btnCls='bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30';priority='Medium';icon=`<svg class="w-5 h-5 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`;}
        else{cardCls='border-indigo-500/30 bg-indigo-500/5';btnCls='bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30';priority='Review';icon=`<svg class="w-5 h-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>`;}
        const card=document.createElement('div');card.className=`glass-panel rounded-xl p-5 border shadow-lg shadow-black/20 ${cardCls} flex flex-col justify-between transition-all hover:scale-[1.02]`;
        const riskHtml=(a.top_risk_factors&&a.top_risk_factors.length>0)?a.top_risk_factors.map(rf=>`<span class="text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-400">${rf}</span>`).join(' '):'';
        card.innerHTML=`<div><div class="flex items-center justify-between mb-3"><div class="flex items-center gap-2"><div class="p-1.5 rounded-lg bg-slate-900/50 border border-white/5">${icon}</div><span class="text-xs font-semibold uppercase tracking-wider ${btnCls.split(' ')[1]}">${priority}</span></div><span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${a.health_score<50?'text-rose-400 bg-rose-400/10 ring-rose-400/20':'text-amber-400 bg-amber-400/10 ring-amber-400/20'}">${a.health_score}</span></div><h4 class="text-slate-100 font-medium text-sm mb-1">${a.customer_name}</h4><p class="text-slate-400 text-xs leading-relaxed mb-2">${a.action_card}</p><div class="flex flex-wrap gap-1 mb-3">${riskHtml}</div><div class="text-xs text-slate-500">Contract: ${fmt.format(a.contract_value||0)}</div></div><div class="mt-4 flex justify-end"><button class="px-3 py-1.5 rounded-md text-xs font-semibold ${btnCls} transition-colors">Execute Action</button></div>`;
        container.appendChild(card);
    });
}

// ===== Analytics =====
let analyticsCharts={};
async function fetchAnalyticsData(){try{const r=await fetch('/api/analytics');const data=await r.json();renderAnalytics(data);}catch(e){console.error(e);}}

function renderAnalytics(data){
    Object.values(analyticsCharts).forEach(c=>{if(c)c.destroy();});analyticsCharts={};
    Chart.defaults.color='#94a3b8';Chart.defaults.font.family='Inter';
    const ctxD=document.getElementById('chart-distribution');
    if(ctxD){analyticsCharts.distribution=new Chart(ctxD,{type:'doughnut',data:{labels:['Healthy','At Risk','Critical'],datasets:[{data:[data.distribution.healthy,data.distribution.risk,data.distribution.critical],backgroundColor:['#10b981','#f59e0b','#f43f5e'],borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},cutout:'70%'}});}
    const ctxA=document.getElementById('chart-activity');
    if(ctxA&&data.activity){let labels=data.activity.top.map(d=>d.customer_name)||['No Data'];let vals=data.activity.top.map(d=>d.usage_hours)||[0];analyticsCharts.activity=new Chart(ctxA,{type:'bar',data:{labels,datasets:[{label:'Usage Hours',data:vals,backgroundColor:'#6366f1',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:'#334155'}},x:{grid:{display:false}}}}});}
    const ctxE=document.getElementById('chart-engagement');
    if(ctxE&&data.engagement){analyticsCharts.engagement=new Chart(ctxE,{type:'line',data:{labels:data.engagement.labels,datasets:[{label:'Engagement Actions',data:data.engagement.data,borderColor:'#06b6d4',backgroundColor:'rgba(6,182,212,0.1)',borderWidth:2,tension:0.4,fill:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:'#334155'}},x:{grid:{display:false}}}}});}
    const ctxV=document.getElementById('chart-value');
    if(ctxV&&data.value_distribution){analyticsCharts.value=new Chart(ctxV,{type:'bar',data:{labels:['High Value','Medium Value','Low Value'],datasets:[{label:'Customers',data:[data.value_distribution.high,data.value_distribution.medium,data.value_distribution.low],backgroundColor:['#8b5cf6','#a855f7','#d946ef'],borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:'#334155'}},x:{grid:{display:false}}}}});}
}

// ===== File Upload =====
const csvUpload=document.getElementById('csv-upload');
if(csvUpload){csvUpload.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;const fd=new FormData();fd.append('file',file);showLoader();try{const r=await fetch('/api/upload',{method:'POST',body:fd});const res=await r.json();if(r.ok){alert(res.message||'Upload successful!');fetchDashboardData();}else{alert('Upload failed: '+(res.detail||'Unknown error'));hideLoader();}}catch(err){console.error(err);alert('Error uploading file');hideLoader();}e.target.value='';});}

// ===== Chatbot =====
const toggleChatbotBtn=document.getElementById('toggle-chatbot');
const closeChatbotBtn=document.getElementById('close-chatbot');
const chatbotContainer=document.getElementById('chatbot-container');
const chatForm=document.getElementById('chat-form');
const chatInput=document.getElementById('chat-input');
const chatHistory=document.getElementById('chat-history');

if(toggleChatbotBtn&&closeChatbotBtn&&chatbotContainer){const toggle=()=>{const hidden=chatbotContainer.classList.contains('opacity-0');if(hidden){chatbotContainer.classList.remove('opacity-0','translate-y-8','pointer-events-none');chatInput.focus();}else{chatbotContainer.classList.add('opacity-0','translate-y-8','pointer-events-none');}};toggleChatbotBtn.addEventListener('click',toggle);closeChatbotBtn.addEventListener('click',toggle);}

if(chatForm){chatForm.addEventListener('submit',async e=>{e.preventDefault();const msg=chatInput.value.trim();if(!msg)return;appendMessage(msg,'user');chatInput.value='';const tid=appendMessage('Thinking...','ai',true);try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg})});const data=await r.json();const te=document.getElementById(tid);if(te)te.remove();appendMessage(data.reply,'ai');}catch(err){const te=document.getElementById(tid);if(te)te.remove();appendMessage('Sorry, an error occurred.','ai');}});}

function appendMessage(text,sender,isTemp=false){const id='msg-'+Date.now()+Math.random().toString(36).substr(2,9);const div=document.createElement('div');if(sender==='user'){div.className='flex justify-end items-start gap-2';div.innerHTML=`<div class="bg-emerald-500/20 text-emerald-100 text-sm px-3 py-2 rounded-lg rounded-tr-none max-w-[85%] border border-emerald-500/30">${text}</div>`;}else{div.id=id;div.className='flex items-start gap-2';div.innerHTML=`<div class="bg-slate-800 text-slate-200 text-sm px-3 py-2 rounded-lg rounded-tl-none max-w-[85%] border border-slate-700/50">${text}</div>`;}chatHistory.appendChild(div);chatHistory.scrollTop=chatHistory.scrollHeight;return id;}
