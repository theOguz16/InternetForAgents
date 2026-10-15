import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Skill = 'language' | 'keywords' | 'summary';
const labels: Record<string, string> = { language: 'Dil tespiti', keywords: 'Anahtar kelimeler', summary: 'Kısa özet', running: 'Çalışıyor', discovering: 'Uzman aranıyor', working: 'İşleniyor', completed: 'Tamamlandı', partial: 'Kısmi sonuç', failed: 'Başarısız', unknown: 'Durum belirsiz' };
interface Agent { id: string; name: string; profiles: string[] }
interface Child { skill: Skill; state: string; selectedAgent?: { name: string }; selectionReason?: string; error?: string; output?: { mode: string; output: { language?: string; keywords?: string[]; summary?: string } } }
interface Job { id: string; status: string; revision: number; children: Child[] }
const errorLabels: Record<string, string> = { no_provider: 'Bu beceri için izinli sağlayıcı bulunamadı.', provider_failed: 'Uzman görevi tamamlayamadı.', discovery_failed: 'Registry’ye ulaşılamadı veya yanıt alınamadı.', deadline_exceeded: 'Bekleme süresi doldu; uzak görev devam ediyor olabilir.', personal_restarted: 'Personal yeniden başladı; uzak görev otomatik tekrar gönderilmedi.', execution_unknown: 'Bağlantı nedeniyle son durum belirlenemedi.' };
async function jsonResponse(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body;
}
function App() {
  const [text, setText] = useState('Merhaba dünya. Robot robot ve sensör birlikte çalışıyor.');
  const [skills, setSkills] = useState<Skill[]>(['language', 'keywords', 'summary']);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [registryError, setRegistryError] = useState('');
  const [cardUrl, setCardUrl] = useState('');
  const [registryBusy, setRegistryBusy] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('Henüz görev yok');
  const stream = useRef<AbortController | null>(null);
  const pending = useRef<{ body: string; key: string } | null>(null);

  async function loadAgents() {
    setRegistryBusy(true); setRegistryError('');
    try { setAgents((await jsonResponse(await fetch('/registry/agents', { signal: AbortSignal.timeout(5000) }))).agents); }
    catch (e) { setRegistryError(e instanceof Error ? e.message : 'Registry okunamadı'); }
    finally { setRegistryBusy(false); }
  }
  async function follow(id: string) {
    stream.current?.abort();
    const controller = new AbortController(); stream.current = controller;
    setError(''); setConnection('Bağlanıyor');
    let terminal = false;
    try {
      const response = await fetch(`/v1/jobs/${encodeURIComponent(id)}/events`, { signal: controller.signal });
      if (!response.ok) { await jsonResponse(response); return; }
      if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) throw new Error('Geçersiz olay akışı');
      setConnection('Canlı · SSE');
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          // Ağ parçaları bir JSON olayının ortasında bitebilir; tam olay gelene kadar biriktiririz.
          buffer += decoder.decode(value, { stream: true });
          let boundary: number;
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
            const data = frame.split('\n').filter(line => line.startsWith('data: ')).map(line => line.slice(6)).join('\n');
            if (!data) continue; // Heartbeat yorumları görev güncellemesi değildir.
            const snapshot = JSON.parse(data) as Job;
            if (snapshot.id !== id || !Array.isArray(snapshot.children)) throw new Error('Geçersiz görev snapshot’ı');
            setJob(previous => previous?.id === id && previous.revision > snapshot.revision ? previous : snapshot);
            terminal = snapshot.status !== 'running';
          }
        }
      } finally { await reader.cancel(); }
      setConnection(terminal ? 'Akış tamamlandı' : 'Bağlantı kesildi · yeniden bağlanabilirsiniz');
    } catch (e) {
      if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : 'Akış okunamadı'); setConnection('Bağlantı kurulamadı'); }
    }
  }
  useEffect(() => {
    void loadAgents();
    const id = sessionStorage.getItem('ifa-job');
    if (id) void follow(id);
    return () => stream.current?.abort();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const body = JSON.stringify({ text, skills: [...skills].sort() });
    // Yanıt kaybolursa aynı içerik aynı anahtarla tekrar gönderilir; yeni iş çoğaltılmaz.
    if (pending.current?.body !== body) pending.current = { body, key: crypto.randomUUID() };
    try {
      const created = await jsonResponse(await fetch('/v1/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': pending.current.key }, body, signal: AbortSignal.timeout(10000) })) as Job;
      setJob(created); sessionStorage.setItem('ifa-job', created.id); void follow(created.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Görev gönderilemedi'); }
    finally { setBusy(false); }
  }
  async function register(event: FormEvent) {
    event.preventDefault(); setRegistryBusy(true); setRegistryError('');
    try {
      await jsonResponse(await fetch('/registry/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardUrl }), signal: AbortSignal.timeout(7000) }));
      setCardUrl(''); await loadAgents();
    } catch (e) { setRegistryError(e instanceof Error ? e.message : 'Kayıt yapılamadı'); }
    finally { setRegistryBusy(false); }
  }
  const locked = busy || job?.status === 'running';
  return <main>
    <header><span className="eyebrow">YEREL AGENT AĞI / DEMO</span><h1>Internet for Agents<span>.</span></h1><p>Bir görev ver. Uzmanlar keşfedilsin, sonuçlar tek yerde buluşsun.</p></header>
    <div className="layout"><section className="panel">
      <h2><span className="number">01</span> Görevini oluştur</h2>
      <form onSubmit={submit}>
        <label htmlFor="text">İşlenecek metin</label><textarea id="text" required maxLength={8000} rows={7} value={text} disabled={locked} onChange={e => setText(e.target.value)}/>
        <small>{text.length} / 8000</small>
        <fieldset disabled={locked}><legend>Uzmanlıklar</legend>{(['language','keywords','summary'] as Skill[]).map(skill => <label className="check" key={skill}><input type="checkbox" checked={skills.includes(skill)} onChange={e => setSkills(current => e.target.checked ? [...current, skill] : current.filter(item => item !== skill))}/>{labels[skill]} {skill === 'summary' && <span className="badge">Örnek çıktı</span>}</label>)}</fieldset>
        <button disabled={locked || !skills.length || !text.trim()}>{busy ? 'Gönderiliyor…' : 'Görevi başlat →'}</button>
        {job && job.status !== 'running' && <button className="secondary" type="button" onClick={() => { stream.current?.abort(); pending.current = null; setJob(null); sessionStorage.removeItem('ifa-job'); setConnection('Henüz görev yok'); }}>Yeni görev hazırla</button>}
      </form>
      <p className="note">Dil ve kelime uzmanları kurallarla çalışır. Özet uzmanı henüz gerçek özet üretmez.</p>
    </section><section className="panel results" aria-live="polite">
      <h2><span className="number">02</span> Görevin yolculuğu</h2><p className="connection">{connection}</p>
      {error && <p role="alert" className="error">{error}</p>}
      {!job ? <div className="empty">Sonuçlar burada görünecek.<br/><small>Keşif → uzman seçimi → yürütme → sonuç</small></div> : <>
        <div className="job-title"><strong>{labels[job.status] ?? job.status}</strong><button type="button" className="secondary" onClick={() => void follow(job.id)}>Son duruma bağlan</button></div>
        <small className="id">Görev: {job.id}</small>
        {job.children.map(child => <article key={child.skill} className="result"><div className="job-title"><h3>{labels[child.skill]}</h3><span className="badge">{labels[child.state] ?? child.state}</span></div>
          <p>{child.selectedAgent?.name ?? 'Henüz sağlayıcı seçilmedi'}</p>
          {child.error && <p className="error">{errorLabels[child.error] ?? child.error}</p>}
          {child.output && <><span className="badge">{child.output.mode === 'fixture' ? 'Örnek çıktı · gerçek analiz değil' : child.output.mode === 'deterministic' ? 'Kural tabanlı sonuç' : 'Model çıktısı'}</span>
            {child.output.output.language && <p className="answer">{{ tr: 'Türkçe', en: 'İngilizce', und: 'Dil belirlenemedi' }[child.output.output.language] ?? child.output.output.language}</p>}
            {child.output.output.keywords && <p className="answer">{child.output.output.keywords.join(' · ') || 'Anahtar kelime bulunamadı.'}</p>}
            {child.output.output.summary && <p className="answer">{child.output.output.summary}</p>}</>}
          {child.selectionReason && <details><summary>Bu uzman neden seçildi?</summary><p>{child.selectionReason}</p></details>}
        </article>)}
      </>}
    </section></div>
    <section className="panel directory"><div className="job-title"><h2><span className="number">03</span> Uzman dizini</h2><button className="secondary" disabled={registryBusy} onClick={() => void loadAgents()}>Listeyi yenile</button></div>
      <p className="note">Kayıtlı olmak, şu anda erişilebilir olmak anlamına gelmez. Liste otomatik sorgulanmaz.</p>
      {registryError && <p role="alert" className="error">{registryError}</p>}
      <div className="agents">{agents.map(agent => <article className="result" key={agent.id}><h3>{agent.name}</h3><p>{agent.profiles.join(' · ')}</p></article>)}{!agents.length && <p>{registryBusy ? 'Dizin yükleniyor…' : 'Henüz listelenen uzman yok. Kart adresiyle kayıt ekleyebilirsiniz.'}</p>}</div>
      <form className="registration" onSubmit={register}><label htmlFor="card">Agent Card adresi</label><div><input id="card" type="url" required placeholder="http://language:4000/.well-known/agent-card.json" value={cardUrl} onChange={e => setCardUrl(e.target.value)}/><button disabled={registryBusy}>Kaydet / güncelle</button></div></form>
      <small>Docker’da servis adını (language, keywords, summary); yerel çalışmada 127.0.0.1 ve uzmanın portunu kullanın.</small>
    </section><footer>Yerel geliştirme demosu · A2A + SSE · SQLite</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
