import { useState, useEffect, useRef, useCallback } from 'react'

const NAV = [
  ['home','Home'],
  ['about','About',[ ['about','What is LCOY'], ['team','Organizing Team'], ['editions','Past Conferences'] ]],
  ['programme','Programme'],
  ['themes','Thematic Areas'],
  ['contact','Contact']
];
const CAPS = [
  'Photos from LCOY Sierra Leone 2024',
  'Photos from LCOY Sierra Leone 2024',
  'Photos from LCOY Sierra Leone 2024',
  'Photos from LCOY Sierra Leone 2024',
  'Photos from LCOY Sierra Leone 2025'
];
const HERO_TEXTS = [
  { eyebrow: 'Freetown · 7–9 October 2026', heading: <><span style={{whiteSpace:'nowrap'}}>Inclusive Climate Action:</span><br/><em style={{whiteSpace:'nowrap'}}>Leaving No Youth Behind</em></>, lead: "Sierra Leone's official national youth climate gathering, recognised by YOUNGO under the UNFCCC. Three days that turn grassroots youth voice into the National Youth Statement carried to COY21 and COP31." },
  { eyebrow: '150+ delegates · 7+ organisations', heading: <>Youth Voice Into <em>Climate Policy</em></>, lead: "Regional consultations across all four geographic regions bring rural and peri-urban voices to the conference floor — producing a costed, evidence-based National Youth Statement." },
  { eyebrow: 'NDC 3.0 · USD 2.97bn climate roadmap', heading: <>Shaping Sierra Leone's <em>Climate Future</em></>, lead: "Timed to land youth-driven recommendations into the early-implementation window of NDC 3.0 — before delivery pathways harden and budget envelopes are fixed." },
  { eyebrow: 'Mangroves · Trees · Clean-ups', heading: <>Advocacy Matched by <em>Community Action</em></>, lead: "A movement that goes beyond the conference floor. Mangrove restoration, tree planting and clean-ups demonstrate that youth climate leadership is practised, not just spoken." },
  { eyebrow: 'Beach clean-ups · Community action', heading: <>Youth Leading by <em>Example</em></>, lead: "From conference halls to coastlines — Sierra Leonean youth take climate action to the communities that need it most, demonstrating that advocacy starts at home." },
];

export default function App() {
  const [page,setPage] = useState('home');
  const [open,setOpen] = useState(false);
  const [slide,setSlide] = useState(0);
  const [regOk,setRegOk] = useState(false);
  const [volTab,setVolTab] = useState(0);
  const [msgOk,setMsgOk] = useState(false);
  const [cd,setCd] = useState({d:'--',h:'--',m:'--',s:'--'});
  const timer = useRef(null);

  const nav = (id) => { setPage(id); setOpen(false); window.scrollTo({top:0}); };

  // ----- slider auto-rotate -----
  const reduce = typeof window!=='undefined' && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const startSlider = useCallback(()=>{
    if(timer.current) clearInterval(timer.current);
    if(reduce) return;
    timer.current = setInterval(()=>setSlide(s=>(s+1)%CAPS.length),3000);
  },[reduce]);
  useEffect(()=>{ if(page==='home') startSlider(); return ()=>timer.current&&clearInterval(timer.current); },[page,startSlider]);
  const slideNext = ()=>{ setSlide(s=>(s+1)%CAPS.length); startSlider(); };
  const slidePrev = ()=>{ setSlide(s=>(s-1+CAPS.length)%CAPS.length); startSlider(); };
  const goSlide = (i)=>{ setSlide(i); startSlider(); };

  // ----- countdown -----
  useEffect(()=>{
    const target = new Date('2026-10-07T09:00:00+00:00').getTime();
    const pad = v=>String(v).padStart(2,'0');
    const tick = ()=>{
      let d=target-Date.now(); if(d<0)d=0;
      setCd({d:Math.floor(d/864e5),h:pad(Math.floor(d%864e5/36e5)),m:pad(Math.floor(d%36e5/6e4)),s:pad(Math.floor(d%6e4/1e3))});
    };
    tick(); const i=setInterval(tick,1000); return ()=>clearInterval(i);
  },[]);

  // ----- scroll reveal + counters (re-run on page change) -----
  useEffect(()=>{
    const root=document.querySelector('.page.active')||document;
    const items=root.querySelectorAll('.reveal:not(.in)');
    const countUp=(scope)=>{
      let nums=scope.querySelectorAll?scope.querySelectorAll('[data-count]'):[];
      if(scope.hasAttribute&&scope.hasAttribute('data-count')) nums=[scope];
      nums.forEach(el=>{
        if(el.dataset.done)return; el.dataset.done='1';
        const target=+el.dataset.count, suffix=el.dataset.suffix||'', dur=1100, t0=performance.now();
        const step=(t)=>{const p=Math.min((t-t0)/dur,1);el.textContent=Math.round(target*(1-Math.pow(1-p,3)))+suffix;if(p<1)requestAnimationFrame(step);};
        requestAnimationFrame(step);
      });
    };
    if(!('IntersectionObserver' in window)){ items.forEach(el=>{el.classList.add('in');countUp(el);}); return; }
    const io=new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); countUp(e.target); io.unobserve(e.target); } });
    },{threshold:.15,rootMargin:'0px 0px -40px 0px'});
    items.forEach(el=>io.observe(el));
    return ()=>io.disconnect();
  },[page]);

  const submitReg=()=>{const n=document.getElementById('fn').value.trim(),e=document.getElementById('em').value.trim();if(!n||!e){alert('Please add at least your name and email.');return;}setRegOk(true);window.scrollTo({top:200,behavior:'smooth'});};
  const submitMsg=()=>{const n=document.getElementById('cn').value.trim(),e=document.getElementById('ce').value.trim();if(!n||!e){alert('Please add your name and email.');return;}setMsgOk(true);};

  const header = (
    <header>
      <div className="wrap nav">
        <div className="brand" onClick={()=>nav('home')}>
          <img src="/photos/Logos for host organizations/LCOY-YOUNGO-Endored.png" alt="LCOY Sierra Leone 2026" />
        </div>
        <nav className={"menu"+(open?" open":"")}>
          {NAV.map(([id,label,sub])=> sub ? (
            <div key={id} className={"nav-dropdown"+(page===id||sub.some(s=>s[0]===page)?" active":"")}>
              <a onClick={()=>nav(id)}>{label} <span className="nav-arrow">▾</span></a>
              <div className="nav-sub">{sub.map(([sid,slabel])=>(<a key={sid} className={page===sid?"active":""} onClick={()=>nav(sid)}>{slabel}</a>))}</div>
            </div>
          ) : (<a key={id} className={page===id?"active":""} onClick={()=>nav(id)}>{label}</a>))}
          <a href="/live" className="nav-live"><span className="nav-live-dot"></span>Live</a>
        </nav>
        <div className="nav-cta">
          <a className="btn btn-blue" onClick={()=>nav('register')}>Register</a>
          <button className="burger" onClick={()=>setOpen(o=>!o)} aria-label="Menu"><span></span><span></span><span></span></button>
        </div>
      </div>
    </header>
  );

  const footer = (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <img src="/photos/Logos for host organizations/LCOY-YOUNGO-Endored.png" alt="LCOY Sierra Leone 2026" />
            <p>The official national youth climate gathering for Sierra Leone, recognised by YOUNGO under the UNFCCC. Inclusive Climate Action: Leaving No Youth Behind.</p>
          </div>
          <div><h4>Explore</h4>
            <a onClick={()=>nav('home')}>Home</a><a onClick={()=>nav('about')}>About</a><a onClick={()=>nav('programme')}>Programme</a>
            <a onClick={()=>nav('themes')}>Thematic Areas</a><a onClick={()=>nav('editions')}>Past Editions</a>
          </div>
          <div><h4>Get involved</h4>
            <a onClick={()=>nav('register')}>Register</a>
            <a onClick={()=>{nav('home');setTimeout(()=>document.getElementById('partners').scrollIntoView({behavior:'smooth'}),120)}}>Partners</a>
            <a onClick={()=>nav('contact')}>Contact</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 LCOY Sierra Leone Coalition. Operates under the YOUNGO LCOY Policy.</span>
          <span>lcoy@yccsierraleone.org</span>
        </div>
      </div>
    </footer>
  );

  const Page_home = () => (<>

  <section className="hero" id="hero">
    <div className="slides" id="slides">
      <div className={"slide s1"+(slide===0?" on":"")}><div className="bg" style={{"backgroundImage":"url('photos/F94A2143.jpg')"}}></div></div>
      <div className={"slide s2"+(slide===1?" on":"")}><div className="bg" style={{"backgroundImage":"url('photos/F94A1596.jpg')","backgroundPosition":"85% 20%"}}></div></div>
      <div className={"slide s3"+(slide===2?" on":"")}><div className="bg" style={{"backgroundImage":"url('photos/F94A2211.jpg')","backgroundPosition":"center 55%"}}></div></div>
      <div className={"slide s4"+(slide===3?" on":"")}><div className="bg" style={{"backgroundImage":"url('photos/F94A2313.jpg')"}}></div></div>
      <div className={"slide s5"+(slide===4?" on":"")}><div className="bg" style={{"backgroundImage":"url('photos/Past Editions/LCOY 2025 Photos/IMG_0507.JPG.jpeg')"}}></div></div>
    </div>
    <div className="hero-scrim"></div>

    <div className="hero-inner">
      <div className="wrap">
        <div className="hero-copy">
          <span className="eyebrow">{HERO_TEXTS[slide].eyebrow}</span>
          <h1>{HERO_TEXTS[slide].heading}</h1>
          <p className="lead">{HERO_TEXTS[slide].lead}</p>
          <div className="hero-actions">
            <a className="btn btn-primary" onClick={()=>nav('register')}>Register your place →</a>
            <a className="btn btn-ghost" onClick={()=>document.getElementById('partners').scrollIntoView({behavior:'smooth'})}>Become a partner</a>
          </div>
        </div>
      </div>
    </div>

    <div className="hero-cap">
      <div className="wrap">
        <span className="cap-pill" id="cap"><span className="dot"></span><span>{CAPS[slide]}</span></span>
        <div style={{"display":"flex","alignItems":"center","gap":"18px"}}>
          <div className="dots">{CAPS.map((_,i)=>(<button key={i} className={slide===i?"on":""} onClick={()=>goSlide(i)} aria-label={"Slide "+(i+1)}></button>))}</div>
          <div className="arrows">
            <button onClick={slidePrev} aria-label="Previous">‹</button>
            <button onClick={slideNext} aria-label="Next">›</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  
  <section className="cd-band">
    <div className="wrap">
      <div className="cd-location">FREETOWN, SIERRA LEONE · 7–9 OCTOBER 2026</div>
      <div className="cd-grid">
        <div className="cd-box"><div className="n">{cd.d}</div><div className="u">Days</div></div>
        <div className="cd-box"><div className="n">{cd.h}</div><div className="u">Hours</div></div>
        <div className="cd-box"><div className="n">{cd.m}</div><div className="u">Minutes</div></div>
        <div className="cd-box"><div className="n">{cd.s}</div><div className="u">Seconds</div></div>
      </div>
    </div>
  </section>

  
  <div className="ticker">
    <div className="ticker-track">
      <span className="ticker-item"><img src="photos/Logos for host organizations/YCC Sierra Leone Logo.png" alt="YCC-SL" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/YICA-Logo-png-final.png" alt="YICA-SL" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/ACRG.png" alt="ACRG" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/TOURISM CLUB logo.png" alt="Tourism Hub" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/FAEICY.jpeg" alt="FAEICY" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/Dear Plastic.jpeg" alt="Dear Plastic" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/FYEA Logo.jpeg" alt="FYEA" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/YCC Sierra Leone Logo.png" alt="YCC-SL" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/YICA-Logo-png-final.png" alt="YICA-SL" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/ACRG.png" alt="ACRG" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/TOURISM CLUB logo.png" alt="Tourism Hub" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/FAEICY.jpeg" alt="FAEICY" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/Dear Plastic.jpeg" alt="Dear Plastic" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/FYEA Logo.jpeg" alt="FYEA" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/YCC Sierra Leone Logo.png" alt="YCC-SL" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/YICA-Logo-png-final.png" alt="YICA-SL" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/ACRG.png" alt="ACRG" className="ticker-logo" /></span>
      <span className="ticker-item"><img src="photos/Logos for host organizations/TOURISM CLUB logo.png" alt="Tourism Hub" className="ticker-logo" /></span>
    </div>
  </div>

  
  <section className="why-section">
    <div className="why-bg" style={{backgroundImage:"url('photos/COP29 Photo.jpeg')"}}></div>
    <div className="why-overlay"></div>
    <div className="wrap" style={{position:'relative',zIndex:3}}>
      <div className="why-hero reveal">
        <div className="why-left">
          <span className="eyebrow">Why LCOY-SL 2026</span>
          <h2><span className="why-caps">Not just a conference.</span>A structured intervention into climate policy.</h2>
          <p>75% of Sierra Leone's population is under 35. Its young people are not a future stakeholder — they are the present majority who will live with every decision made under NDC 3.0.</p>
          <p>LCOY is the official national youth climate gathering recognised by YOUNGO under the UNFCCC. From Freetown to COY21 and COP31.</p>
        </div>
        <div className="why-stats">
          <div className="why-stat reveal d1"><div className="why-num" data-count="75" data-suffix="%">0</div><div className="why-label">Population under 35</div></div>
          <div className="why-stat reveal d2"><div className="why-num">$2.97bn</div><div className="why-label">NDC 3.0 roadmap</div></div>
          <div className="why-stat reveal d3"><div className="why-num" data-count="150" data-suffix="+">0</div><div className="why-label">In-person delegates</div></div>
          <div className="why-stat reveal d4"><div className="why-num" data-count="4" data-suffix="">0</div><div className="why-label">Regions represented</div></div>
        </div>
      </div>
    </div>
  </section>

  <section className="journey-section">
    <div className="wrap">
      <div className="journey-title reveal"><span className="eyebrow" style={{color:'var(--orange)'}}>The journey</span><h2>From grassroots voice to global policy</h2></div>
      <div className="journey j6 reveal">
        <div className="j-col j-top">
          <div className="j-card">
            <h3 style={{color:'#e06c75'}}>Consult</h3>
            <p>Regional consultations across all four geographic regions bring rural and peri-urban voices to the table.</p>
            <span className="journey-time">June–July 2026</span>
          </div>
          <div className="j-circle" style={{borderColor:'#e06c75'}}><span className="j-num">01</span></div>
          <span className="we-are-here">▲ We are here</span>
        </div>
        <div className="j-col j-bottom">
          <div className="j-circle" style={{borderColor:'#56b6c2'}}><span className="j-num">02</span></div>
          <div className="j-card">
            <h3 style={{color:'#56b6c2'}}>Virtual Consult</h3>
            <p>Online consultations to collect demands and inputs from youth across the country who couldn't attend in person.</p>
            <span className="journey-time">August 2026</span>
          </div>
        </div>
        <div className="j-col j-top">
          <div className="j-card">
            <h3 style={{color:'#98c379'}}>Draft</h3>
            <p>Consolidate regional and virtual inputs into draft language for the National Youth Statement ahead of the conference.</p>
            <span className="journey-time">September 2026</span>
          </div>
          <div className="j-circle" style={{borderColor:'#98c379'}}><span className="j-num">03</span></div>
        </div>
        <div className="j-col j-bottom">
          <div className="j-circle" style={{borderColor:'#61afef'}}><span className="j-num">04</span></div>
          <div className="j-card">
            <h3 style={{color:'#61afef'}}>Convene</h3>
            <p>150+ delegates gather in Freetown for two conference days — panels, workshops, hackathons and dialogues.</p>
            <span className="journey-time">7–9 October 2026</span>
          </div>
        </div>
        <div className="j-col j-top">
          <div className="j-card">
            <h3 style={{color:'#c678dd'}}>Create</h3>
            <p>Draft and adopt the National Youth Statement 2026 — costed, evidence-based, anchored in NDC 3.0.</p>
            <span className="journey-time">Day 2</span>
          </div>
          <div className="j-circle" style={{borderColor:'#c678dd'}}><span className="j-num">05</span></div>
        </div>
        <div className="j-col j-bottom">
          <div className="j-circle" style={{borderColor:'var(--orange)'}}><span className="j-num">06</span></div>
          <div className="j-card">
            <h3 style={{color:'var(--orange)'}}>Deliver</h3>
            <p>Community action day — mangrove restoration, tree planting and clean-ups. Then carry the Statement to COP31.</p>
            <span className="journey-time">Day 3 → COP31</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section className="bg-mist stats-band">
    <div className="wrap">
      <div className="stats">
        <div className="s reveal d1"><div className="n" data-count="7" data-suffix="+">0</div><div className="l">Youth-led organisations</div></div>
        <div className="s reveal d2"><div className="n" data-count="50" data-suffix="%">0</div><div className="l">Minimum female participation</div></div>
        <div className="s reveal d3"><div className="n" data-count="3" data-suffix=" days">0</div><div className="l">2 conference + 1 outdoor action</div></div>
        <div className="s reveal d4"><div className="n" data-count="180" data-suffix="">0</div><div className="l">Delegates at LCOY 2024</div></div>
      </div>
    </div>
  </section>


  
  <section className="partners-top" id="partners">
    <div className="partners-bg" style={{backgroundImage:"url('photos/F94A2213.jpg')"}}></div>
    <div className="partners-overlay"></div>
    <div className="wrap" style={{position:'relative',zIndex:3}}>
      <div className="partners-header reveal">
        <span className="eyebrow">Partners &amp; stakeholders</span>
        <h2>Building this movement <em className="script-em">together</em></h2>
      </div>
      <div className="past-label reveal">Supported previous LCOY editions in Sierra Leone</div>
    </div>
  </section>

  <section className="partners-logos-section">
    <div className="wrap">
      <div className="partner-logos-grid">
        <div className="partner-logo reveal d1"><img src="Partner logos/EPA Sierra Leone.png" alt="EPA Sierra Leone" /></div>
        <div className="partner-logo reveal d1"><img src="Partner logos/Freetown City Council Logo.jpg" alt="Freetown City Council" /></div>
        <div className="partner-logo reveal d2"><img src="Partner logos/Ministry of Youth Affairs.jpeg" alt="Ministry of Youth Affairs" /></div>
        <div className="partner-logo reveal d2"><img src="Partner logos/960px-UNICEF_Logo.png" alt="UNICEF" /></div>
        <div className="partner-logo reveal d3"><img src="Partner logos/C40_Logo_RGB_72dpi.png" alt="C40 Cities" /></div>
        <div className="partner-logo reveal d3"><img src="Partner logos/1280px-Save_the_Children_Logo.svg.png" alt="Save the Children" /></div>
        <div className="partner-logo reveal d1"><img src="Partner logos/IBTK.jpeg" alt="I.B.T.K Foundation" /></div>
        <div className="partner-logo reveal d1"><img src="Partner logos/YOTA.jpeg" alt="YOTA" /></div>
        <div className="partner-logo reveal d2"><img src="Partner logos/AYP.jpeg" alt="Africa Youth Partnership" /></div>
        <div className="partner-logo reveal d3"><img src="Partner logos/Fourah Bay College.jfif" alt="Fourah Bay College" /></div>
      </div>
    </div>
  </section>

  <section className="partners-section">
    <div className="partners-bg" style={{backgroundImage:"url('photos/F94A2213.jpg')"}}></div>
    <div className="partners-overlay"></div>
    <div className="wrap" style={{position:'relative',zIndex:3}}>
      <div className="ways-header reveal"><h2>Ways to partner</h2></div>
      <div className="ways-grid">
        <div className="way-card reveal d1">
          <div className="way-stripe" style={{background:'var(--orange)'}}></div>
          <div className="way-num" style={{color:'var(--orange)'}}>01</div>
          <h3>Cash contributions</h3>
          <p>Of any size, pooled into a lean budget where every line item is tied to a deliverable.</p>
        </div>
        <div className="way-card reveal d2">
          <div className="way-stripe" style={{background:'var(--blue)'}}></div>
          <div className="way-num" style={{color:'var(--blue)'}}>02</div>
          <h3>In-kind support</h3>
          <p>Venue, transport, catering, equipment, printing, accommodation, AV, sign language, tree seedlings.</p>
        </div>
        <div className="way-card reveal d3">
          <div className="way-stripe" style={{background:'#2ecc71'}}></div>
          <div className="way-num" style={{color:'#2ecc71'}}>03</div>
          <h3>Programmatic</h3>
          <p>Co-host a thematic session, send an expert facilitator, run a workshop, or take an exhibition slot.</p>
        </div>
        <div className="way-card reveal d1">
          <div className="way-stripe" style={{background:'#c678dd'}}></div>
          <div className="way-num" style={{color:'#c678dd'}}>04</div>
          <h3>Strategic</h3>
          <p>Institutional support for the National Youth Statement, advocacy alongside the coalition.</p>
        </div>
        <div className="way-card reveal d2">
          <div className="way-stripe" style={{background:'#56b6c2'}}></div>
          <div className="way-num" style={{color:'#56b6c2'}}>05</div>
          <h3>Returning supporters</h3>
          <p>Partners that supported previous LCOYs in Sierra Leone are invited to renew their commitment.</p>
        </div>
        <div className="way-card reveal d3">
          <div className="way-stripe" style={{background:'#e06c75'}}></div>
          <div className="way-num" style={{color:'#e06c75'}}>06</div>
          <h3>Local government</h3>
          <p>In-kind contributions — venues, security, logistics — from city and district councils.</p>
        </div>
      </div>
      <div style={{"textAlign":"center","marginTop":"48px"}} className="reveal">
        <a className="btn btn-primary" onClick={()=>nav('contact')}>Start a partnership conversation →</a>
      </div>
    </div>
  </section>

  
  <section>
    <div className="wrap">
      <div className="cta-band reveal">
        <h2>Stand with the LCOY-SL 2026 coalition</h2>
        <p>A credible, government-recognised, youth-led platform to invest in inclusive climate leadership — and to ensure NDC 3.0 is delivered with the people it most affects.</p>
        <div style={{"display":"flex","gap":"14px","justifyContent":"center","flexWrap":"wrap"}}>
          <a className="btn btn-primary" onClick={()=>nav('register')}>Register as a delegate</a>
          <a className="btn btn-ghost" onClick={()=>nav('about')}>Learn more</a>
        </div>
      </div>
    </div>
  </section>
  </>);

  const Page_about = () => (<>
  <section className="about-hero">
    <div className="about-hero-bg" style={{backgroundImage:"url('photos/F94A1881.jpg')"}}></div>
    <div className="about-hero-overlay"></div>
    <div className="wrap" style={{position:'relative',zIndex:3}}>
      <span className="eyebrow" style={{color:'var(--orange)',fontSize:'1.4rem'}}>About the conference</span>
      <h2 className="about-title">Sierra Leone's climate response is inseparable from its <em className="script-em">youth response</em></h2>
      <p className="about-lead">With over 75% of the population under 35, and ranked among the world's most climate-vulnerable countries, Sierra Leone's young people are not a future stakeholder — they are the present majority who will live with every decision made under NDC 3.0.</p>
    </div>
  </section>

  <section>
    <div className="wrap">
      <div className="about-split">
        <div className="about-col reveal d1">
          <div className="about-col-accent" style={{background:'var(--blue)'}}></div>
          <h3>The climate reality</h3>
          <p>Sierra Leone faces rising sea levels eroding coastal communities, intensifying floods in urban informal settlements, deforestation rates among the highest in West Africa, declining yields for staple crops, and growing pressure on water and sanitation systems.</p>
          <p>These risks fall heaviest on young people, women, children, persons with disabilities, and rural and informal-economy workers — the groups that remain most underrepresented in climate decision-making.</p>
        </div>
        <div className="about-col reveal d2">
          <div className="about-col-accent" style={{background:'var(--orange)'}}></div>
          <h3>A defining window for youth voice</h3>
          <p>In 2025 the Government submitted its updated Nationally Determined Contribution (NDC 3.0), setting a USD 2.974 billion climate roadmap for 2025–2035 with a 1:2 mitigation-to-adaptation financing ratio.</p>
          <p>LCOY-SL 2026 is deliberately timed to land youth-driven recommendations into the early-implementation window of NDC 3.0 — before delivery pathways harden and budget envelopes are fixed.</p>
        </div>
      </div>
    </div>
  </section>

  <section className="objectives-section">
    <div className="wrap">
      <div className="section-head" style={{textAlign:'center',margin:'0 auto 48px',maxWidth:'none'}}>
        <span className="eyebrow" style={{fontSize:'1.6rem',color:'var(--orange)'}}>Goal &amp; objectives</span>
        <h2 style={{color:'#fff',marginTop:'14px'}}>From climate awareness to <em className="script-em">climate architecture</em></h2>
        <p style={{color:'rgba(255,255,255,.75)',maxWidth:'800px',margin:'14px auto 0',fontSize:'1.1rem'}}>To convene Sierra Leone's young climate leaders — across geographies, abilities, gender and economic backgrounds — to produce a unified, evidence-based National Youth Statement that shapes NDC 3.0 implementation and the country's representation at COY21 and COP31.</p>
      </div>
      <div className="obj-grid">
        <div className="obj-card reveal d1"><div className="obj-num">01</div><h3>Strengthen understanding</h3><p>Equip participants to engage substantively with NDC 3.0, the National Adaptation Plan, and the climate finance roadmap — not symbolically.</p></div>
        <div className="obj-card reveal d2"><div className="obj-num">02</div><h3>Bridge inclusion gaps</h3><p>Ensure rural, disabled, female, and informal-economy youth shape the agenda alongside urban activists.</p></div>
        <div className="obj-card reveal d3"><div className="obj-num">03</div><h3>Develop the Statement</h3><p>A costed, evidence-based input into NDC 3.0 implementation with clear policy asks tied to specific sectors.</p></div>
        <div className="obj-card reveal d1"><div className="obj-num">04</div><h3>Build finance literacy</h3><p>A youth cohort able to access, track and influence finance flows under the NDC 3.0 finance architecture.</p></div>
        <div className="obj-card reveal d2"><div className="obj-num">05</div><h3>Deliver community action</h3><p>Mangrove restoration, tree planting and clean-up that demonstrate advocacy matched by practice.</p></div>
        <div className="obj-card reveal d3"><div className="obj-num">06</div><h3>Mobilise stakeholders</h3><p>Government, UN partners, the private sector and civil society around an inclusive, NDC-aligned youth agenda.</p></div>
      </div>
    </div>
  </section>

  <section className="inclusion-section">
    <div className="wrap">
      <div className="inclusion-header reveal">
        <span className="eyebrow">What inclusion means in practice</span>
        <h2>Leaving no youth behind — <em className="script-em">starting with ourselves</em></h2>
      </div>
      <div className="inclusion-grid">
        <div className="inc-card reveal d1">
          <div className="inc-icon" style={{background:'var(--blue)'}}>⊕</div>
          <h3>Geographic</h3>
          <p>Youth from all four regions — rural and peri-urban representation prioritised over Freetown-only attendance.</p>
        </div>
        <div className="inc-card reveal d2">
          <div className="inc-icon" style={{background:'var(--orange)'}}>☆</div>
          <h3>Disability</h3>
          <p>Reserved places, accessible venue, sign language interpretation, and accessible materials.</p>
        </div>
        <div className="inc-card reveal d3">
          <div className="inc-icon" style={{background:'#c678dd'}}>⚥</div>
          <h3>Gender</h3>
          <p>Minimum 50% female participation, dedicated space for young mothers, women's climate networks.</p>
        </div>
        <div className="inc-card reveal d1">
          <div className="inc-icon" style={{background:'var(--green)'}}>⛏</div>
          <h3>Informal economy</h3>
          <p>Trading, artisanal fishing, smallholder farming, waste picking, okada &amp; kekeh transport.</p>
        </div>
        <div className="inc-card reveal d2">
          <div className="inc-icon" style={{background:'#e06c75'}}>⛉</div>
          <h3>Age</h3>
          <p>Structured engagement of children and adolescents in age-appropriate sessions with safeguarding protocols.</p>
        </div>
        <div className="inc-card reveal d3">
          <div className="inc-icon" style={{background:'#56b6c2'}}>Aa</div>
          <h3>Linguistic</h3>
          <p>Facilitation in Krio alongside English. Key materials translated for accessibility.</p>
        </div>
      </div>
    </div>
  </section>

  <section style={{background:'#fff',paddingTop:'25px'}}>
    <div className="wrap">
      <div className="coalition-header reveal" style={{color:'var(--ink)'}}>
        <span className="eyebrow" style={{color:'var(--blue)',fontSize:'1.95rem'}}>The organising coalition</span>
        <p style={{color:'var(--slate)'}}>An alliance of 35 member organisations and 800+ registered individual members, working with a coalition of established youth-led organisations.</p>
      </div>

      <div className="convener-row reveal" style={{borderBottom:'1px solid var(--line)'}}>
        <span className="convener-label">Convened by</span>
        <img src="photos/Logos for host organizations/YCC Sierra Leone Logo.png" alt="YCC-SL" className="convener-logo" />
      </div>

      <div className="coconvener-label reveal">Co-convened by</div>
      <div className="coalition-grid">
        <div className="coalition-card reveal d1">
          <img src="photos/Logos for host organizations/YICA-Logo-png-final.png" alt="YICA-SL" className="coalition-logo" />
        </div>
        <div className="coalition-card reveal d2">
          <img src="photos/Logos for host organizations/ACRG.png" alt="ACRG" className="coalition-logo" />
        </div>
        <div className="coalition-card reveal d3">
          <img src="photos/Logos for host organizations/TOURISM CLUB logo.png" alt="Eco-Tourism Hub" className="coalition-logo" />
        </div>
        <div className="coalition-card reveal d1">
          <img src="photos/Logos for host organizations/FAEICY.jpeg" alt="FAEICY-SL" className="coalition-logo" />
        </div>
        <div className="coalition-card reveal d2">
          <img src="photos/Logos for host organizations/Dear Plastic.jpeg" alt="Dear Plastic" className="coalition-logo" />
        </div>
        <div className="coalition-card reveal d3">
          <img src="photos/Logos for host organizations/FYEA Logo.jpeg" alt="FYEA" className="coalition-logo" />
        </div>
      </div>
    </div>
  </section>
  </>);

  const Page_programme = () => (<>
  <section className="about-hero">
    <div className="about-hero-bg" style={{backgroundImage:"url('photos/F94A1899.jpg')",backgroundPosition:'center 30%'}}></div>
    <div className="about-hero-overlay"></div>
    <div className="wrap" style={{position:'relative',zIndex:3}}>
      <span className="eyebrow" style={{color:'var(--orange)',fontSize:'1.4rem'}}>Programme structure</span>
      <h2 className="about-title">Two connected phases, <em className="script-em">one statement</em></h2>
      <p className="about-lead">A regional consultation phase that grounds the agenda in lived experience, followed by a national conference that consolidates findings into a single National Youth Statement.</p>
    </div>
  </section>

  <section>
    <div className="wrap">
      <div className="grid g3" style={{marginBottom:'0'}}>
        <div className="about-col reveal d1">
          <div className="about-col-accent" style={{background:'var(--blue)'}}></div>
          <div className="tag" style={{color:'var(--blue)',paddingLeft:'16px'}}>Phase 1 · June–July 2026</div>
          <h3>Regional consultations</h3>
          <p>Consultations across the four geographic regions and the Western Area. Each gathers young people from districts, traditional authorities, persons with disabilities, women's groups, youth in agriculture, and youth in informal settlements — producing a regional input paper.</p>
        </div>
        <div className="about-col reveal d2">
          <div className="about-col-accent" style={{background:'var(--orange)'}}></div>
          <div className="tag" style={{color:'var(--orange)',paddingLeft:'16px'}}>Phase 2 · August–September 2026</div>
          <h3>Virtual consultations</h3>
          <p>Online consultations to collect demands and inputs from youth across the country, followed by consolidation of regional and virtual inputs into draft language for the National Youth Statement.</p>
        </div>
        <div className="about-col reveal d3">
          <div className="about-col-accent" style={{background:'#2ecc71'}}></div>
          <div className="tag" style={{color:'#2ecc71',paddingLeft:'16px'}}>Phase 3 · 7–9 October 2026</div>
          <h3>National conference</h3>
          <p>Three programme days in Freetown, including a community action day. The conference floor opens with rural and peri-urban voices already on the table — not added as an afterthought.</p>
        </div>
      </div>
    </div>
  </section>

  <section className="objectives-section">
    <div className="wrap">
      <div className="section-head" style={{textAlign:'center',margin:'0 auto 48px',maxWidth:'none'}}>
        <span className="eyebrow" style={{fontSize:'1.6rem',color:'var(--orange)'}}>The three days</span>
        <h2 style={{color:'#fff',marginTop:'14px'}}>National conference <em className="script-em">programme</em></h2>
      </div>

      <div className="prog-days">
        <div className="prog-day reveal d1">
          <div className="prog-day-num" style={{background:'var(--blue)'}}>1</div>
          <div className="prog-day-body">
            <h3>Diagnose: <em className="script-em">Where We Stand</em></h3>
            <ul>
              <li>Opening ceremony and keynote on Sierra Leone's NDC 3.0 and adaptation outlook</li>
              <li>Panels on adaptation and loss &amp; damage</li>
              <li>Breakout sessions per theme to consolidate regional inputs into draft language</li>
            </ul>
          </div>
        </div>
        <div className="prog-day reveal d2">
          <div className="prog-day-num" style={{background:'var(--orange)'}}>2</div>
          <div className="prog-day-body">
            <h3>Design &amp; <em className="script-em">Deliver</em></h3>
            <ul>
              <li>Workshops on NDC 3.0 finance literacy; UNFCCC and YOUNGO induction</li>
              <li>Hackathon and Idealthon; exhibition of youth-led initiatives</li>
              <li>Multi-stakeholder dialogue with government and partners</li>
              <li>Drafting and adoption of the National Youth Statement 2026</li>
              <li>COY21 / COP31 delegation briefing</li>
            </ul>
          </div>
        </div>
        <div className="prog-day reveal d3">
          <div className="prog-day-num" style={{background:'#2ecc71'}}>3</div>
          <div className="prog-day-body">
            <h3>Demonstrate: <em className="script-em">Community Action</em></h3>
            <ul>
              <li>Mangrove restoration, tree planting and clean-up in Freetown and regional host sites</li>
              <li>Coordinated by YCC-SL with YICA, FAIECY, ACRG, Dear Plastic, FYEA and Eco-Tourism Hub</li>
              <li>Closing ceremony and statement launch</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div className="wrap">
      <div className="section-head" style={{textAlign:'center',margin:'0 auto 48px',maxWidth:'none'}}>
        <span className="eyebrow" style={{fontSize:'1.6rem'}}>Programme principles</span>
        <h2 style={{marginTop:'14px'}}>How the days are <em className="script-em">run</em></h2>
      </div>
      <div className="grid g4">
        <div className="about-col reveal d1" style={{textAlign:'center'}}>
          <div className="inc-icon" style={{background:'#2ecc71',margin:'0 auto 16px'}}>↻</div>
          <h3 style={{paddingLeft:0}}>Participatory</h3>
          <p style={{paddingLeft:0}}>At least 60% of programme time is interactive — workshops, dialogues, breakouts — rather than plenary.</p>
        </div>
        <div className="about-col reveal d2" style={{textAlign:'center'}}>
          <div className="inc-icon" style={{background:'var(--blue)',margin:'0 auto 16px'}}>◑</div>
          <h3 style={{paddingLeft:0}}>Inclusive</h3>
          <p style={{paddingLeft:0}}>Reserved places for young women, persons with disabilities, rural youth and informal traders — quotas tracked publicly.</p>
        </div>
        <div className="about-col reveal d3" style={{textAlign:'center'}}>
          <div className="inc-icon" style={{background:'var(--orange)',margin:'0 auto 16px'}}>⌥</div>
          <h3 style={{paddingLeft:0}}>Bilingual</h3>
          <p style={{paddingLeft:0}}>Materials in English and Krio; sign language interpretation for plenary sessions.</p>
        </div>
        <div className="about-col reveal d1" style={{textAlign:'center'}}>
          <div className="inc-icon" style={{background:'#c678dd',margin:'0 auto 16px'}}>♺</div>
          <h3 style={{paddingLeft:0}}>Sustainable</h3>
          <p style={{paddingLeft:0}}>Minimised printing, reusable signage, locally sourced catering, carbon-conscious logistics.</p>
        </div>
      </div>
    </div>
  </section>
  </>);

  const Page_themes = () => (<>
  <section className="about-hero">
    <div className="about-hero-bg" style={{backgroundImage:"url('photos/F94A1982.jpg')",backgroundPosition:'center 20%'}}></div>
    <div className="about-hero-overlay"></div>
    <div className="wrap" style={{position:'relative',zIndex:3}}>
      <span className="eyebrow" style={{color:'var(--orange)',fontSize:'1.4rem'}}>Thematic areas</span>
      <h2 className="about-title">Every theme mapped to <em className="script-em">NDC 3.0</em></h2>
      <p className="about-lead">So that recommendations speak to existing policy text and actual budget envelopes — not abstract priorities. Each area lands where decisions are actually made.</p>
    </div>
  </section>

  <section>
    <div className="wrap">
      <div className="theme-cards">
        <div className="theme-card reveal d1">
          <div className="theme-stripe" style={{background:'var(--blue)'}}></div>
          <div className="theme-head"><h3>Adaptation, Resilience &amp; Loss &amp; Damage</h3></div>
          <div className="theme-body">
            <div className="theme-tag">NDC 3.0 anchor</div>
            <p>USD 1.95bn adaptation portfolio — coastal protection, mangrove restoration, urban flood protection, climate-resilient WASH and health facilities, the Multi-Hazard Early Warning System, and Loss &amp; Damage.</p>
            <div className="theme-tag">Youth focus</div>
            <p>Community resilience, vulnerability mapping, last-mile early-warning delivery, lived experience of affected communities, and access to L&amp;D mechanisms.</p>
          </div>
        </div>
        <div className="theme-card reveal d2">
          <div className="theme-stripe" style={{background:'#2ecc71'}}></div>
          <div className="theme-head"><h3>Climate Finance &amp; Just Transition</h3></div>
          <div className="theme-body">
            <div className="theme-tag">NDC 3.0 anchor</div>
            <p>Finance roadmap — blended finance, de-risking, green and blue bonds, carbon markets, the public–private split, and just transition / local content principles.</p>
            <div className="theme-tag">Youth focus</div>
            <p>Finance literacy, MRV access, youth-accessible finance windows, and ensuring youth in transitioning sectors are not left behind.</p>
          </div>
        </div>
        <div className="theme-card reveal d3">
          <div className="theme-stripe" style={{background:'var(--orange)'}}></div>
          <div className="theme-head"><h3>Energy, Transport &amp; Green Jobs</h3></div>
          <div className="theme-body">
            <div className="theme-tag">NDC 3.0 anchor</div>
            <p>41.6% energy reduction below BAU (mini-grids, solar home systems, clean cooking) and 16.2% transport reduction (10,000 e-kekehs, 100 e-buses).</p>
            <div className="theme-tag">Youth focus</div>
            <p>Energy access for rural communities, kekeh and okada drivers, green-jobs pipelines, and inclusion in the renewable and e-mobility workforce.</p>
          </div>
        </div>
        <div className="theme-card reveal d1">
          <div className="theme-stripe" style={{background:'#56b6c2'}}></div>
          <div className="theme-head"><h3>Food Systems, Forestry &amp; Nature-Based Solutions</h3></div>
          <div className="theme-body">
            <div className="theme-tag">NDC 3.0 anchor</div>
            <p>AFOLU targets (33.6% reduction below BAU, 200,000 ha forest management, 100,000 ha mangroves) and Feed Salone alignment.</p>
            <div className="theme-tag">Youth focus</div>
            <p>Agroecology, smallholder youth farmers, food sovereignty, community-led restoration, agroforestry, and ecotourism livelihoods.</p>
          </div>
        </div>
        <div className="theme-card reveal d2">
          <div className="theme-stripe" style={{background:'#c678dd'}}></div>
          <div className="theme-head"><h3>Waste, WASH &amp; Circular Economy</h3></div>
          <div className="theme-body">
            <div className="theme-tag">NDC 3.0 anchor</div>
            <p>52.5% waste sector reduction below BAU, landfill methane management, organic waste diversion, and resilient sanitation.</p>
            <div className="theme-tag">Youth focus</div>
            <p>Plastic pollution, circular economy and plastic-to-pavement innovation, informal waste workers, and WASH in informal settlements.</p>
          </div>
        </div>
        <div className="theme-card reveal d3">
          <div className="theme-stripe" style={{background:'#e06c75'}}></div>
          <div className="theme-head"><h3>Inclusive Climate Empowerment (ACE, Gender, Disability &amp; Youth Voice)</h3></div>
          <div className="theme-body">
            <div className="theme-tag">NDC 3.0 anchor</div>
            <p>Education commitments — climate education in curricula, teacher training, greening school operations, gender-transformative indicators, and a human rights-based approach.</p>
            <div className="theme-tag">Youth focus</div>
            <p>School climate clubs, peer education, intergenerational learning, women and girls in leadership, persons with disabilities, and the theme itself.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section className="nys-section">
    <div className="about-hero-bg" style={{backgroundImage:"url('photos/COP29 Photo.jpeg')",backgroundPosition:'center 60%'}}></div>
    <div className="about-hero-overlay"></div>
    <div className="wrap" style={{position:'relative',zIndex:3}}>
      <div className="section-head" style={{textAlign:'center',margin:'0 auto 48px',maxWidth:'none'}}>
        <span className="eyebrow" style={{fontSize:'1.6rem',color:'var(--orange)'}}>The output</span>
        <h2 style={{color:'#fff',marginTop:'14px'}}>The National Youth Statement <em className="script-em">2026</em></h2>
        <p style={{color:'rgba(255,255,255,.75)',maxWidth:'800px',margin:'14px auto 0',fontSize:'1.1rem'}}>Sierra Leone's official youth position to COP31 — a costed, evidence-based document carried forward through the climate policy cycle.</p>
      </div>
      <div className="obj-grid">
        <div className="obj-card reveal d1"><div className="obj-num">→</div><h3>Submitted formally</h3><p>To the Ministry of Environment and Climate Change, the EPA-SL, and Parliament.</p></div>
        <div className="obj-card reveal d2"><div className="obj-num">→</div><h3>Three sector briefs</h3><p>At least three NDC 3.0-aligned policy briefs, timed to the next budget cycle.</p></div>
        <div className="obj-card reveal d3"><div className="obj-num">→</div><h3>Carried to COP31</h3><p>Travels to COY21 and COP31 with a mandated Sierra Leonean youth delegation.</p></div>
      </div>
    </div>
  </section>
  </>);

  const Page_editions = () => (<>
  <section className="about-hero">
    <div className="about-hero-bg" style={{backgroundImage:"url('photos/Past Editions/LCOY 2025 Photos/IMG_0509.JPG.jpeg')",backgroundPosition:'center 40%'}}></div>
    <div className="about-hero-overlay"></div>
    <div className="wrap" style={{position:'relative',zIndex:3}}>
      <span className="eyebrow" style={{color:'var(--orange)',fontSize:'1.4rem'}}>Past editions</span>
      <h2 className="about-title">LCOY-SL 2026 is not a <em className="script-em">first attempt</em></h2>
      <p className="about-lead">Youth recommendations from previous editions were channelled into Sierra Leone's NDC and formally recognised as part of the national submission. The 2026 edition builds on that institutional credibility.</p>
    </div>
  </section>

  <section className="ed-2024-section ed-light">
    <div className="wrap">
      <div className="ed-2024-top reveal">
        <div className="tag" style={{color:'var(--blue)',fontSize:'2rem'}}>Convened by CCIS</div>
        <h3 className="ed-2024-title">LCOY Sierra Leone <span className="ed-year-inline">2024</span></h3>
        <h4 className="ed-2024-theme">Empowering Youth: Innovating for Climate Resilience and <em className="script-em">Global Peace</em></h4>
        <p className="ed-2024-venue">Fourah Bay College, Freetown · 23–24 October 2024</p>
      </div>
      <div className="ed-2024-stats">
        <div className="ed-2024-stat reveal d1"><div className="ed-2024-num" data-count="180" data-suffix="">0</div><div className="ed-2024-label">In-person delegates</div></div>
        <div className="ed-2024-stat reveal d2"><div className="ed-2024-num" data-count="12" data-suffix="">0</div><div className="ed-2024-label">Thematic areas</div></div>
        <div className="ed-2024-stat reveal d3"><div className="ed-2024-num" data-count="5" data-suffix="">0</div><div className="ed-2024-label">Members funded to COP29</div></div>
      </div>
      <div className="ed-2024-highlights reveal">
        <div className="ed-hi"><span className="ed-hi-icon">→</span>National Youth Statement launched after two virtual consultations</div>
        <div className="ed-hi"><span className="ed-hi-icon">→</span>Keynotes from PI-CREF, the Mayor of Freetown, and the UNFCCC National Focal Point</div>
        <div className="ed-hi"><span className="ed-hi-icon">→</span>COP29 side event in Baku with the Minister of Environment and Climate Change</div>
        <div className="ed-hi"><span className="ed-hi-icon">→</span>Field trip to Tacugama Chimpanzee Rehabilitation Sanctuary</div>
      </div>
    </div>
  </section>

  <section style={{padding:'10px 0 60px'}}>
    <div className="wrap">
      <div className="section-head" style={{textAlign:'center',margin:'0 auto 32px',maxWidth:'none'}}>
        <span className="eyebrow" style={{fontSize:'1.6rem'}}>Gallery</span>
        <h2 style={{marginTop:'10px'}}>Moments from LCOY <em className="script-em">2024</em></h2>
      </div>
      <div className="ed-gallery">
        <div className="ed-photo reveal d1"><img src="photos/Past Editions/LCOY 2024 Day 1/Day 1/Main 1.jpg" alt="" /></div>
        <div className="ed-photo reveal d2"><img src="photos/Past Editions/LCOY 2024 Day 1/Day 1/Main 2.jpg" alt="" /></div>
        <div className="ed-photo reveal d3"><img src="photos/Past Editions/LCOY 2024 Day 1/Day 1/Main 3.jpg" alt="" /></div>
        <div className="ed-photo reveal d1"><img src="photos/Past Editions/LCOY 2024 Day 1/Day 1/Main 4.jpg" alt="" /></div>
        <div className="ed-photo reveal d2"><img src="photos/Past Editions/LCOY 2024 Day 2/Day 2/Main 1.jpg" alt="" /></div>
        <div className="ed-photo reveal d3"><img src="photos/Past Editions/LCOY 2024 Day 2/Day 2/Main 2.jpg" alt="" /></div>
        <div className="ed-photo reveal d1"><img src="photos/Past Editions/LCOY 2024 Day 2/Day 2/Main 3.jpg" alt="" /></div>
        <div className="ed-photo reveal d2"><img src="photos/Past Editions/LCOY 2024 Day 2/Day 2/Main 4.jpg" alt="" /></div>
        <div className="ed-photo reveal d3"><img src="photos/Past Editions/LCOY 2024 Field Visit Tacugama/Tacugama/Main 1.jpg" alt="" /></div>
        <div className="ed-photo reveal d1"><img src="photos/Past Editions/LCOY 2024 Field Visit Tacugama/Tacugama/Main 2.jpg" alt="" /></div>
        <div className="ed-photo reveal d2"><img src="photos/Past Editions/LCOY 2024 Field Visit Tacugama/Tacugama/Main 3.jpg" alt="" /></div>
        <div className="ed-photo reveal d3"><img src="photos/Past Editions/LCOY 2024 Field Visit Tacugama/Tacugama/Main 4.jpg" alt="" /></div>
      </div>
    </div>
  </section>

  <section className="ed-2025-banner ed-compact">
    <div className="about-hero-bg" style={{backgroundImage:"url('photos/Past Editions/LCOY 2024 Field Visit Tacugama/Tacugama/F94A2553.jpg')"}}></div>
    <div className="about-hero-overlay"></div>
    <div className="wrap" style={{position:'relative',zIndex:3}}>
      <div className="ed-2024-top reveal">
        <div className="tag" style={{color:'rgba(255,255,255,.7)',fontSize:'2rem'}}>Convened by CCIS</div>
        <h3 className="ed-2024-title" style={{color:'#fff',margin:'2px 0 4px'}}>LCOY Sierra Leone <span style={{color:'var(--orange)'}}>2025</span></h3>
        <p className="ed-2024-venue" style={{color:'rgba(255,255,255,.8)'}}>Full recap and outcomes summary coming soon</p>
      </div>
    </div>
  </section>

  <section style={{padding:'60px 0'}}>
    <div className="wrap">
      <div className="section-head" style={{textAlign:'center',margin:'0 auto 32px',maxWidth:'none'}}>
        <span className="eyebrow" style={{fontSize:'1.6rem'}}>Gallery</span>
        <h2 style={{marginTop:'10px'}}>Moments from LCOY <em className="script-em">2025</em></h2>
      </div>
      <div className="ed-gallery">
        <div className="ed-photo reveal d1"><img src="photos/Past Editions/LCOY 2025 Photos/IMG_0506.JPG.jpeg" alt="" /></div>
        <div className="ed-photo reveal d2"><img src="photos/Past Editions/LCOY 2025 Photos/IMG_0508.JPG.jpeg" alt="" /></div>
        <div className="ed-photo reveal d3"><img src="photos/Past Editions/LCOY 2025 Photos/IMG_0510.JPG.jpeg" alt="" /></div>
        <div className="ed-photo reveal d1"><img src="photos/Past Editions/LCOY 2025 Photos/IMG_0512.JPG.jpeg" alt="" /></div>
        <div className="ed-photo reveal d2"><img src="photos/Past Editions/LCOY 2025 Photos/IMG_0514.JPG.jpeg" alt="" /></div>
        <div className="ed-photo reveal d3"><img src="photos/Past Editions/LCOY 2025 Photos/IMG_0517.JPG.jpeg" alt="" /></div>
        <div className="ed-photo reveal d1"><img src="photos/Past Editions/LCOY 2025 Photos/IMG_0519.JPG.jpeg" alt="" /></div>
        <div className="ed-photo reveal d2"><img src="photos/Past Editions/LCOY 2025 Photos/IMG_0522.JPG.jpeg" alt="" /></div>
      </div>
    </div>
  </section>
  </>);

  const Page_register = () => (<>
  <section className="about-hero">
    <div className="about-hero-bg" style={{backgroundImage:"url('photos/F94A2211.jpg')",backgroundPosition:'center 55%'}}></div>
    <div className="about-hero-overlay"></div>
    <div className="wrap" style={{position:'relative',zIndex:3}}>
      <span className="eyebrow" style={{color:'var(--orange)',fontSize:'1.4rem'}}>Registration</span>
      <h2 className="about-title">Reserve your place at <em className="script-em">LCOY-SL 2026</em></h2>
      <p className="about-lead">Participation is 100% free. Delegate places are limited to 150 and allocated with inclusion quotas.</p>
    </div>
  </section>

  <section>
    <div className="wrap">
      <div className="reg-info-grid">
        <div className="about-col reveal d1">
          <div className="about-col-accent" style={{background:'var(--blue)'}}></div>
          <h3>Who can register</h3>
          <p>Sierra Leonean youth across all four regions, abilities, gender and economic backgrounds. Rural and peri-urban representation is deliberately prioritised.</p>
        </div>
        <div className="about-col reveal d2">
          <div className="about-col-accent" style={{background:'var(--orange)'}}></div>
          <h3>Inclusion quotas</h3>
          <p>Minimum 50% female participation, reserved places for persons with disabilities, and dedicated representation for informal-economy youth.</p>
        </div>
        <div className="about-col reveal d3">
          <div className="about-col-accent" style={{background:'#2ecc71'}}></div>
          <h3>Subsidies &amp; access</h3>
          <p>Full subsidies for marginalised youth, an accessible venue, sign language interpretation, and Krio facilitation alongside English.</p>
        </div>
        <div className="about-col reveal d1">
          <div className="about-col-accent" style={{background:'#c678dd'}}></div>
          <h3>Coalition exhibitor?</h3>
          <p>Exhibition slots are available for youth-led initiatives. Contact the team directly.</p>
        </div>
      </div>
    </div>
  </section>

  <section className="objectives-section">
    <div className="wrap">
      <div style={{textAlign:'center',padding:'40px 0'}}>
        <span className="eyebrow" style={{fontSize:'1.6rem',color:'var(--orange)'}}>Registration</span>
        <h2 style={{color:'#fff',marginTop:'14px',fontSize:'2.4rem'}}>Coming <em className="script-em">soon</em></h2>
        <p style={{color:'rgba(255,255,255,.7)',fontSize:'1.1rem',maxWidth:'600px',margin:'16px auto 0'}}>Registration will open shortly. Follow our channels for updates or contact the team to express your interest.</p>
        <a className="btn btn-primary" style={{marginTop:'24px'}} onClick={()=>nav('contact')}>Contact the team →</a>
      </div>
    </div>
  </section>
  </>);

  const Page_contact = () => (<>
  <section className="about-hero">
    <div className="about-hero-bg" style={{backgroundImage:"url('photos/Past Editions/LCOY 2025 Photos/IMG_0506.JPG.jpeg')",backgroundPosition:'center 40%'}}></div>
    <div className="about-hero-overlay"></div>
    <div className="wrap" style={{position:'relative',zIndex:3}}>
      <span className="eyebrow" style={{color:'var(--orange)',fontSize:'1.4rem'}}>Contact</span>
      <h2 className="about-title">Talk to the LCOY-SL <em className="script-em">2026 team</em></h2>
      <p className="about-lead">For registration, partnership, media or programme enquiries — reach the convening team directly.</p>
    </div>
  </section>

  <section>
    <div className="wrap">
      <div className="contact-info-grid">
        <div className="about-col reveal d1">
          <div className="about-col-accent" style={{background:'var(--blue)'}}></div>
          <h3>Convener</h3>
          <p>Youth Climate Council Sierra Leone (YCC-SL)</p>
        </div>
        <div className="about-col reveal d2">
          <div className="about-col-accent" style={{background:'var(--orange)'}}></div>
          <h3>Email</h3>
          <p><a href="mailto:lcoy@yccsierraleone.org" style={{color:'var(--blue)',fontWeight:600}}>lcoy@yccsierraleone.org</a></p>
        </div>
        <div className="about-col reveal d3">
          <div className="about-col-accent" style={{background:'#2ecc71'}}></div>
          <h3>Main event</h3>
          <p>Freetown, Sierra Leone · 7–9 October 2026</p>
        </div>
        <div className="about-col reveal d1">
          <div className="about-col-accent" style={{background:'#c678dd'}}></div>
          <h3>Mandate</h3>
          <p>Endorsed host of LCOY Sierra Leone 2026 by the YOUNGO LCOY Working Group</p>
        </div>
      </div>
    </div>
  </section>

  <section className="objectives-section">
    <div className="wrap">
      <div className="section-head" style={{textAlign:'center',margin:'0 auto 36px',maxWidth:'none'}}>
        <span className="eyebrow" style={{fontSize:'1.4rem',color:'var(--orange)'}}>Get in touch</span>
        <h2 style={{color:'#fff',marginTop:'10px'}}>Send us a <em className="script-em">message</em></h2>
      </div>
      <div className="reg-form-centered">
        <div className="form-card reveal" style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',backdropFilter:'blur(8px)'}}>
          <div className="success" id="msg-success" style={{display:msgOk?"block":"none"}}>Message recorded — the team will respond by email.</div>
          <div className="field"><label htmlFor="cn" style={{color:'rgba(255,255,255,.8)'}}>Name</label><input id="cn" type="text" placeholder="Your name" className="dark-input" /></div>
          <div className="field"><label htmlFor="ce" style={{color:'rgba(255,255,255,.8)'}}>Email</label><input id="ce" type="email" placeholder="you@email.com" className="dark-input" /></div>
          <div className="field"><label htmlFor="ct" style={{color:'rgba(255,255,255,.8)'}}>I'm reaching out about</label>
            <select id="ct" className="dark-input"><option>Registration</option><option>Partnership / sponsorship</option><option>Media</option><option>Programme / speaking</option><option>Volunteering</option><option>Other</option></select>
          </div>
          <div className="field"><label htmlFor="cm" style={{color:'rgba(255,255,255,.8)'}}>Message</label><textarea id="cm" rows="5" placeholder="How can we help?" className="dark-input"></textarea></div>
          <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} onClick={submitMsg}>Send message</button>
          <p className="note" style={{color:'rgba(255,255,255,.5)'}}>Prototype only — wire this to your inbox or form backend on deployment.</p>
        </div>
      </div>
    </div>
  </section>
  </>);

  const STEERING = [
    { name: 'Hassan Hindolo Senesie', role: 'Steering Committee Member', org: 'Youth Climate Council Sierra Leone', photo: 'photos/Streering Committee/Hassan Hindolo Senesie - Youth Climate Council Sierra Leone.jpeg' },
    { name: 'Foday Mark Kamara', role: 'Steering Committee Member', org: 'Youth Climate Council Global Alliance', photo: 'photos/Streering Committee/Foday Mark Kamara - Youth Climate Council Global Alliance.JPG' },
    { name: 'Allieu Christopher Moiwa', role: 'Steering Committee Member', org: 'Action for Community Resilience Group', photo: 'photos/Streering Committee/Allieu Christopher Moiwa - Action for Community Resillience Group.jpg' },
    { name: 'Foday Kanneh', role: 'Steering Committee Member', org: 'Youth Climate Council Sierra Leone', photo: 'photos/Streering Committee/Foday Kanneh - Youth Climate Council Sierra Leone.jpg' },
    { name: 'Esther Yealie Kamara', role: 'Steering Committee Member', org: 'Youth Initiative for Climate Action', photo: 'photos/Streering Committee/Esther Yealie Kamara - Youth Initiative for Climate Action.jpg' },
    { name: 'Francis Magona Bassie', role: 'Steering Committee Member', org: 'Forum for Agriculture, Innovation and Empowerment for Children and Youth', photo: 'photos/Streering Committee/Francis Magona Bassie - Forum for Agriculture, Innovation and Empowerment for Children and Youth.jpeg' },
    { name: 'Joshua Damon Vandi', role: 'Steering Committee Member', org: 'Eco Tourism Hub', photo: 'photos/Streering Committee/Joshua Damon Vandi - Eco Tourism Hub.jpeg' },
    { name: 'Alpha Amadu Jalloh', role: 'Steering Committee Member', org: 'Dear Plastic', photo: 'photos/Streering Committee/Alpha Amadu Jalloh - Dear Plastic.jpeg' },
    { name: 'Sydnella L.E Pratt', role: 'Steering Committee Member', org: 'Youth Climate Council Freetown Chapter', photo: 'photos/Streering Committee/Sydnella Latilewa Elizabeth Pratt - Youth Climate Council Freetown Chapter.JPG' },
  ];
  const VOLUNTEERS = [
    { name: 'Fatmata Foday Kamara', group: 'Logistics', photo: 'photos/Streering Committee/Volunteers/Fatmata Foday Kamara - Logistics.jpeg' },
    { name: 'Mariama Sangarie', group: 'Logistics', photo: 'photos/Streering Committee/Volunteers/Mariama Sangarie - Logistics.jpeg' },
    { name: 'Cornelius Taylor', group: 'Logistics', photo: 'photos/Streering Committee/Volunteers/Cornelius Taylor - Logistics.jpeg' },
    { name: 'Rashidatu Umarr', group: 'Programme & Policy', photo: 'photos/Streering Committee/Volunteers/Rashidatu Umarr - Programmes and Policy.jpeg' },
    { name: 'Abass Mohamed Sesay', group: 'Programme & Policy', photo: 'photos/Streering Committee/Volunteers/Abass Mohamed Sesay- Programmes and Policy.jpeg' },
    { name: 'James Thullah', group: 'Programme & Policy', photo: 'photos/Streering Committee/Volunteers/James Thullah - Programmes and Policy.jpeg' },
    { name: 'Hawanatu Mary Smith', group: 'Finance, Partnerships & Fundraising', photo: 'photos/Streering Committee/Volunteers/Hawanatu Mary Smith - Partnerships.jpeg' },
    { name: 'Kadijatu Bah', group: 'Finance, Partnerships & Fundraising', photo: 'photos/Streering Committee/Volunteers/Kadijatu Bah - Partnerships.jpeg' },
    { name: 'Grace Lizzy Tatiana Sesay', group: 'Finance, Partnerships & Fundraising', photo: 'photos/Streering Committee/Volunteers/Grace Lizzy Tatiana Sesay - Partnerships.jpeg' },
    { name: 'Francis Sahid Sao', group: 'Participation', photo: 'photos/Streering Committee/Volunteers/Francis Sahid Sao - Participation.jpeg' },
    { name: 'Kadijatu J. Conteh', group: 'Participation', photo: 'photos/Streering Committee/Volunteers/Kadijatu J. Conteh - Participation.jpeg' },
    { name: 'Alieu Barrie', group: 'Participation', photo: 'photos/Streering Committee/Volunteers/Alieu Barrie - Participation.jpeg' },
    { name: 'Susie Hannah Bangura', group: 'Participation', photo: 'photos/Streering Committee/Volunteers/Susie Hannah Bangura - Participation.jpeg' },
    { name: 'Steven Perry Nyandebo', group: 'Participation', photo: 'photos/Streering Committee/Volunteers/Steven Perry Nyandebo - Participation.jpeg' },
    { name: 'Samantha Konneh', group: 'Participation', photo: 'photos/Streering Committee/Volunteers/Samantha Konneh - Participation.jpeg' },
  ];

  const drawFlyer = async (canvas, ctx, member, heading1, heading2) => {
    const W = canvas.width, H = canvas.height, CX = W / 2;
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0B2233'); bg.addColorStop(1, '#005091');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    ctx.beginPath(); ctx.arc(W * 0.8, H * 0.18, 400, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.2, H * 0.82, 350, 0, Math.PI * 2); ctx.fill();
    const logo = new Image();
    await new Promise((r, j) => { logo.onload = r; logo.onerror = j; logo.src = '/photos/LCOY-2026-Logo.png'; });
    const lh = 100, lw = (logo.width / logo.height) * lh, lp = 12;
    const bw = lw + lp * 2, bh = lh + lp * 2, lx = (W - bw) / 2, ly = 55;
    ctx.save(); const lr = 14;
    ctx.beginPath(); ctx.moveTo(lx+lr,ly); ctx.lineTo(lx+bw-lr,ly); ctx.quadraticCurveTo(lx+bw,ly,lx+bw,ly+lr); ctx.lineTo(lx+bw,ly+bh-lr); ctx.quadraticCurveTo(lx+bw,ly+bh,lx+bw-lr,ly+bh); ctx.lineTo(lx+lr,ly+bh); ctx.quadraticCurveTo(lx,ly+bh,lx,ly+bh-lr); ctx.lineTo(lx,ly+lr); ctx.quadraticCurveTo(lx,ly,lx+lr,ly); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
    ctx.drawImage(logo, lx + lp, ly + lp, lw, lh); ctx.restore();
    ctx.fillStyle = '#FE9A02'; ctx.font = '900 22px Outfit'; ctx.textAlign = 'center';
    ctx.fillText(heading1, CX, 215);
    ctx.fillStyle = '#fff'; ctx.font = '700 30px Outfit';
    ctx.fillText(heading2, CX, 252);
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(300, 268); ctx.lineTo(900, 268); ctx.stroke();
    if (member.photo) {
      const ph = new Image();
      await new Promise((r, j) => { ph.onload = r; ph.onerror = j; ph.src = member.photo; });
      const pw = 680, pht = 850, px = (W - pw) / 2, py = 285;
      ctx.save(); const pr = 36;
      ctx.beginPath(); ctx.moveTo(px+10,py); ctx.lineTo(px+pw-pr,py); ctx.quadraticCurveTo(px+pw,py,px+pw,py+pr); ctx.lineTo(px+pw,py+pht-10); ctx.lineTo(px+pw-10,py+pht); ctx.lineTo(px+pr,py+pht); ctx.quadraticCurveTo(px,py+pht,px,py+pht-pr); ctx.lineTo(px,py+10); ctx.closePath(); ctx.clip();
      const sc = Math.max(pw / ph.width, pht / ph.height);
      ctx.drawImage(ph, px + (pw - ph.width * sc) / 2, py + (pht - ph.height * sc) / 2, ph.width * sc, ph.height * sc);
      ctx.restore();
      ctx.strokeStyle = '#0072C6'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(px+10,py); ctx.lineTo(px+pw-pr,py); ctx.quadraticCurveTo(px+pw,py,px+pw,py+pr); ctx.lineTo(px+pw,py+pht-10); ctx.lineTo(px+pw-10,py+pht); ctx.lineTo(px+pr,py+pht); ctx.quadraticCurveTo(px,py+pht,px,py+pht-pr); ctx.lineTo(px,py+10); ctx.closePath(); ctx.stroke();
    }
    ctx.fillStyle = '#fff'; ctx.font = '800 52px Outfit'; ctx.textAlign = 'center';
    ctx.fillText(member.name, CX, 1210);
    ctx.fillStyle = '#FE9A02'; ctx.font = '600 28px Outfit';
    const roleText = heading1 === 'LEADERSHIP' ? heading2 + ' MEMBER' : heading2 + ' WORKING GROUP MEMBER';
    ctx.fillText(roleText, CX, 1255);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '500 26px Outfit';
    ctx.fillText(member.org || '', CX, 1295);
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(300, 1325); ctx.lineTo(900, 1325); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '700 28px Outfit';
    ctx.fillText('LCOY SIERRA LEONE 2026', CX, 1365);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '500 22px Outfit';
    ctx.fillText('Freetown, Sierra Leone · 7–9 October 2026', CX, 1400);
    ctx.fillStyle = '#FE9A02'; ctx.font = '900 20px Outfit';
    ctx.fillText('RECOGNISED BY YOUNGO UNDER THE UNFCCC', CX, 1445);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '500 18px Outfit';
    ctx.fillText('Inclusive Climate Action: Leaving No Youth Behind', CX, 1475);
  };

  const saveFlyer = async (member) => { try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1200; canvas.height = 1500;
    await drawFlyer(canvas, ctx, member, 'LEADERSHIP', 'STEERING COMMITTEE');
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = member.name.replace(/\s+/g, '_') + '_LCOY2026.png';
      link.href = url; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, 'image/png');
  } catch(e) { alert('Error: ' + e.message); } };

  const saveVolFlyer = async (member, group) => { try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1200; canvas.height = 1500;
    await drawFlyer(canvas, ctx, member, 'SUPPORT TEAM', group.toUpperCase());
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = member.name.replace(/\s+/g, '_') + '_LCOY2026.png';
      link.href = url; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, 'image/png');
  } catch(e) { alert('Error: ' + e.message); } };

  const Page_team = () => (<>
  <section className="about-hero">
    <div className="about-hero-bg" style={{backgroundImage:"url('photos/Past Editions/LCOY 2024 Day 2/Day 2/Main 2.jpg')",backgroundPosition:'center 55%'}}></div>
    <div className="about-hero-overlay"></div>
    <div className="wrap" style={{position:'relative',zIndex:3}}>
      <span className="eyebrow" style={{color:'var(--orange)',fontSize:'1.4rem'}}>The team</span>
      <h2 className="about-title">The people behind <em className="script-em">LCOY-SL 2026</em></h2>
      <p className="about-lead">A coalition of passionate young climate leaders working to make LCOY Sierra Leone 2026 a reality.</p>
    </div>
  </section>

  <section>
    <div className="wrap">
      <div className="section-head" style={{textAlign:'center',margin:'0 auto 48px',maxWidth:'none'}}>
        <span className="eyebrow" style={{fontSize:'1.6rem'}}>Leadership</span>
        <h2 style={{marginTop:'14px'}}>Steering <em className="script-em">Committee</em></h2>
      </div>
      <div className="team-grid">
        {STEERING.map((m,i)=>(
          <div className={"team-card reveal d"+(i%3+1)} key={i} onClick={()=>saveFlyer(m)} style={{cursor:'pointer'}}>
            <div className="team-avatar">{m.photo ? <img src={m.photo} alt={m.name} /> : m.name.split(' ').map(w=>w[0]).join('')}</div>
            <div className="team-card-info">
              <h3 className="team-name">{m.name}</h3>
              <div className="team-role">{m.role}</div>
              <div className="team-org">{m.org}</div>
              <div className="team-save-hint">Tap to save flyer</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>

  <section className="objectives-section">
    <div className="wrap">
      <div className="section-head" style={{textAlign:'center',margin:'0 auto 36px',maxWidth:'none'}}>
        <span className="eyebrow" style={{fontSize:'1.6rem',color:'var(--orange)'}}>Support team</span>
        <h2 style={{color:'#fff',marginTop:'14px'}}>Working Group Volunteers</h2>
      </div>
      <div className="team-grid">
        {VOLUNTEERS.map((v,i)=>(
          <div className={"team-card reveal d"+(i%3+1)} key={i} onClick={()=>saveVolFlyer(v,v.group)} style={{cursor:'pointer'}}>
            <div className="team-avatar">{v.photo ? <img src={v.photo} alt={v.name} /> : v.name.split(' ').map(w=>w[0]).join('')}</div>
            <div className="team-card-info">
              <h3 className="team-name">{v.name}</h3>
              <div className="team-role">{v.group}</div>
              <div className="team-save-hint">Tap to save flyer</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
  </>);

  const pages = { home:Page_home,about:Page_about,programme:Page_programme,themes:Page_themes,editions:Page_editions,team:Page_team,register:Page_register,contact:Page_contact };

  return (
    <>
      {header}
      <div className="page active" key={page}>
        {pages[page]()}
      </div>
      {footer}
    </>
  );
}
