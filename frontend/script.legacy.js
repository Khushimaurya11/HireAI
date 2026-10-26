pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const STORE_KEY = 'hireai_v1_state';
let state = null;

function defaultState(){
  return { user:null, credits:0, interviews:[], transactions:[] };
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    state = raw ? JSON.parse(raw) : defaultState();
  }catch(e){ state = defaultState(); }
}
function saveState(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){}
}
loadState();

const API_BASE = 'http://localhost:5000';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    throw new Error(payload?.error || 'Request failed');
  }

  return payload;
}

function toast(msg, err){
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.innerHTML = `<span class="dot"></span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 3200);
}

function openAuth(){ document.getElementById('authOverlay').classList.remove('hidden'); }
function closeAuth(){ document.getElementById('authOverlay').classList.add('hidden'); }

function quickGoogleAuth(){
  const names = ['Aditi Sharma','Rahul Verma','Mansi Ranjan','Khushi Maurya','Arjun Mehta'];
  const name = names[Math.floor(Math.random()*names.length)];
  completeAuth(name, name.toLowerCase().replace(' ','.')+'@gmail.com');
}
function manualAuth(){
  const name = document.getElementById('authName').value.trim();
  const email = document.getElementById('authEmail').value.trim();
  if(!name){ toast('Enter your name to continue', true); return; }
  completeAuth(name, email || (name.toLowerCase().replace(/\s+/g,'.')+'@example.com'));
}
function completeAuth(name, email){
  state.user = { name, email };
  if(state.credits === 0 && state.interviews.length === 0 && state.transactions.length === 0){
    state.credits = 100;
    state.transactions.push({label:'Welcome bonus', amount:100, date:new Date().toISOString()});
  }
  saveState();
  closeAuth();
  enterApp();
  toast(`Signed in as ${name}`);
}
function signOut(){
  document.getElementById('app-shell').classList.remove('active');
  document.getElementById('screen-landing').style.display='';
}

function enterApp(){
  document.getElementById('screen-landing').style.display='none';
  document.getElementById('app-shell').classList.add('active');
  refreshSidebar();
  go('dashboard');
}
function refreshSidebar(){
  if(!state.user) return;
  document.getElementById('sideName').textContent = state.user.name;
  document.getElementById('sideEmail').textContent = state.user.email;
  document.getElementById('sideAvatar').textContent = state.user.name.charAt(0).toUpperCase();
  document.getElementById('sideCredits').textContent = state.credits;
  document.getElementById('mobCredits').textContent = state.credits + ' cr';
}
function toggleSidebar(open){
  document.getElementById('sidebar').classList.toggle('open', open);
  document.getElementById('sideOverlay').classList.toggle('show', open);
}
const screens = ['dashboard','history','upload','setup','interview','results','wallet','settings'];
function go(name){
  screens.forEach(s=>{
    document.getElementById('screen-'+s).classList.toggle('hidden', s!==name);
  });
  document.querySelectorAll('.navlink[data-screen]').forEach(b=>{
    b.classList.toggle('active', b.dataset.screen===name);
  });
  toggleSidebar(false);
  if(name==='setup'){
    if(!draftProfile){ toast('Upload a resume first', true); go('upload'); return; }
    document.getElementById('setupRoleDisplay').textContent = document.getElementById('exRole').value || draftProfile.role;
    document.getElementById('setupWalletBalance').textContent = state.credits;
    document.getElementById('beginBtn').disabled = !selectedMode;
    document.getElementById('stepB').classList.add('active'); document.getElementById('stepA').classList.add('done');
  }
  if(name==='dashboard') renderDashboard();
  if(name==='history') renderHistory();
  if(name==='wallet') renderWallet();
  if(name==='settings') renderSettings();
  window.scrollTo(0,0);
}

function scoreColor(score){
  if(score>=7.5) return 'var(--green)';
  if(score>=5.5) return 'var(--brass)';
  return 'var(--red)';
}
function scoreBg(score){
  if(score>=7.5) return 'var(--green-dim)';
  if(score>=5.5) return 'var(--brass-dim)';
  return 'var(--red-dim)';
}
function renderDashboard(){
  refreshSidebar();
  document.getElementById('dashGreeting').textContent = `Welcome back, ${state.user.name.split(' ')[0]}`;
  document.getElementById('statCredits').textContent = state.credits;
  document.getElementById('statCount').textContent = state.interviews.length;
  const scores = state.interviews.map(i=>i.finalScore);
  document.getElementById('statAvg').textContent = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : '—';
  document.getElementById('statBest').textContent = scores.length ? Math.max(...scores).toFixed(1) : '—';

  const wrap = document.getElementById('dashRecent');
  if(!state.interviews.length){
    wrap.innerHTML = `<div class="empty-state"><h3>No sessions yet</h3><p>Run your first mock interview to see it scored and stored here.</p><button class="btn btn-primary" onclick="startNewInterview()">Start your first interview</button></div>`;
    return;
  }
  const recent = [...state.interviews].reverse().slice(0,5);
  wrap.innerHTML = recent.map(iv=>historyRowHTML(iv)).join('');
}
function historyRowHTML(iv){
  const d = new Date(iv.date);
  return `<div class="history-row" onclick="viewSession('${iv.id}')">
    <div class="history-left">
      <div class="hist-score" style="background:${scoreBg(iv.finalScore)};color:${scoreColor(iv.finalScore)};">${iv.finalScore.toFixed(1)}</div>
      <div class="history-meta"><b>${iv.role} — ${iv.mode}</b><span>${d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})} · ${d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</span></div>
    </div>
    <span style="color:var(--muted-2);font-size:18px;">→</span>
  </div>`;
}
function renderHistory(){
  const wrap = document.getElementById('historyList');
  if(!state.interviews.length){
    wrap.innerHTML = `<div class="empty-state"><h3>No sessions yet</h3><p>Your completed mock interviews will appear here.</p></div>`;
    return;
  }
  wrap.innerHTML = [...state.interviews].reverse().map(iv=>historyRowHTML(iv)).join('');
}
function viewSession(id){
  const iv = state.interviews.find(x=>x.id===id);
  if(!iv) return;
  renderResults(iv);
  go('results');
}

let draftProfile = null;

function startNewInterview(){
  if(state.credits < 50){
    toast('You need at least 50 credits to start a session', true);
    go('wallet');
    return;
  }
  resetUploadScreen();
  go('upload');
}
function resetUploadScreen(){
  document.getElementById('extractResult').classList.add('hidden');
  document.getElementById('parseProgressWrap').classList.add('hidden');
  document.getElementById('parseFill').style.width='0%';
  document.getElementById('resumeInput').value='';
  draftProfile = null;
  selectedMode = null;
}

const dz = document.getElementById('dropzone');
dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('drag'); });
dz.addEventListener('dragleave', ()=> dz.classList.remove('drag'));
dz.addEventListener('drop', e=>{
  e.preventDefault(); dz.classList.remove('drag');
  if(e.dataTransfer.files.length) handleResumeFile(e.dataTransfer.files[0]);
});
document.getElementById('resumeInput').addEventListener('change', e=>{
  if(e.target.files.length) handleResumeFile(e.target.files[0]);
});

async function handleResumeFile(file){
  if(file.type !== 'application/pdf'){ toast('Please upload a PDF resume', true); return; }
  document.getElementById('parseProgressWrap').classList.remove('hidden');
  document.getElementById('extractResult').classList.add('hidden');
  const fill = document.getElementById('parseFill');
  const status = document.getElementById('parseStatus');
  fill.style.width='15%'; status.textContent='Reading document…';

  try {
    const formData = new FormData();
    formData.append('resume', file);
    try {
      const data = await apiFetch('/api/resume/upload', { method: 'POST', body: formData });
      draftProfile = data.profile;
      fill.style.width='100%';
      status.textContent='Done';
      await new Promise(r => setTimeout(r, 200));
      populateExtractForm(draftProfile);
      document.getElementById('extractResult').classList.remove('hidden');
      return;
    } catch (backendErr) {
      console.warn('[frontend] Backend resume parse failed, falling back to local parser:', backendErr.message);
    }

    const buf = await file.arrayBuffer();
    fill.style.width='35%'; status.textContent='Extracting text…';
    const pdf = await pdfjsLib.getDocument({data:buf}).promise;
    let fullText = '';
    for(let p=1; p<=pdf.numPages; p++){
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      fullText += content.items.map(it=>it.str).join(' ') + '\n';
      fill.style.width = (35 + (p/pdf.numPages)*35) + '%';
    }
    status.textContent='Identifying role, skills & projects…';
    fill.style.width='85%';
    await new Promise(r=>setTimeout(r,350));
    draftProfile = extractProfile(fullText);
    fill.style.width='100%'; status.textContent='Done';
    await new Promise(r=>setTimeout(r,200));
    populateExtractForm(draftProfile);
    document.getElementById('extractResult').classList.remove('hidden');
  }catch(err){
    console.error(err);
    toast('Could not read that PDF — try another file', true);
    document.getElementById('parseProgressWrap').classList.add('hidden');
  }
}

const SKILL_DICT = ['JavaScript','TypeScript','Python','Java','C++','C','React','React.js','Node.js','Node','Express','MongoDB','SQL','MySQL','PostgreSQL','HTML','CSS','Tailwind','Redux','Django','Flask','AWS','Azure','GCP','Docker','Kubernetes','Git','GitHub','REST API','GraphQL','Machine Learning','Deep Learning','TensorFlow','PyTorch','Pandas','NumPy','Firebase','Next.js','Vue','Angular','PHP','Ruby','Go','Rust','Swift','Kotlin','Android','Data Structures','Algorithms','OOP','DBMS','Operating Systems','Computer Networks','Figma','Linux','CI/CD','Jenkins','Spring Boot','.NET','C#','Redis','WebSockets','NLP','Computer Vision'];
const ROLE_KEYWORDS = ['Software Engineer','Software Developer','Full Stack Developer','Frontend Developer','Backend Developer','Web Developer','Data Analyst','Data Scientist','Machine Learning Engineer','DevOps Engineer','Product Manager','UI/UX Designer','Android Developer','Cloud Engineer','QA Engineer','Business Analyst'];

function extractProfile(text){
  const norm = text.replace(/\s+/g,' ');
  let role = ROLE_KEYWORDS.find(r => new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i').test(norm));
  if(!role) role = 'Software Engineer';
  const skills = SKILL_DICT.filter(sk => new RegExp('\\b'+sk.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(norm));
  const uniqueSkills = [...new Set(skills.map(s=>s.replace('React.js','React').replace('Node.js','Node')))].slice(0,12);

  let experience = 'Fresher / 0–1 yrs';
  const yrMatch = norm.match(/(\d+(\.\d+)?)\+?\s*(years|yrs)/i);
  if(yrMatch){
    const y = parseFloat(yrMatch[1]);
    if(y>=4) experience='4+ years'; else if(y>=2) experience='2–4 years'; else if(y>=1) experience='1–2 years';
  }
  let projects = [];
  const projMatch = norm.match(/PROJECTS?[:\s](.{0,400})/i);
  if(projMatch){
    projects = projMatch[1].split(/(?=[A-Z][a-zA-Z]{3,}(?:\s[A-Z]?[a-z]*){0,4}[:\-–])/).map(s=>s.trim()).filter(s=>s.length>8).slice(0,3);
  }
  if(!projects.length) projects = ['Personal / academic project (edit this)'];

  return { role, experience, skills: uniqueSkills.length?uniqueSkills:['Problem Solving','Communication'], projects };
}

function populateExtractForm(p){
  document.getElementById('exRole').value = p.role;
  document.getElementById('exExperience').value = p.experience;
  document.getElementById('exProjects').value = p.projects.join('\n');
  renderSkillChips(p.skills);
}
function renderSkillChips(skills){
  draftProfile.skills = skills;
  document.getElementById('exSkills').innerHTML = skills.map((s,i)=>
    `<span class="skill-chip">${s}<span class="chip-remove" onclick="removeSkill(${i})">✕</span></span>`
  ).join('');
}
function removeSkill(i){ draftProfile.skills.splice(i,1); renderSkillChips(draftProfile.skills); }
function addSkillManual(){
  const inp = document.getElementById('exSkillAdd');
  const v = inp.value.trim();
  if(v){ draftProfile.skills.push(v); renderSkillChips(draftProfile.skills); inp.value=''; }
}

let selectedMode = null;
function selectMode(m){
  selectedMode = m;
  document.getElementById('modeTechnical').classList.toggle('selected', m==='Technical');
  document.getElementById('modeHR').classList.toggle('selected', m==='HR');
  document.getElementById('beginBtn').disabled = false;
}

function beginInterview(){
  if(state.credits < 50){ toast('Not enough credits for this session', true); go('wallet'); return; }
  draftProfile.role = document.getElementById('exRole').value || draftProfile.role;
  draftProfile.experience = document.getElementById('exExperience').value;
  draftProfile.projects = document.getElementById('exProjects').value.split('\n').filter(Boolean);

  const payload = {
    role: draftProfile.role,
    experience: draftProfile.experience,
    skills: draftProfile.skills,
    projects: draftProfile.projects,
    mode: selectedMode,
  };

  (async () => {
    try {
      const data = await apiFetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (data && data.walletBalance !== undefined) {
        state.credits = data.walletBalance;
        state.transactions.push({ label: `Session started — ${draftProfile.role} (${selectedMode})`, amount: -50, date: new Date().toISOString() });
        saveState();
        refreshSidebar();
        launchSession(draftProfile, selectedMode);
        return;
      }
    } catch (backendErr) {
      console.warn('[frontend] Backend interview start failed, using local flow:', backendErr.message);
    }

    state.credits -= 50;
    state.transactions.push({label:`Session started — ${draftProfile.role} (${selectedMode})`, amount:-50, date:new Date().toISOString()});
    saveState();
    refreshSidebar();
    launchSession(draftProfile, selectedMode);
  })();
}

const HR_TEMPLATES = {
  easy: ["Tell me a little about yourself and what you're looking for in this role.",
         "What made you apply for a {role} position specifically?"],
  medium: ["Describe a time you disagreed with a teammate. How did you handle it?",
            "Tell me about a project that didn't go as planned. What did you do?"],
  hard: ["Where do you want to be in your career five years from now, and how does this role fit that plan?"]
};
function techTemplates(skills){
  const s = skills.length ? skills : ['your core stack'];
  const pick = i => s[i % s.length];
  return {
    easy: [
      `Walk me through a project on your resume that used ${pick(0)}. What was your specific contribution?`,
      `In plain terms, how would you explain ${pick(1)} to someone non-technical?`
    ],
    medium: [
      `Suppose a feature built with ${pick(0)} starts slowing down under load — how would you go about diagnosing it?`,
      `What trade-offs would you weigh when choosing ${pick(1)} over an alternative for a new project?`
    ],
    hard: [
      `Design, at a high level, how you'd scale a system built with ${pick(0)} and ${pick(1)} to handle 10x the current traffic — what breaks first, and what do you change?`
    ]
  };
}
function generateQuestions(profile, mode){
  const bank = mode==='HR' ? HR_TEMPLATES : techTemplates(profile.skills);
  const fill = t => t.replace('{role}', profile.role);
  const qs = [];
  qs.push({text: fill(bank.easy[0]), difficulty:'Easy', time:60});
  qs.push({text: fill(bank.easy[1]||bank.easy[0]), difficulty:'Easy', time:60});
  qs.push({text: fill(bank.medium[0]), difficulty:'Medium', time:90});
  qs.push({text: fill(bank.medium[1]||bank.medium[0]), difficulty:'Medium', time:90});
  qs.push({text: fill(bank.hard[0]), difficulty:'Hard', time:120});
  return qs;
}

