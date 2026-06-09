import { useState, useEffect } from "react";

// ─── FLAGS ────────────────────────────────────────────────────────────────────
const FLAGS = {
  "México":"🇲🇽","África do Sul":"🇿🇦","Coreia do Sul":"🇰🇷","República Tcheca":"🇨🇿",
  "Canadá":"🇨🇦","Bósnia e Herzegovina":"🇧🇦","Catar":"🇶🇦","Suíça":"🇨🇭",
  "Brasil":"🇧🇷","Marrocos":"🇲🇦","Haiti":"🇭🇹","Escócia":"🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Estados Unidos":"🇺🇸","Paraguai":"🇵🇾","Austrália":"🇦🇺","Turquia":"🇹🇷",
  "Alemanha":"🇩🇪","Curaçao":"🇨🇼","Costa do Marfim":"🇨🇮","Equador":"🇪🇨",
  "Holanda":"🇳🇱","Japão":"🇯🇵","Suécia":"🇸🇪","Tunísia":"🇹🇳",
  "Bélgica":"🇧🇪","Egito":"🇪🇬","Irã":"🇮🇷","Nova Zelândia":"🇳🇿",
  "Espanha":"🇪🇸","Cabo Verde":"🇨🇻","Arábia Saudita":"🇸🇦","Uruguai":"🇺🇾",
  "França":"🇫🇷","Senegal":"🇸🇳","Iraque":"🇮🇶","Noruega":"🇳🇴",
  "Argentina":"🇦🇷","Argélia":"🇩🇿","Áustria":"🇦🇹","Jordânia":"🇯🇴",
  "Portugal":"🇵🇹","Rep. Dem. do Congo":"🇨🇩","Uzbequistão":"🇺🇿","Colômbia":"🇨🇴",
  "Inglaterra":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Croácia":"🇭🇷","Gana":"🇬🇭","Panamá":"🇵🇦",
};

const GROUPS = {
  A:["México","África do Sul","Coreia do Sul","República Tcheca"],
  B:["Canadá","Bósnia e Herzegovina","Catar","Suíça"],
  C:["Brasil","Marrocos","Haiti","Escócia"],
  D:["Estados Unidos","Paraguai","Austrália","Turquia"],
  E:["Alemanha","Curaçao","Costa do Marfim","Equador"],
  F:["Holanda","Japão","Suécia","Tunísia"],
  G:["Bélgica","Egito","Irã","Nova Zelândia"],
  H:["Espanha","Cabo Verde","Arábia Saudita","Uruguai"],
  I:["França","Senegal","Iraque","Noruega"],
  J:["Argentina","Argélia","Áustria","Jordânia"],
  K:["Portugal","Rep. Dem. do Congo","Uzbequistão","Colômbia"],
  L:["Inglaterra","Croácia","Gana","Panamá"],
};

const ALL_TEAMS = Object.keys(FLAGS);
const MEDAL = ["#FFD700","#C0C0C0","#CD7F32"];
const ADMIN_PASS = "copa2026";

const calcPontos = (pA, pB, rA, rB) => {
  if (pA === rA && pB === rB) return 5;
  const vP = pA > pB ? "A" : pB > pA ? "B" : "E";
  const vR = rA > rB ? "A" : rB > rA ? "B" : "E";
  return vP === vR ? 3 : 0;
};

