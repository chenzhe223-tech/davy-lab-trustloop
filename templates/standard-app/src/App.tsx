import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { IndexedDbRecordStore } from './lib/recordStore';
import type { AppRecord } from './types';

export default function App() {
  const store = useMemo(() => new IndexedDbRecordStore(), []);
  const [records, setRecords] = useState<AppRecord[]>([]);
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('正在读取本机数据…');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const all = await store.list();
      setRecords(all.filter((record) => record.deletedAt === null));
      setMessage('本机数据已读取。当前模板尚未连接云端同步。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取本机数据失败。');
    }
  }, [store]);

  useEffect(() => {
    void reload();
    return () => store.close();
  }, [reload, store]);

  async function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = content.trim();
    if (!text || busy) return;
    setBusy(true);
    const now = Date.now();
    const record: AppRecord = {
      id: crypto.randomUUID(),
      title: text.split('\n')[0].slice(0, 80) || '新记录',
      content: text,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncState: 'local',
    };
    try {
      await store.put(record);
      setContent('');
      setMessage('已保存到本机 IndexedDB。尚未同步至云端。');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败，原文仍保留在输入框中。');
    } finally {
      setBusy(false);
    }
  }

  async function updateRecord(record: AppRecord, nextContent: string) {
    const updated: AppRecord = {
      ...record,
      title: nextContent.split('\n')[0].slice(0, 80) || '新记录',
      content: nextContent,
      version: record.version + 1,
      updatedAt: Date.now(),
      syncState: 'local',
    };
    try {
      await store.put(updated);
      setMessage('修改已保存到本机。尚未同步至云端。');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '修改保存失败。');
    }
  }

  async function deleteRecord(id: string) {
    if (!window.confirm('确定从这台设备删除这条记录？此操作不会删除其他设备或云端的数据。')) return;
    try {
      await store.delete(id);
      setMessage('已从本机删除。若后续接入云端，需实现云端墓碑与跨设备删除规则。');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '删除失败。');
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="brandline"><span className="mark">D</span><span>DAVYLAB / APP FOUNDRY</span></div>
        <div className="hero-body">
          <div>
            <p className="eyebrow">STANDARD STARTER · V0.1</p>
            <h1>先把核心流程跑通。</h1>
            <p className="intro">一个可以直接开发的本地优先应用骨架，包含结构化数据、持久化、测试与明确的同步接口边界。</p>
          </div>
          <div className="local-badge"><span className="dot" />仅本机存储</div>
        </div>
      </header>

      <section className="summary-grid" aria-label="项目状态">
        <article className="stat"><span>存储方式</span><strong>IndexedDB</strong><small>浏览器本地数据库</small></article>
        <article className="stat"><span>云端状态</span><strong>未连接</strong><small>不会悄悄发送数据</small></article>
        <article className="stat"><span>记录数量</span><strong>{records.length}</strong><small>当前设备上的未删除记录</small></article>
      </section>

      <section className="panel composer">
        <div className="section-head"><div><p className="eyebrow">01 / CAPTURE</p><h2>新建记录</h2></div><span className="step">01</span></div>
        <form onSubmit={addRecord}>
          <label htmlFor="entry" className="field-label">记录内容</label>
          <textarea id="entry" value={content} onChange={(event) => setContent(event.target.value)} maxLength={4000} placeholder="描述一个想法、任务，或需要跟进的问题…" rows={4} />
          <div className="form-foot"><span className="counter">{content.length} / 4000</span><button className="primary" disabled={busy || !content.trim()} type="submit">{busy ? '保存中…' : '保存到本机'} <span aria-hidden="true">↗</span></button></div>
        </form>
      </section>

      <section className="panel">
        <div className="section-head"><div><p className="eyebrow">02 / YOUR DATA</p><h2>记录收件箱</h2></div><button type="button" className="quiet" onClick={() => void reload()}>重新读取 ↻</button></div>
        <div className="notice" role="status"><span className="notice-icon">i</span><span>{message}</span></div>
        {records.length === 0 ? (
          <div className="empty"><div className="empty-icon">＋</div><strong>从一条记录开始</strong><p>保存后刷新页面，数据仍会保留在当前浏览器。</p></div>
        ) : (
          <div className="record-list">
            {records.map((record) => (
              <RecordCard key={record.id} record={record} onSave={updateRecord} onDelete={deleteRecord} />
            ))}
          </div>
        )}
      </section>

      <footer className="footer"><span>DAVYLAB · Engineering baseline</span><span>本地已保存 ≠ 云端已同步</span></footer>
    </main>
  );
}

function RecordCard({
  record,
  onSave,
  onDelete,
}: {
  record: AppRecord;
  onSave: (record: AppRecord, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [value, setValue] = useState(record.content);
  const [saving, setSaving] = useState(false);
  const changed = value !== record.content;
  return (
    <article className="record-card">
      <div className="record-meta"><span>{new Date(record.updatedAt).toLocaleString()}</span><span className="local-tag">LOCAL ONLY</span></div>
      <label className="field-label" htmlFor={'record-' + record.id}>{record.title}</label>
      <textarea id={'record-' + record.id} value={value} onChange={(event) => setValue(event.target.value)} maxLength={4000} rows={3} />
      <div className="record-actions">
        <button type="button" disabled={!changed || saving} className="primary small" onClick={async () => { setSaving(true); try { await onSave(record, value); } finally { setSaving(false); } }}>{saving ? '保存中…' : '保存修改'}</button>
        <button type="button" className="danger small" onClick={() => void onDelete(record.id)}>删除本机记录</button>
        <span className="version">v{record.version}</span>
      </div>
    </article>
  );
}