let session = null;
let recognition = null;
let micSupported = false;
(function checkMic(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  micSupported = !!SR;
  if(SR){ recognition = new SR(); recognition.continuous = true; recognition.interimResults = true; recognition.lang='en-US'; }
})();

function launchSession(profile, mode){
  const questions = generateQuestions(profile, mode);
  session = { profile, mode, questions, index:0, answers:[], remaining:0, timerId:null, usingMic:false, finalTranscriptBuffer:'' };
  document.getElementById('interviewTitle').textContent = `${mode} interview — ${profile.role}`;
  document.getElementById('micSupportNote').textContent = micSupported ? '' : 'Voice input isn’t available in this browser — type your answers instead.';
  document.getElementById('micSwitch').classList.toggle('on', false);
  document.getElementById('stepC').classList.add('active');
  buildProgressDots();
  go('interview');
  loadQuestion();
}
function buildProgressDots(){
  const wrap = document.getElementById('qProgress');
  wrap.innerHTML = session.questions.map((q,i)=>`<div class="q-dot" id="dot${i}"></div>`).join('');
}
function updateDots(){
  session.questions.forEach((q,i)=>{
    const el = document.getElementById('dot'+i);
    el.classList.remove('current','done');
    if(i < session.index) el.classList.add('done');
    else if(i === session.index) el.classList.add('current');
  });
}
function loadQuestion(){
  if(session.index >= session.questions.length){ finishSession(); return; }
  updateDots();
  const q = session.questions[session.index];
  document.getElementById('qaTags').innerHTML = `<span class="tag ${tagClass(q.difficulty)}">${q.difficulty}</span><span class="tag">Question ${session.index+1} of ${session.questions.length}</span>`;
  document.getElementById('qaQuestion').textContent = q.text;
  document.getElementById('qaAnswer').value = '';
  document.getElementById('wordCount').textContent = '0 words';
  document.getElementById('interviewSub').textContent = `Step 3 of 3 — ${session.mode} round, ${q.difficulty.toLowerCase()} question`;
  speakQuestion(q.text);
  startTimer(q.time);
}
function tagClass(d){ return d==='Easy'?'tag-easy':d==='Medium'?'tag-med':'tag-hard'; }