const initials = (name) => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
const load = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]           = useState(() => load("bolao_user", null));
  const [matches, setMatches]     = useState(() => load("bolao_matches", []));
  const [players, setPlayers]     = useState(() => load("bolao_players", []));
  const [predictions, setPreds]   = useState(() => load("bolao_preds", {}));
  const [screen, setScreen]       = useState("home");
  const [modal, setModal]         = useState(null); // { type: "predict"|"admin_match"|"admin_result", data }

  useEffect(() => { save("bolao_matches", matches); }, [matches]);
  useEffect(() => { save("bolao_players", players); }, [players]);
  useEffect(() => { save("bolao_preds", predictions); }, [predictions]);
  useEffect(() => { if (user) save("bolao_user", user); }, [user]);

  // Register / Login
  if (!user) return <RegisterScreen onRegister={(u) => {
    const exists = players.find(p => p.id === u.id);
    if (!exists) { const np = [...players, u]; setPlayers(np); }
    setUser(u);
  }} players={players} />;

  // My points from predictions
  const myPts = Object.entries(predictions[user.id] || {}).reduce((acc, [id, pred]) => {
    const m = matches.find(x => x.id === id);
    if (m?.finalizado && m.placarA !== null) return acc + calcPontos(pred.placarA, pred.placarB, m.placarA, m.placarB);
    return acc;
  }, 0) + (user.bonusPoints || 0);

  // Ranking
  const ranking = [...players].map(p => {
    const pts = Object.entries(predictions[p.id] || {}).reduce((acc, [id, pred]) => {
      const m = matches.find(x => x.id === id);
      if (m?.finalizado && m.placarA !== null) return acc + calcPontos(pred.placarA, pred.placarB, m.placarA, m.placarB);
      return acc;
    }, 0) + (p.bonusPoints || 0);
    const exatos = Object.entries(predictions[p.id] || {}).filter(([id, pred]) => {
      const m = matches.find(x => x.id === id);
      return m?.finalizado && calcPontos(pred.placarA, pred.placarB, m.placarA, m.placarB) === 5;
    }).length;
    return { ...p, pontos: pts, exatos };
  }).sort((a,b) => b.pontos - a.pontos || b.exatos - a.exatos);

  const myRank = ranking.findIndex(p => p.id === user.id) + 1;

  const savePrediction = (matchId, pA, pB) => {
    setPreds(prev => ({ ...prev, [user.id]: { ...(prev[user.id]||{}), [matchId]: { placarA: pA, placarB: pB } } }));
  };

  const updateMatch = (m) => setMatches(prev => prev.map(x => x.id === m.id ? m : x));
  const addMatch    = (m) => setMatches(prev => [...prev, { ...m, id: Date.now().toString(), placarA: null, placarB: null, finalizado: false }]);
  const deleteMatch = (id) => setMatches(prev => prev.filter(x => x.id !== id));

  return (
    <Shell screen={screen} setScreen={setScreen} user={user} myPts={myPts} myRank={myRank} onLogout={() => { save("bolao_user",null); setUser(null); }}>
      {screen === "home"   && <HomeScreen   user={user} myPts={myPts} myRank={myRank} matches={matches} setScreen={setScreen} />}
      {screen === "jogos"  && <JogosScreen  user={user} matches={matches} predictions={predictions[user.id]||{}} onPredict={(m) => setModal({ type:"predict", data:m })} />}
      {screen === "ranking"&& <RankingScreen ranking={ranking} userId={user.id} />}
      {screen === "perfil" && <PerfilScreen user={user} matches={matches} predictions={predictions[user.id]||{}} myPts={myPts} myRank={myRank} />}
      {screen === "admin"  && <AdminScreen  matches={matches} onAdd={addMatch} onUpdate={updateMatch} onDelete={deleteMatch} onEditMatch={(m) => setModal({type:"admin_match", data:m})} onResultMatch={(m) => setModal({type:"admin_result", data:m})} />}

      {modal?.type === "predict"       && <PredictModal match={modal.data} existing={predictions[user.id]?.[modal.data.id]} onSave={(a,b) => { savePrediction(modal.data.id, a, b); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.type === "admin_match"   && <AdminMatchModal match={modal.data} onSave={(m) => { updateMatch(m); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.type === "admin_result"  && <AdminResultModal match={modal.data} onSave={(m) => { updateMatch(m); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.type === "admin_new"     && <AdminMatchModal match={null} onSave={(m) => { addMatch(m); setModal(null); }} onClose={() => setModal(null)} />}
    </Shell>
  );
}

// ─── SHELL ────────────────────────────────────────────────────────────────────
function Shell({ children, screen, setScreen, user, myPts, myRank, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <div style={{ fontFamily:"'Rajdhani','Barlow Condensed',sans-serif", background:"#020818", minHeight:"100vh", color:"#e8f4fd", maxWidth:430, margin:"0 auto", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"fixed", top:-100, left:-100, width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(0,200,100,0.08),transparent 70%)", pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:-50, right:-50, width:250, height:250, borderRadius:"50%", background:"radial-gradient(circle,rgba(0,120,255,0.08),transparent 70%)", pointerEvents:"none", zIndex:0 }} />

      {/* Header */}
      <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(2,8,24,0.95)", borderBottom:"1px solid rgba(0,200,100,0.2)", backdropFilter:"blur(12px)", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>⚽</span>
          <div>
            <div style={{ fontSize:18, fontWeight:800, letterSpacing:2, color:"#00e676", lineHeight:1 }}>CRAQUE</div>
            <div style={{ fontSize:10, letterSpacing:4, color:"#4fc3f7", opacity:0.8 }}>DA COPA 2026</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, color:"#78909c", letterSpacing:1 }}>PONTOS</div>
            <div style={{ fontSize:20, fontWeight:800, color:"#FFD700" }}>{myPts}</div>
          </div>
          <div onClick={() => setShowMenu(v=>!v)} style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#00e676,#4fc3f7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#020818", cursor:"pointer", position:"relative" }}>
            {initials(user.nome)}
            {showMenu && (
              <div style={{ position:"absolute", top:44, right:0, background:"#0d1f3c", border:"1px solid rgba(0,230,118,0.2)", borderRadius:12, padding:"6px 0", minWidth:160, zIndex:100 }}>
                <MenuItem label="🏠 Home"    onClick={() => { setScreen("home");   setShowMenu(false); }} />
                <MenuItem label="⚽ Jogos"   onClick={() => { setScreen("jogos");  setShowMenu(false); }} />
                <MenuItem label="🏆 Ranking" onClick={() => { setScreen("ranking");setShowMenu(false); }} />
                <MenuItem label="👤 Perfil"  onClick={() => { setScreen("perfil"); setShowMenu(false); }} />
                <MenuItem label="🔧 Admin"   onClick={() => { setScreen("admin");  setShowMenu(false); }} />
                <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", margin:"4px 0" }} />
                <MenuItem label="🚪 Sair" onClick={onLogout} color="#ef5350" />
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ padding:"0 0 80px 0", position:"relative", zIndex:1 }}>{children}</div>

      {/* Bottom nav */}
      <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"rgba(2,8,24,0.97)", borderTop:"1px solid rgba(0,200,100,0.2)", display:"flex", backdropFilter:"blur(16px)", zIndex:50 }}>
        {[{id:"home",icon:"🏠",label:"Home"},{id:"jogos",icon:"⚽",label:"Jogos"},{id:"ranking",icon:"🏆",label:"Ranking"},{id:"perfil",icon:"👤",label:"Perfil"},{id:"admin",icon:"🔧",label:"Admin"}].map(tab => (
          <button key={tab.id} onClick={() => setScreen(tab.id)} style={{ flex:1, padding:"10px 0", border:"none", background:"transparent", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, borderTop:screen===tab.id?"2px solid #00e676":"2px solid transparent" }}>
            <span style={{ fontSize:16 }}>{tab.icon}</span>
            <span style={{ fontSize:9, letterSpacing:1, color:screen===tab.id?"#00e676":"#546e7a", fontWeight:600 }}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function MenuItem({ label, onClick, color }) {
  return <div onClick={onClick} style={{ padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:600, color:color||"#e8f4fd", letterSpacing:0.5 }}>{label}</div>;
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
function RegisterScreen({ onRegister, players }) {
  const [tab, setTab]       = useState("new"); // "new" | "existing"
  const [nome, setNome]     = useState("");
  const [email, setEmail]   = useState("");
  const [senha, setSenha]   = useState("");
  const [erro, setErro]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleNew = () => {
    if (!nome.trim()) return setErro("Digite seu nome completo.");
    if (!email.trim()) return setErro("Digite seu e-mail.");
    if (senha.length < 4) return setErro("Senha deve ter ao menos 4 caracteres.");
    if (players.find(p => p.email === email.toLowerCase())) return setErro("E-mail já cadastrado. Faça login.");
    setLoading(true);
    setTimeout(() => {
      onRegister({ id: Date.now().toString(), nome: nome.trim(), email: email.toLowerCase(), senha, pontos: 0, bonusPoints: 0 });
      setLoading(false);
    }, 800);
  };

  const handleLogin = () => {
    const p = players.find(x => x.email === email.toLowerCase());
    if (!p) return setErro("E-mail não encontrado.");
    if (p.senha !== senha) return setErro("Senha incorreta.");
    setLoading(true);
    setTimeout(() => { onRegister(p); setLoading(false); }, 600);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#020818", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, fontFamily:"'Rajdhani',sans-serif", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:"20%", left:"50%", transform:"translate(-50%,-50%)", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(0,200,100,0.12),transparent 70%)", pointerEvents:"none" }} />

      {/* Logo */}
      <div style={{ textAlign:"center", marginBottom:36 }}>
        <div style={{ fontSize:56, marginBottom:8 }}>⚽</div>
        <div style={{ fontSize:38, fontWeight:900, letterSpacing:4, color:"#00e676", lineHeight:1 }}>CRAQUE</div>
        <div style={{ fontSize:14, letterSpacing:8, color:"#4fc3f7" }}>DA COPA 2026</div>
      </div>

      {/* Tab */}
      <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", borderRadius:12, padding:4, marginBottom:24, width:"100%", maxWidth:320 }}>
        {[["new","Cadastrar"],["login","Entrar"]].map(([t,l]) => (
          <button key={t} onClick={() => { setTab(t); setErro(""); }} style={{ flex:1, padding:"10px 0", borderRadius:9, border:"none", background:tab===t?"linear-gradient(90deg,#00c853,#00e676)":"transparent", color:tab===t?"#020818":"#546e7a", fontWeight:800, fontSize:13, letterSpacing:1, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
        ))}
      </div>

      <div style={{ width:"100%", maxWidth:320, display:"flex", flexDirection:"column", gap:12 }}>
        {tab === "new" && (
          <Input label="SEU NOME COMPLETO" value={nome} onChange={setNome} placeholder="Ex: João da Silva" />
        )}
        <Input label="E-MAIL" value={email} onChange={setEmail} placeholder="email@exemplo.com" type="email" />
        <Input label="SENHA" value={senha} onChange={setSenha} placeholder="Mínimo 4 caracteres" type="password" />

        {erro && <div style={{ background:"rgba(239,83,80,0.1)", border:"1px solid rgba(239,83,80,0.3)", borderRadius:10, padding:"10px 14px", color:"#ef5350", fontSize:12 }}>⚠️ {erro}</div>}

        <button onClick={tab==="new" ? handleNew : handleLogin} disabled={loading} style={{ padding:"16px", borderRadius:14, border:"none", background:"linear-gradient(90deg,#00c853,#00e676)", color:"#020818", fontSize:15, fontWeight:800, letterSpacing:2, cursor:"pointer", fontFamily:"inherit", marginTop:4, opacity:loading?0.7:1 }}>
          {loading ? "AGUARDE..." : tab==="new" ? "CRIAR CONTA" : "ENTRAR"}
        </button>
      </div>

      <div style={{ marginTop:28, fontSize:11, color:"#37474f", textAlign:"center", letterSpacing:1 }}>SEM APOSTAS REAIS · APENAS DIVERSÃO</div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({ user, myPts, myRank, matches, setScreen }) {
  const nextMatch = matches.find(m => !m.finalizado);
  return (
    <div style={{ padding:"20px 16px 0" }}>
      {/* Hero */}
      <div style={{ borderRadius:20, background:"linear-gradient(135deg,#0a2e1a,#0d1f3c)", border:"1px solid rgba(0,230,118,0.2)", padding:"24px 20px", marginBottom:20, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-20, right:-20, fontSize:80, opacity:0.06 }}>🏆</div>
        <div style={{ fontSize:11, letterSpacing:3, color:"#4fc3f7", marginBottom:6 }}>BEM-VINDO DE VOLTA</div>
        <div style={{ fontSize:22, fontWeight:800, lineHeight:1.3, marginBottom:16 }}>
          Olá, <span style={{ color:"#00e676" }}>{user.nome.split(" ")[0]}</span>! {myRank === 1 ? "👑 Você lidera!" : `Você está em ${myRank}º lugar 🔥`}
        </div>
        <div style={{ display:"flex", gap:20 }}>
          <Stat label="PONTOS" value={myPts} color="#00e676" />
          <Stat label="RANKING" value={`${myRank}º`} color="#FFD700" />
          <Stat label="PALPITES" value={Object.keys({}).length} color="#4fc3f7" />
        </div>
      </div>

      {/* Next match */}
      {nextMatch ? (
        <div style={{ marginBottom:20 }}>
          <SectionTitle>PRÓXIMO JOGO</SectionTitle>
          <div style={{ borderRadius:16, background:"rgba(13,31,60,0.8)", border:"1px solid rgba(79,195,247,0.2)", padding:"16px 20px" }}>
            <div style={{ fontSize:11, letterSpacing:2, color:"#4fc3f7", marginBottom:12 }}>
              Grupo {nextMatch.grupo} {nextMatch.data ? `· ${nextMatch.data}` : ""} {nextMatch.hora ? `· ${nextMatch.hora}` : ""}
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ flex:1, textAlign:"center" }}>
                <div style={{ fontSize:28 }}>{FLAGS[nextMatch.timeA]||"🏳️"}</div>
                <div style={{ fontSize:13, fontWeight:700 }}>{nextMatch.timeA}</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:11, color:"#546e7a", letterSpacing:2, marginBottom:6 }}>VS</div>
                <button onClick={() => setScreen("jogos")} style={{ padding:"8px 14px", borderRadius:10, border:"none", background:"linear-gradient(90deg,#00c853,#00e676)", color:"#020818", fontSize:11, fontWeight:800, letterSpacing:2, cursor:"pointer", fontFamily:"inherit" }}>PALPITAR</button>
              </div>
              <div style={{ flex:1, textAlign:"center" }}>
                <div style={{ fontSize:28 }}>{FLAGS[nextMatch.timeB]||"🏳️"}</div>
                <div style={{ fontSize:13, fontWeight:700 }}>{nextMatch.timeB}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom:20, borderRadius:16, background:"rgba(13,31,60,0.5)", border:"1px solid rgba(255,255,255,0.05)", padding:"20px", textAlign:"center", color:"#546e7a", fontSize:13 }}>
          Nenhum jogo cadastrado ainda.<br/><span style={{ color:"#00e676" }}>Admin → Cadastrar Jogos</span>
        </div>
      )}

      {/* Quick actions */}
      <SectionTitle>AÇÕES RÁPIDAS</SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {[
          { icon:"⚽", label:"Ver Jogos",   sub:"Todos os confrontos", screen:"jogos",   color:"#00e676" },
          { icon:"🏆", label:"Ranking",     sub:"Veja sua posição",    screen:"ranking", color:"#FFD700" },
          { icon:"👤", label:"Meu Perfil",  sub:"Seus palpites",       screen:"perfil",  color:"#4fc3f7" },
          { icon:"🔧", label:"Admin",       sub:"Gerenciar jogos",     screen:"admin",   color:"#ce93d8" },
        ].map(item => (
          <button key={item.label} onClick={() => setScreen(item.screen)} style={{ borderRadius:16, border:"1px solid rgba(255,255,255,0.06)", background:"rgba(13,31,60,0.6)", padding:"16px 14px", textAlign:"left", cursor:"pointer", fontFamily:"inherit" }}>
            <div style={{ fontSize:22, marginBottom:8 }}>{item.icon}</div>
            <div style={{ fontSize:14, fontWeight:700, color:item.color, letterSpacing:0.5 }}>{item.label}</div>
            <div style={{ fontSize:11, color:"#546e7a", marginTop:2 }}>{item.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── JOGOS ────────────────────────────────────────────────────────────────────
function JogosScreen({ user, matches, predictions, onPredict }) {
  const [filterGrupo, setFilterGrupo] = useState("TODOS");
  const grupos = ["TODOS", ...Object.keys(GROUPS)];
  const filtered = filterGrupo === "TODOS" ? matches : matches.filter(m => m.grupo === filterGrupo);

  return (
    <div style={{ padding:"20px 16px 0" }}>
      {/* Group filter */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:12, marginBottom:4 }}>
        {grupos.map(g => (
          <button key={g} onClick={() => setFilterGrupo(g)} style={{ padding:"6px 12px", borderRadius:20, border:"none", background:filterGrupo===g?"linear-gradient(90deg,#00c853,#00e676)":"rgba(255,255,255,0.06)", color:filterGrupo===g?"#020818":"#78909c", fontWeight:700, fontSize:11, letterSpacing:1, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"inherit", flexShrink:0 }}>{g}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#546e7a", fontSize:14 }}>
          {matches.length === 0 ? "Nenhum jogo cadastrado.\nAcesse Admin para adicionar." : "Nenhum jogo neste grupo."}
        </div>
      )}

      {filtered.map(match => {
        const pred = predictions[match.id];
        const pts = pred && match.finalizado ? calcPontos(pred.placarA, pred.placarB, match.placarA, match.placarB) : null;
        return (
          <div key={match.id} style={{ borderRadius:16, background:"rgba(13,31,60,0.8)", border:`1px solid ${match.finalizado?"rgba(255,255,255,0.06)":"rgba(0,230,118,0.15)"}`, padding:"14px 16px", marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ fontSize:11, color:"#546e7a", letterSpacing:1 }}>
                Grupo {match.grupo}{match.data ? ` · ${match.data}` : ""}{match.hora ? ` · ${match.hora}` : ""}
                {match.fase ? ` · ${match.fase}` : ""}
              </span>
              <span style={{ fontSize:10, background:match.finalizado?"rgba(255,255,255,0.06)":"rgba(0,230,118,0.12)", borderRadius:6, padding:"2px 8px", color:match.finalizado?"#78909c":"#00e676", letterSpacing:1 }}>
                {match.finalizado ? "ENCERRADO" : "EM ABERTO"}
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"center" }}>
              <div style={{ flex:1, textAlign:"center" }}>
                <div style={{ fontSize:26 }}>{FLAGS[match.timeA]||"🏳️"}</div>
                <div style={{ fontSize:12, fontWeight:700 }}>{match.timeA}</div>
              </div>
              <div style={{ minWidth:80, textAlign:"center" }}>
                {match.finalizado
                  ? <div style={{ fontSize:24, fontWeight:900, letterSpacing:2 }}>{match.placarA} : {match.placarB}</div>
                  : <div style={{ fontSize:18, color:"#37474f", fontWeight:700 }}>— : —</div>}
              </div>
              <div style={{ flex:1, textAlign:"center" }}>
                <div style={{ fontSize:26 }}>{FLAGS[match.timeB]||"🏳️"}</div>
                <div style={{ fontSize:12, fontWeight:700 }}>{match.timeB}</div>
              </div>
            </div>
            {/* Prediction row */}
            <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.05)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              {pred ? (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:11, color:"#546e7a" }}>Seu palpite:</span>
                  <span style={{ fontSize:13, fontWeight:800, color: pts===5?"#FFD700":pts===3?"#00e676":pts===0&&match.finalizado?"#ef5350":"#4fc3f7" }}>{pred.placarA} × {pred.placarB}</span>
                  {pts !== null && <span style={{ fontSize:11, background:pts>0?"rgba(0,230,118,0.15)":"rgba(239,83,80,0.15)", borderRadius:6, padding:"2px 8px", color:pts>0?"#00e676":"#ef5350", fontWeight:700 }}>+{pts}pts</span>}
                </div>
              ) : (
                <span style={{ fontSize:11, color:"#546e7a" }}>{match.finalizado ? "Sem palpite" : "Nenhum palpite ainda"}</span>
              )}
              {!match.finalizado && (
                <button onClick={() => onPredict(match)} style={{ padding:"6px 14px", borderRadius:8, border:"1px solid rgba(0,230,118,0.3)", background:pred?"rgba(0,230,118,0.08)":"linear-gradient(90deg,#00c853,#00e676)", color:pred?"#00e676":"#020818", fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:1, fontFamily:"inherit" }}>
                  {pred ? "EDITAR" : "PALPITAR"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── RANKING ──────────────────────────────────────────────────────────────────
function RankingScreen({ ranking, userId }) {
  return (
    <div style={{ padding:"20px 16px 0" }}>
      <SectionTitle>RANKING GERAL</SectionTitle>
      {ranking.length < 2 ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#546e7a", fontSize:13 }}>Poucos jogadores ainda. Convide amigos!</div>
      ) : (
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:12, marginBottom:24, marginTop:8 }}>
          {[ranking[1], ranking[0], ranking[2]].filter(Boolean).map((u, i) => {
            const pos = i===0?2:i===1?1:3;
            const heights=[70,90,60];
            return (
              <div key={u.id} style={{ textAlign:"center", flex:1 }}>
                <div style={{ fontSize:20, marginBottom:4 }}>{pos===1?"👑":pos===2?"🥈":"🥉"}</div>
                <div style={{ width:40, height:40, borderRadius:"50%", margin:"0 auto 6px", background:`${MEDAL[pos-1]}22`, border:`2px solid ${MEDAL[pos-1]}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:MEDAL[pos-1] }}>{initials(u.nome)}</div>
                <div style={{ fontSize:11, fontWeight:700, marginBottom:2 }}>{u.nome.split(" ")[0]}</div>
                <div style={{ fontSize:18, fontWeight:900, color:MEDAL[pos-1] }}>{u.pontos}</div>
                <div style={{ height:heights[i], marginTop:8, borderRadius:"8px 8px 0 0", background:`linear-gradient(180deg,${MEDAL[pos-1]}22,${MEDAL[pos-1]}08)`, border:`1px solid ${MEDAL[pos-1]}33`, borderBottom:"none" }} />
              </div>
            );
          })}
        </div>
      )}
      {ranking.map((u, i) => (
        <div key={u.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", borderRadius:14, marginBottom:8, background:u.id===userId?"rgba(0,230,118,0.08)":"rgba(13,31,60,0.6)", border:`1px solid ${u.id===userId?"rgba(0,230,118,0.3)":"rgba(255,255,255,0.05)"}` }}>
          <div style={{ width:28, textAlign:"center", fontSize:i<3?16:13, fontWeight:800, color:i<3?MEDAL[i]:"#546e7a" }}>{i<3?["🥇","🥈","🥉"][i]:`${i+1}º`}</div>
          <div style={{ width:36, height:36, borderRadius:"50%", background:u.id===userId?"linear-gradient(135deg,#00e676,#4fc3f7)":"rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:u.id===userId?"#020818":"#78909c" }}>{initials(u.nome)}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:u.id===userId?"#00e676":"#e8f4fd" }}>{u.nome}{u.id===userId?" (você)":""}</div>
            <div style={{ fontSize:11, color:"#546e7a" }}>🎯 {u.exatos} exatos</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:20, fontWeight:900, color:i<3?MEDAL[i]:"#e8f4fd" }}>{u.pontos}</div>
            <div style={{ fontSize:10, color:"#546e7a", letterSpacing:1 }}>PTS</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────
function PerfilScreen({ user, matches, predictions, myPts, myRank }) {
  const myPreds = Object.entries(predictions).map(([id, pred]) => {
    const match = matches.find(m => m.id === id);
    if (!match) return null;
    const pts = match.finalizado ? calcPontos(pred.placarA, pred.placarB, match.placarA, match.placarB) : null;
    return { match, pred, pts };
  }).filter(Boolean);

  return (
    <div style={{ padding:"20px 16px 0" }}>
      <div style={{ borderRadius:20, background:"linear-gradient(135deg,#0a2e1a,#0d1f3c)", border:"1px solid rgba(0,230,118,0.2)", padding:"24px 20px", marginBottom:20, display:"flex", alignItems:"center", gap:18 }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#00e676,#4fc3f7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:"#020818", border:"3px solid rgba(0,230,118,0.4)" }}>{initials(user.nome)}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:1 }}>{user.nome}</div>
          <div style={{ fontSize:12, color:"#546e7a" }}>{user.email}</div>
          <div style={{ display:"flex", gap:16, marginTop:8 }}>
            <Stat label="PTS" value={myPts} color="#00e676" small />
            <Stat label="RANK" value={`${myRank}º`} color="#FFD700" small />
            <Stat label="PALPITES" value={myPreds.length} color="#4fc3f7" small />
          </div>
        </div>
      </div>

      <SectionTitle>MEUS PALPITES</SectionTitle>
      {myPreds.length === 0 && <div style={{ textAlign:"center", padding:"32px 0", color:"#546e7a", fontSize:13 }}>Você ainda não fez nenhum palpite.</div>}
      {myPreds.map(({ match, pred, pts }, i) => (
        <div key={i} style={{ borderRadius:14, background:"rgba(13,31,60,0.8)", border:"1px solid rgba(255,255,255,0.05)", padding:"14px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ fontSize:22 }}>{FLAGS[match.timeA]||"🏳️"}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700 }}>{match.timeA} × {match.timeB}</div>
            <div style={{ fontSize:12, color:"#546e7a" }}>Palpite: <span style={{ color:"#4fc3f7", fontWeight:700 }}>{pred.placarA} × {pred.placarB}</span></div>
            {match.finalizado && <div style={{ fontSize:11, color:"#78909c" }}>Resultado: {match.placarA} × {match.placarB}</div>}
          </div>
          <div style={{ textAlign:"right" }}>
            {pts !== null
              ? <div style={{ fontSize:18, fontWeight:900, color:pts===5?"#FFD700":pts===3?"#00e676":"#ef5350" }}>+{pts}</div>
              : <div style={{ fontSize:11, color:"#546e7a", letterSpacing:1 }}>ABERTO</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function AdminScreen({ matches, onAdd, onUpdate, onDelete, onEditMatch, onResultMatch }) {
  const [auth, setAuth]         = useState(false);
  const [pass, setPass]         = useState("");
  const [erro, setErro]         = useState("");
  const [tab, setTab]           = useState("jogos"); // jogos | novo
  const [newMatch, setNewMatch] = useState({ timeA:"", timeB:"", grupo:"A", data:"", hora:"", fase:"Fase de Grupos" });
  const [success, setSuccess]   = useState("");

  if (!auth) return (
    <div style={{ padding:"40px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
      <div style={{ fontSize:32 }}>🔐</div>
      <div style={{ fontSize:18, fontWeight:800, letterSpacing:2, color:"#00e676" }}>ÁREA DO ADMIN</div>
      <div style={{ width:"100%", maxWidth:280 }}>
        <Input label="SENHA DO ADMINISTRADOR" value={pass} onChange={setPass} type="password" placeholder="Digite a senha" />
      </div>
      {erro && <div style={{ color:"#ef5350", fontSize:12 }}>{erro}</div>}
      <button onClick={() => { if (pass === ADMIN_PASS) setAuth(true); else setErro("Senha incorreta!"); }} style={{ padding:"12px 32px", borderRadius:12, border:"none", background:"linear-gradient(90deg,#00c853,#00e676)", color:"#020818", fontWeight:800, fontSize:14, letterSpacing:2, cursor:"pointer", fontFamily:"inherit" }}>ACESSAR</button>
      <div style={{ fontSize:11, color:"#546e7a" }}>Senha padrão: <span style={{ color:"#4fc3f7" }}>copa2026</span></div>
    </div>
  );

  const handleAdd = () => {
    if (!newMatch.timeA || !newMatch.timeB) return setErro("Selecione os dois times.");
    if (newMatch.timeA === newMatch.timeB) return setErro("Times não podem ser iguais.");
    onAdd(newMatch);
    setNewMatch({ timeA:"", timeB:"", grupo:"A", data:"", hora:"", fase:"Fase de Grupos" });
    setSuccess("Jogo cadastrado com sucesso!");
    setTimeout(() => setSuccess(""), 2500);
    setTab("jogos");
  };

  return (
    <div style={{ padding:"20px 16px 0" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <SectionTitle>PAINEL ADMIN</SectionTitle>
        <span style={{ fontSize:11, color:"#00e676", background:"rgba(0,230,118,0.1)", borderRadius:6, padding:"3px 10px", letterSpacing:1 }}>✓ AUTENTICADO</span>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", borderRadius:12, padding:4, marginBottom:20 }}>
        {[["jogos","📋 Jogos Cadastrados"],["novo","➕ Novo Jogo"]].map(([t,l]) => (
          <button key={t} onClick={() => { setTab(t); setErro(""); }} style={{ flex:1, padding:"10px 0", borderRadius:9, border:"none", background:tab===t?"linear-gradient(90deg,#00c853,#00e676)":"transparent", color:tab===t?"#020818":"#546e7a", fontWeight:700, fontSize:12, letterSpacing:0.5, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
        ))}
      </div>

      {success && <div style={{ background:"rgba(0,230,118,0.1)", border:"1px solid rgba(0,230,118,0.3)", borderRadius:10, padding:"10px 14px", color:"#00e676", fontSize:12, marginBottom:16 }}>✅ {success}</div>}

      {/* LIST */}
      {tab === "jogos" && (
        <>
          {matches.length === 0 && <div style={{ textAlign:"center", padding:"32px 0", color:"#546e7a", fontSize:13 }}>Nenhum jogo cadastrado ainda.</div>}
          {matches.map(m => (
            <div key={m.id} style={{ borderRadius:14, background:"rgba(13,31,60,0.8)", border:"1px solid rgba(255,255,255,0.07)", padding:"14px 16px", marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <span style={{ fontSize:11, color:"#4fc3f7", letterSpacing:1 }}>GRP {m.grupo}{m.fase ? ` · ${m.fase}` : ""}</span>
                  <div style={{ fontSize:14, fontWeight:800, marginTop:2 }}>
                    {FLAGS[m.timeA]||"🏳️"} {m.timeA} × {m.timeB} {FLAGS[m.timeB]||"🏳️"}
                  </div>
                  <div style={{ fontSize:11, color:"#546e7a", marginTop:2 }}>
                    {m.data || "Data?"} {m.hora ? `· ${m.hora}` : ""}
                    {m.finalizado ? <span style={{ color:"#00e676", marginLeft:8 }}>· {m.placarA}:{m.placarB} ✓</span> : ""}
                  </div>
                </div>
                <span style={{ fontSize:10, background:m.finalizado?"rgba(0,230,118,0.12)":"rgba(255,193,7,0.12)", borderRadius:6, padding:"2px 8px", color:m.finalizado?"#00e676":"#FFC107", letterSpacing:1, flexShrink:0 }}>
                  {m.finalizado ? "FINALIZADO" : "ABERTO"}
                </span>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <AdminBtn label="✏️ Editar" onClick={() => onEditMatch(m)} color="#4fc3f7" />
                <AdminBtn label="⚽ Resultado" onClick={() => onResultMatch(m)} color="#00e676" />
                <AdminBtn label="🗑️" onClick={() => { if (window.confirm("Deletar este jogo?")) onDelete(m.id); }} color="#ef5350" />
              </div>
            </div>
          ))}
        </>
      )}

      {/* NEW */}
      {tab === "novo" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <Label>FASE / ETAPA</Label>
            <select value={newMatch.fase} onChange={e => setNewMatch(p=>({...p, fase:e.target.value}))} style={selectStyle}>
              {["Fase de Grupos","Oitavas de Final","Quartas de Final","Semifinal","Disputa 3º Lugar","Final"].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <Label>GRUPO</Label>
            <select value={newMatch.grupo} onChange={e => setNewMatch(p=>({...p, grupo:e.target.value}))} style={selectStyle}>
              {Object.keys(GROUPS).map(g => <option key={g} value={g}>Grupo {g}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <Label>TIME A</Label>
              <select value={newMatch.timeA} onChange={e => setNewMatch(p=>({...p, timeA:e.target.value}))} style={selectStyle}>
                <option value="">Selecione...</option>
                {(newMatch.fase === "Fase de Grupos" && newMatch.grupo ? GROUPS[newMatch.grupo] : ALL_TEAMS).map(t => <option key={t} value={t}>{FLAGS[t]||""} {t}</option>)}
              </select>
            </div>
            <div>
              <Label>TIME B</Label>
              <select value={newMatch.timeB} onChange={e => setNewMatch(p=>({...p, timeB:e.target.value}))} style={selectStyle}>
                <option value="">Selecione...</option>
                {(newMatch.fase === "Fase de Grupos" && newMatch.grupo ? GROUPS[newMatch.grupo] : ALL_TEAMS).map(t => <option key={t} value={t}>{FLAGS[t]||""} {t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <Label>DATA</Label>
              <input type="date" value={newMatch.data} onChange={e => setNewMatch(p=>({...p, data:e.target.value}))} style={inputStyle} />
            </div>
            <div>
              <Label>HORÁRIO</Label>
              <input type="time" value={newMatch.hora} onChange={e => setNewMatch(p=>({...p, hora:e.target.value}))} style={inputStyle} />
            </div>
          </div>
          {/* Preview */}
          {newMatch.timeA && newMatch.timeB && (
            <div style={{ borderRadius:12, background:"rgba(0,230,118,0.06)", border:"1px solid rgba(0,230,118,0.2)", padding:"14px 16px", textAlign:"center" }}>
              <div style={{ fontSize:11, letterSpacing:2, color:"#4fc3f7", marginBottom:8 }}>PRÉVIA</div>
              <div style={{ fontSize:22 }}>{FLAGS[newMatch.timeA]||"🏳️"} <span style={{ color:"#546e7a" }}>×</span> {FLAGS[newMatch.timeB]||"🏳️"}</div>
              <div style={{ fontSize:15, fontWeight:700, marginTop:4 }}>{newMatch.timeA} × {newMatch.timeB}</div>
              <div style={{ fontSize:11, color:"#546e7a", marginTop:4 }}>{newMatch.fase} · Grupo {newMatch.grupo} {newMatch.data ? `· ${formatDate(newMatch.data)}` : ""} {newMatch.hora ? `· ${newMatch.hora}` : ""}</div>
            </div>
          )}
          {erro && <div style={{ color:"#ef5350", fontSize:12 }}>⚠️ {erro}</div>}
          <button onClick={handleAdd} style={{ padding:"14px", borderRadius:12, border:"none", background:"linear-gradient(90deg,#00c853,#00e676)", color:"#020818", fontWeight:800, fontSize:14, letterSpacing:2, cursor:"pointer", fontFamily:"inherit" }}>➕ CADASTRAR JOGO</button>
        </div>
      )}
    </div>
  );
}

function AdminBtn({ label, onClick, color }) {
  return (
    <button onClick={onClick} style={{ flex:1, padding:"8px 0", borderRadius:8, border:`1px solid ${color}33`, background:`${color}11`, color, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{label}</button>
  );
}

// ─── ADMIN EDIT MATCH MODAL ───────────────────────────────────────────────────
function AdminMatchModal({ match, onSave, onClose }) {
  const [form, setForm] = useState(match ? { ...match } : { timeA:"", timeB:"", grupo:"A", data:"", hora:"", fase:"Fase de Grupos" });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  return (
    <Modal title={match ? "✏️ EDITAR JOGO" : "➕ NOVO JOGO"} onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div>
          <Label>FASE</Label>
          <select value={form.fase} onChange={e=>set("fase",e.target.value)} style={selectStyle}>
            {["Fase de Grupos","Oitavas de Final","Quartas de Final","Semifinal","Disputa 3º Lugar","Final"].map(f=><option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <Label>GRUPO</Label>
          <select value={form.grupo} onChange={e=>set("grupo",e.target.value)} style={selectStyle}>
            {Object.keys(GROUPS).map(g=><option key={g} value={g}>Grupo {g}</option>)}
          </select>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <Label>TIME A</Label>
            <select value={form.timeA} onChange={e=>set("timeA",e.target.value)} style={selectStyle}>
              <option value="">Selecione...</option>
              {(form.fase==="Fase de Grupos"?GROUPS[form.grupo]:ALL_TEAMS).map(t=><option key={t} value={t}>{FLAGS[t]||""} {t}</option>)}
            </select>
          </div>
          <div>
            <Label>TIME B</Label>
            <select value={form.timeB} onChange={e=>set("timeB",e.target.value)} style={selectStyle}>
              <option value="">Selecione...</option>
              {(form.fase==="Fase de Grupos"?GROUPS[form.grupo]:ALL_TEAMS).map(t=><option key={t} value={t}>{FLAGS[t]||""} {t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <Label>DATA</Label>
            <input type="date" value={form.data||""} onChange={e=>set("data",e.target.value)} style={inputStyle} />
          </div>
          <div>
            <Label>HORÁRIO</Label>
            <input type="time" value={form.hora||""} onChange={e=>set("hora",e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:4 }}>
          <button onClick={onClose} style={cancelBtnStyle}>CANCELAR</button>
          <button onClick={() => onSave(form)} style={saveBtnStyle}>SALVAR</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── ADMIN RESULT MODAL ───────────────────────────────────────────────────────
function AdminResultModal({ match, onSave, onClose }) {
  const [pA, setPA] = useState(match.placarA ?? "");
  const [pB, setPB] = useState(match.placarB ?? "");

  return (
    <Modal title="⚽ REGISTRAR RESULTADO" onClose={onClose}>
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ fontSize:13, color:"#78909c", marginBottom:12 }}>{match.timeA} × {match.timeB}</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:24 }}>{FLAGS[match.timeA]||"🏳️"}</div>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>{match.timeA}</div>
            <ScoreBox value={pA} onChange={setPA} />
          </div>
          <div style={{ fontSize:22, color:"#546e7a", paddingTop:24 }}>×</div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:24 }}>{FLAGS[match.timeB]||"🏳️"}</div>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>{match.timeB}</div>
            <ScoreBox value={pB} onChange={setPB} />
          </div>
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onClose} style={cancelBtnStyle}>CANCELAR</button>
        <button onClick={() => { if (pA===""||pB==="") return; onSave({ ...match, placarA:+pA, placarB:+pB, finalizado:true }); }} style={saveBtnStyle}>CONFIRMAR RESULTADO</button>
      </div>
    </Modal>
  );
}

// ─── PREDICT MODAL ────────────────────────────────────────────────────────────
function PredictModal({ match, existing, onSave, onClose }) {
  const [pA, setPA] = useState(existing?.placarA ?? "");
  const [pB, setPB] = useState(existing?.placarB ?? "");
  return (
    <Modal title="🎯 FAZER PALPITE" onClose={onClose}>
      <div style={{ fontSize:12, color:"#78909c", textAlign:"center", marginBottom:16 }}>
        Grupo {match.grupo}{match.data?` · ${match.data}`:""}{match.hora?` · ${match.hora}`:""}
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:20 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:28 }}>{FLAGS[match.timeA]||"🏳️"}</div>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>{match.timeA}</div>
          <ScoreBox value={pA} onChange={setPA} />
        </div>
        <div style={{ fontSize:20, color:"#546e7a", paddingTop:24 }}>×</div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:28 }}>{FLAGS[match.timeB]||"🏳️"}</div>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>{match.timeB}</div>
          <ScoreBox value={pB} onChange={setPB} />
        </div>
      </div>
      <div style={{ background:"rgba(0,230,118,0.06)", borderRadius:10, padding:"10px 14px", marginBottom:16 }}>
        <div style={{ fontSize:11, letterSpacing:2, color:"#4fc3f7", marginBottom:6 }}>PONTUAÇÃO</div>
        <div style={{ display:"flex", gap:16, fontSize:12 }}>
          <span>🎯 Placar exato: <b style={{ color:"#FFD700" }}>+5pts</b></span>
          <span>✅ Vencedor: <b style={{ color:"#00e676" }}>+3pts</b></span>
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onClose} style={cancelBtnStyle}>CANCELAR</button>
        <button onClick={() => { if (pA===""||pB==="") return; onSave(+pA, +pB); }} style={saveBtnStyle}>CONFIRMAR</button>
      </div>
    </Modal>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)", padding:20 }}>
      <div style={{ background:"linear-gradient(160deg,#0d1f3c,#071428)", border:"1px solid rgba(0,230,118,0.3)", borderRadius:20, padding:24, width:"100%", maxWidth:360, boxShadow:"0 0 60px rgba(0,200,100,0.15)" }}>
        <div style={{ fontSize:14, fontWeight:800, letterSpacing:2, color:"#4fc3f7", marginBottom:20 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function ScoreBox({ value, onChange }) {
  return (
    <div style={{ width:52, height:52, borderRadius:12, border:"2px solid rgba(0,230,118,0.4)", background:"rgba(0,230,118,0.06)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto" }}>
      <input type="number" min={0} max={20} value={value} onChange={e=>onChange(e.target.value)} style={{ width:"100%", height:"100%", background:"transparent", border:"none", textAlign:"center", color:"#00e676", fontSize:22, fontWeight:800, outline:"none", fontFamily:"inherit" }} />
    </div>
  );
}

function Input({ label, value, onChange, type="text", placeholder }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize:10, letterSpacing:2, color:"#4fc3f7", marginBottom:6, fontWeight:700 }}>{children}</div>;
}

function SectionTitle({ children }) {
  return <div style={{ fontSize:11, letterSpacing:3, color:"#4fc3f7", marginBottom:12, paddingLeft:4, fontWeight:700 }}>{children}</div>;
}

function Stat({ label, value, color, small }) {
  return (
    <div>
      <div style={{ fontSize:small?18:26, fontWeight:900, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:9, letterSpacing:2, color:"#546e7a" }}>{label}</div>
    </div>
  );
}

function formatDate(d) {
  if (!d) return "";
  const [y,m,day] = d.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${day} ${months[+m-1]}`;
}

const inputStyle = { width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"12px 14px", color:"#e8f4fd", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", colorScheme:"dark" };
const selectStyle = { ...inputStyle, cursor:"pointer" };
const cancelBtnStyle = { flex:1, padding:"12px 0", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#78909c", cursor:"pointer", fontSize:13, fontWeight:600, letterSpacing:1, fontFamily:"inherit" };
const saveBtnStyle = { flex:2, padding:"12px 0", borderRadius:10, border:"none", background:"linear-gradient(90deg,#00c853,#00e676)", color:"#020818", cursor:"pointer", fontSize:14, fontWeight:800, letterSpacing:2, fontFamily:"inherit" };