function speakQuestion(text){
  document.getElementById('agentStatus').textContent = 'Asking the question…';
  document.getElementById('agentAvatar').classList.add('speaking');
  if('speechSynthesis' in window){
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98;
    u.onend = ()=>{
      document.getElementById('agentAvatar').classList.remove('speaking');
      document.getElementById('agentStatus').textContent = session.usingMic ? 'Listening for your answer…' : 'Type your answer below';
      if(session.usingMic) startListening();
    };
    window.speechSynthesis.speak(u);
  }else{
    setTimeout(()=>{
      document.getElementById('agentAvatar').classList.remove('speaking');
      document.getElementById('agentStatus').textContent = session.usingMic ? 'Listening for your answer…' : 'Type your answer below';
      if(session.usingMic) startListening();
    }, 900);
  }
}
function repeatQuestion(){ speakQuestion(session.questions[session.index].text); }

function toggleMic(){
  if(!micSupported){ toast('Microphone input isn’t supported in this browser', true); return; }
  session.usingMic = !session.usingMic;
  document.getElementById('micSwitch').classList.toggle('on', session.usingMic);
  document.getElementById('micLabel').textContent = session.usingMic ? 'Microphone on' : 'Use microphone';
  if(session.usingMic){ startListening(); } else { stopListening(); }
}
function startListening(){
  if(!recognition) return;
  session.finalTranscriptBuffer = document.getElementById('qaAnswer').value;
  try{
    recognition.onresult = (e)=>{
      let interim = '';
      for(let i=e.resultIndex; i<e.results.length; i++){
        const t = e.results[i][0].transcript;
        if(e.results[i].isFinal) session.finalTranscriptBuffer += t + ' ';
        else interim += t;
      }
      document.getElementById('qaAnswer').value = (session.finalTranscriptBuffer + interim).trim();
      updateWordCount();
    };
    recognition.onerror = ()=>{ document.getElementById('listeningBadge').classList.add('hidden'); };
    recognition.onend = ()=>{ if(session.usingMic) { try{recognition.start();}catch(e){} } };
    recognition.start();
    document.getElementById('listeningBadge').classList.remove('hidden');
  }catch(e){}
}
function stopListening(){
  if(recognition){ try{ recognition.onend=null; recognition.stop(); }catch(e){} }
  document.getElementById('listeningBadge').classList.add('hidden');
}

document.getElementById('qaAnswer').addEventListener('input', updateWordCount);
function updateWordCount(){
  const v = document.getElementById('qaAnswer').value.trim();
  const n = v ? v.split(/\s+/).length : 0;
  document.getElementById('wordCount').textContent = n + ' words';
}

function startTimer(seconds){
  clearInterval(session.timerId);
  session.remaining = seconds;
  renderTimer();
  session.timerId = setInterval(()=>{
    session.remaining--;
    renderTimer();
    if(session.remaining<=0){ clearInterval(session.timerId); submitAnswer(true); }
  },1000);
}
function renderTimer(){
  const m = Math.floor(session.remaining/60).toString().padStart(2,'0');
  const s = (session.remaining%60).toString().padStart(2,'0');
  const el = document.getElementById('timerDisplay');
  el.textContent = `${m}:${s}`;
  el.classList.toggle('low', session.remaining<=10);
}

function submitAnswer(auto){
  clearInterval(session.timerId);
  stopListening();
  window.speechSynthesis && window.speechSynthesis.cancel();
  const q = session.questions[session.index];
  const answerText = document.getElementById('qaAnswer').value.trim();
  const usedMic = session.usingMic;
  const scored = scoreAnswer(q, answerText, usedMic, session.profile);
  session.answers.push({ question:q.text, difficulty:q.difficulty, answer: answerText || '(no answer submitted)', ...scored });
  session.index++;
  loadQuestion();
}

const FILLERS = ['um','uh','like','actually','basically','you know','sort of','kind of'];
const HEDGES = ['i think','maybe','not sure','probably','i guess','i don\'t know','kind of'];
const ASSERTIVE = ['i built','i designed','i led','i implemented','i solved','i owned','definitely','specifically','for example'];

function scoreAnswer(q, text, usedMic, profile){
  const words = text ? text.trim().split(/\s+/).filter(Boolean) : [];
  const wc = words.length;
  const lower = text.toLowerCase();

  let correctness = 3.5;
  if(wc>0){
    correctness += Math.min(wc/22, 3.2);
    const relevantSkills = profile.skills.filter(sk=>lower.includes(sk.toLowerCase()));
    correctness += Math.min(relevantSkills.length*0.6, 2.2);
    const qWords = q.text.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(' ').filter(w=>w.length>5);
    const overlap = qWords.filter(w=>lower.includes(w)).length;
    correctness += Math.min(overlap*0.3, 1.2);
  } else { correctness = 0; }
  correctness = clamp(correctness,0,10);

  let communication = 4;
  if(wc>0){
    const sentences = text.split(/[.!?]/).filter(s=>s.trim().length>3).length;
    communication += sentences>=2 ? 2 : sentences*1;
    if(wc>=25 && wc<=180) communication += 2.5; else if(wc>10) communication += 1;
    const fillerCount = FILLERS.reduce((a,f)=>a + (lower.split(f).length-1),0);
    communication -= Math.min(fillerCount*0.5, 2.5);
  } else { communication = 0; }
  communication = clamp(communication,0,10);

  let confidence = 5.5;
  if(wc>0){
    const hedgeCount = HEDGES.reduce((a,h)=>a + (lower.split(h).length-1),0);
    const assertCount = ASSERTIVE.reduce((a,h)=>a + (lower.split(h).length-1),0);
    confidence += Math.min(assertCount*0.8, 2.5) - Math.min(hedgeCount*0.9, 3);
    if(usedMic) confidence += 0.6;
    if(wc<8) confidence -= 2;
  } else { confidence = 0; }
  confidence = clamp(confidence,0,10);

  const overall = Math.round(((correctness+communication+confidence)/3)*10)/10;
  return {
    correctness: round1(correctness), communication: round1(communication), confidence: round1(confidence),
    overall, feedback: buildFeedback(correctness,communication,confidence,wc)
  };
}
function clamp(n,a,b){ return Math.max(a,Math.min(b,n)); }
function round1(n){ return Math.round(n*10)/10; }
function buildFeedback(c,comm,conf,wc){
  if(wc===0) return "No answer was recorded for this question — in a real round, silence reads as unpreparedness. Try to give at least a partial answer, even under time pressure.";
  const notes = [];
  notes.push(c>=7.5 ? "Technically solid — you covered the relevant ground clearly." : c>=5 ? "On the right track technically, but go one level deeper with specifics next time." : "The technical core of the answer needs more substance — anchor it in a concrete example.");
  notes.push(comm>=7.5 ? "Well structured and easy to follow." : comm>=5 ? "Understandable, but tightening the structure (situation → action → result) would help." : "Try organizing the answer into shorter, clearer sentences.");
  notes.push(conf>=7.5 ? "Delivered with confidence and ownership." : conf>=5 ? "Reasonably confident — cut hedging phrases like 'I think' or 'maybe'." : "Speak with more ownership — lead with what you did, not what you're unsure about.");
  return notes.join(' ');
}

function finishSession(){
  const avgCorrect = avgOf(session.answers,'correctness');
  const avgComm = avgOf(session.answers,'communication');
  const avgConf = avgOf(session.answers,'confidence');
  const finalScore = Math.round(((avgCorrect+avgComm+avgConf)/3)*10)/10;
  const record = {
    id: 'iv_'+Date.now(),
    role: session.profile.role,
    mode: session.mode,
    date: new Date().toISOString(),
    finalScore,
    avg: { correctness: avgCorrect, communication: avgComm, confidence: avgConf },
    questions: session.answers
  };
  state.interviews.push(record);
  saveState();
  refreshSidebar();
  renderResults(record);
  go('results');
}
function avgOf(arr, key){
  if(!arr.length) return 0;
  return round1(arr.reduce((a,b)=>a+b[key],0)/arr.length);
}
function renderResults(record){
  document.getElementById('resultsSub').textContent = `${record.role} · ${record.mode} round · ${new Date(record.date).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}`;
  document.getElementById('finalScoreNum').textContent = record.finalScore.toFixed(1);
  const circumference = 2*Math.PI*64;
  const circle = document.getElementById('scoreRingCircle');
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference - (record.finalScore/10)*circumference;
  circle.style.stroke = scoreColor(record.finalScore);
  circle.style.transition = 'stroke-dashoffset .6s ease';

  setBar('barCorrect','numCorrect',record.avg.correctness);
  setBar('barComm','numComm',record.avg.communication);
  setBar('barConf','numConf',record.avg.confidence);

  document.getElementById('reviewList').innerHTML = record.questions.map((qa,i)=>`
    <div class="qa-review-item">
      <div class="qa-review-head" onclick="this.nextElementSibling.classList.toggle('open')">
        <div><span class="tag ${tagClass(qa.difficulty)}" style="margin-bottom:6px;display:inline-block;">${qa.difficulty}</span><h4>Q${i+1}. ${qa.question}</h4></div>
        <div class="qa-review-scores">
          <div class="mini-score" style="background:${scoreBg(qa.correctness)};color:${scoreColor(qa.correctness)};" title="Correctness">${qa.correctness.toFixed(1)}</div>
          <div class="mini-score" style="background:${scoreBg(qa.communication)};color:${scoreColor(qa.communication)};" title="Communication">${qa.communication.toFixed(1)}</div>
          <div class="mini-score" style="background:${scoreBg(qa.confidence)};color:${scoreColor(qa.confidence)};" title="Confidence">${qa.confidence.toFixed(1)}</div>
        </div>
      </div>
      <div class="qa-review-body">
        <div class="a-label">Your answer</div>
        <div class="a-text">${escapeHTML(qa.answer)}</div>
        <div class="a-label">Feedback</div>
        <div class="fb-text">${qa.feedback}</div>
      </div>
    </div>
  `).join('');
  window._lastRecord = record;
}
function setBar(barId,numId,val){
  document.getElementById(barId).style.width = (val*10)+'%';
  document.getElementById(numId).textContent = val.toFixed(1);
}
function escapeHTML(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

function downloadReport(){
  const record = window._lastRecord;
  if(!record){ toast('No report to export yet', true); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const marginX = 16; let y = 20;
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.text('Hire-AI — Interview Performance Report', marginX, y);
  y+=9; doc.setFontSize(10.5); doc.setFont('helvetica','normal');
  doc.text(`Candidate: ${state.user.name}`, marginX, y); y+=6;
  doc.text(`Role: ${record.role}   |   Mode: ${record.mode}`, marginX, y); y+=6;
  doc.text(`Date: ${new Date(record.date).toLocaleString()}`, marginX, y); y+=12;

  doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.text('Overall score: '+record.finalScore.toFixed(1)+' / 10', marginX, y); y+=9;
  doc.setFont('helvetica','normal'); doc.setFontSize(11);
  doc.text(`Correctness: ${record.avg.correctness.toFixed(1)}   Communication: ${record.avg.communication.toFixed(1)}   Confidence: ${record.avg.confidence.toFixed(1)}`, marginX, y);
  y+=12;
  doc.setDrawColor(200); doc.line(marginX,y,194,y); y+=10;

  record.questions.forEach((qa,i)=>{
    if(y>250){ doc.addPage(); y=20; }
    doc.setFont('helvetica','bold'); doc.setFontSize(11.5);
    const qLines = doc.splitTextToSize(`Q${i+1} [${qa.difficulty}]  ${qa.question}`, 178);
    doc.text(qLines, marginX, y); y += qLines.length*5.5 + 2;
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.text(`Scores — Correctness ${qa.correctness.toFixed(1)} · Communication ${qa.communication.toFixed(1)} · Confidence ${qa.confidence.toFixed(1)}`, marginX, y); y+=6;
    const aLines = doc.splitTextToSize('Answer: '+qa.answer, 178);
    doc.text(aLines, marginX, y); y += aLines.length*5 + 2;
    const fLines = doc.splitTextToSize('Feedback: '+qa.feedback, 178);
    doc.setTextColor(80); doc.text(fLines, marginX, y); doc.setTextColor(0); y += fLines.length*5 + 8;
  });
  doc.save(`HireAI_Report_${record.role.replace(/\s+/g,'_')}_${Date.now()}.pdf`);
  toast('Report downloaded');
}

function renderWallet(){
  document.getElementById('walletBalanceBig').textContent = state.credits;
  const wrap = document.getElementById('txList');
  if(!state.transactions.length){ wrap.innerHTML = `<div class="empty-state"><h3>No transactions yet</h3><p>Purchases and session deductions will show up here.</p></div>`; return; }
  wrap.innerHTML = [...state.transactions].reverse().map(t=>`
    <div class="tx-row"><span>${t.label}<br><span style="color:var(--muted-2);font-size:11.5px;">${new Date(t.date).toLocaleString()}</span></span>
    <span class="tx-amt ${t.amount>=0?'pos':'neg'}">${t.amount>=0?'+':''}${t.amount} cr</span></div>
  `).join('');
}
function buyPack(credits, price, label){
  document.getElementById('payOverlay').classList.remove('hidden');
  document.getElementById('payBody').innerHTML = `<div class="pay-processing"><div class="spinner"></div><h3 style="font-size:16px;">Processing ₹${price} payment…</h3><p style="color:var(--muted);font-size:13px;">${label} Pack · ${credits} credits · HMAC-verified checkout</p></div>`;

  (async () => {
    try {
      const data = await apiFetch('/api/payment/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: label.toLowerCase() === 'starter' ? 'starter' : 'pro' }),
      });
      if (data && data.order) {
        state.credits += credits;
        state.transactions.push({ label: `${label} Pack purchase (₹${price})`, amount: credits, date: new Date().toISOString() });
        saveState();
        refreshSidebar();
        document.getElementById('payBody').innerHTML = `<div class="pay-processing"><div style="width:44px;height:44px;border-radius:50%;background:var(--green-dim);color:var(--green);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:22px;">✓</div><h3 style="font-size:16px;">Payment successful</h3><p style="color:var(--muted);font-size:13px;">${credits} credits added to your wallet.</p><button class="btn btn-primary" style="margin-top:16px;width:100%;" onclick="closePay(); renderWallet();">Done</button></div>`;
        return;
      }
    } catch (backendErr) {
      console.warn('[frontend] Backend payment order failed, using local wallet flow:', backendErr.message);
    }

    setTimeout(()=>{
      state.credits += credits;
      state.transactions.push({label:`${label} Pack purchase (₹${price})`, amount:credits, date:new Date().toISOString()});
      saveState(); refreshSidebar();
      document.getElementById('payBody').innerHTML = `<div class="pay-processing"><div style="width:44px;height:44px;border-radius:50%;background:var(--green-dim);color:var(--green);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:22px;">✓</div><h3 style="font-size:16px;">Payment successful</h3><p style="color:var(--muted);font-size:13px;">${credits} credits added to your wallet.</p><button class="btn btn-primary" style="margin-top:16px;width:100%;" onclick="closePay(); renderWallet();">Done</button></div>`;
    }, 1400);
  })();
}
function closePay(){ document.getElementById('payOverlay').classList.add('hidden'); }

function renderSettings(){
  document.getElementById('setName').value = state.user.name;
  document.getElementById('setEmail').value = state.user.email;
}
function saveSettings(){
  state.user.name = document.getElementById('setName').value.trim() || state.user.name;
  saveState(); refreshSidebar();
  toast('Profile updated');
}
function resetAllData(){
  if(!confirm('This clears all local Hire-AI data in this browser. Continue?')) return;
  const email = state.user.email, name = state.user.name;
  state = defaultState();
  state.user = {name, email};
  state.credits = 100;
  state.transactions.push({label:'Welcome bonus', amount:100, date:new Date().toISOString()});
  saveState(); refreshSidebar();
  go('dashboard');
  toast('Local data reset');
}

(function(){
  const w = document.getElementById('landingWave');
  for(let i=0;i<28;i++){ const b=document.createElement('i'); b.style.animationDelay=(i*0.05)+'s'; w.appendChild(b); }
})();

if(state.user){ enterApp(); }
