import React, { useEffect, useMemo, useState } from 'react';
import {
    createKnowledgeBlock,
    deleteKnowledgeBlock,
    fetchKnowledgeBlocks,
    fetchKnowledgeContextPreview,
    updateKnowledgeBlock
} from '../services/api';

const emptyBlock = {
    title: '',
    type: '',
    description: '',
    tags: [],
    status: 'active',
    fields: {}
};

const statusLabel = {
    active: 'Faol',
    inactive: 'Nofaol'
};

const typeLabel = {
    product: 'Mahsulot',
    hotel_room: 'Mehmonxona xonasi',
    service: 'Xizmat',
    menu_item: 'Menyu',
    course: 'Kurs'
};

const toFieldRows = (fields = {}) =>
    Object.entries(fields).map(([key, value]) => ({ key, value: String(value ?? '') }));

const fromFieldRows = (rows) =>
    rows.reduce((acc, row) => {
        const key = row.key.trim();
        if (key) acc[key] = row.value;
        return acc;
    }, {});

const formatBlockPreview = (block) => {
    const fields = block.fields || {};
    const lines = [
        `[Blok turi: ${block.type || 'tur'}]`,
        `Nomi: ${block.title || 'Nomsiz'}`,
        `Tavsif: ${block.description || ''}`,
        'Maydonlar:'
    ];

    if (Object.keys(fields).length) {
        Object.entries(fields).forEach(([key, value]) => lines.push(`- ${key}: ${value}`));
    } else {
        lines.push('- yoq');
    }

    lines.push(`Teglar: ${(block.tags || []).join(', ') || 'yoq'}`);
    return lines.join('\n');
};

const AdminKnowledgeBase = () => {
    const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
    const [isUnlocked, setIsUnlocked] = useState(Boolean(localStorage.getItem('adminToken')));
    const [blocks, setBlocks] = useState([]);
    const [filters, setFilters] = useState({ q: '', type: '', tag: '', status: '' });
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyBlock);
    const [fieldRows, setFieldRows] = useState([{ key: '', value: '' }]);
    const [contextPreview, setContextPreview] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const stats = useMemo(() => {
        const active = blocks.filter((block) => block.status === 'active').length;
        const types = new Set(blocks.map((block) => block.type)).size;
        return { active, total: blocks.length, types };
    }, [blocks]);

    const loadBlocks = async () => {
        if (!isUnlocked) return;
        setIsLoading(true);
        setError('');
        try {
            const cleanFilters = Object.fromEntries(
                Object.entries(filters).filter(([, value]) => value)
            );
            const [blockData, previewData] = await Promise.all([
                fetchKnowledgeBlocks(cleanFilters),
                fetchKnowledgeContextPreview(cleanFilters)
            ]);
            setBlocks(blockData);
            setContextPreview(previewData.context);
        } catch (err) {
            setError('Admin token notogri yoki backend ishlamayapti.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBlocks();
    }, [isUnlocked]);

    const unlock = (event) => {
        event.preventDefault();
        localStorage.setItem('adminToken', adminToken);
        setIsUnlocked(true);
    };

    const logout = () => {
        localStorage.removeItem('adminToken');
        setAdminToken('');
        setIsUnlocked(false);
        setBlocks([]);
        setContextPreview('');
    };

    const startCreate = () => {
        setEditing(null);
        setForm(emptyBlock);
        setFieldRows([{ key: '', value: '' }]);
    };

    const startEdit = (block) => {
        setEditing(block.id);
        setForm({
            title: block.title,
            type: block.type,
            description: block.description || '',
            tags: block.tags || [],
            status: block.status,
            fields: block.fields || {}
        });
        const rows = toFieldRows(block.fields);
        setFieldRows(rows.length ? rows : [{ key: '', value: '' }]);
    };

    const saveBlock = async (event) => {
        event.preventDefault();
        const payload = {
            ...form,
            fields: fromFieldRows(fieldRows),
            tags: typeof form.tags === 'string'
                ? form.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
                : form.tags
        };

        try {
            if (editing) {
                await updateKnowledgeBlock(editing, payload);
            } else {
                await createKnowledgeBlock(payload);
            }
            startCreate();
            await loadBlocks();
        } catch (err) {
            setError('Blokni saqlab bolmadi. Majburiy maydonlar va admin tokenni tekshiring.');
        }
    };

    const removeBlock = async (id) => {
        if (!window.confirm('Bu blok ochirilsinmi?')) return;
        await deleteKnowledgeBlock(id);
        await loadBlocks();
    };

    const toggleStatus = async (block) => {
        await updateKnowledgeBlock(block.id, {
            status: block.status === 'active' ? 'inactive' : 'active'
        });
        await loadBlocks();
    };

    const updateFieldRow = (index, key, value) => {
        setFieldRows((rows) =>
            rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row)
        );
    };

    const currentPreview = formatBlockPreview({
        ...form,
        fields: fromFieldRows(fieldRows),
        tags: typeof form.tags === 'string'
            ? form.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
            : form.tags
    });

    if (!isUnlocked) {
        return (
            <main className="admin-shell admin-login">
                <form className="admin-login-panel" onSubmit={unlock}>
                    <h1>Bilimlar bazasi admin paneli</h1>
                    <p>AI ma'lumot bloklarini boshqarish uchun admin tokenni kiriting.</p>
                    <input
                        value={adminToken}
                        onChange={(event) => setAdminToken(event.target.value)}
                        placeholder="Admin token"
                        type="password"
                    />
                    <button type="submit">Admin panelni ochish</button>
                </form>
            </main>
        );
    }

    return (
        <main className="admin-shell">
            <section className="admin-topbar">
                <div>
                    <h1>Bilimlar bazasi</h1>
                    <p>Grok konteksti uchun universal ma'lumot bloklari.</p>
                </div>
                <div className="admin-actions">
                    <a href="/" className="ghost-button">Chat</a>
                    <button type="button" className="ghost-button" onClick={logout}>Chiqish</button>
                    <button onClick={startCreate}>Yangi blok</button>
                </div>
            </section>

            <section className="admin-stats">
                <div><strong>{stats.total}</strong><span>Jami bloklar</span></div>
                <div><strong>{stats.active}</strong><span>Faol</span></div>
                <div><strong>{stats.types}</strong><span>Turlar</span></div>
            </section>

            <section className="admin-filters">
                <input placeholder="Nom, tur yoki matn boyicha qidirish" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
                <input placeholder="Tur/kategoriya" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })} />
                <input placeholder="Teg" value={filters.tag} onChange={(event) => setFilters({ ...filters, tag: event.target.value })} />
                <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                    <option value="">Barcha holatlar</option>
                    <option value="active">Faol</option>
                    <option value="inactive">Nofaol</option>
                </select>
                <button onClick={loadBlocks}>{isLoading ? 'Yuklanmoqda...' : 'Qollash'}</button>
            </section>

            {error && <div className="admin-error">{error}</div>}

            <section className="admin-grid">
                <div className="block-table">
                    <div className="table-head">
                        <span>Nomi</span>
                        <span>Turi</span>
                        <span>Holati</span>
                        <span>Teglar</span>
                        <span>Amallar</span>
                    </div>
                    {blocks.map((block) => (
                        <div className="table-row" key={block.id}>
                            <span>
                                <strong title={block.title}>{block.title}</strong>
                                <small title={block.description || 'Tavsif yoq'}>{block.description || 'Tavsif yoq'}</small>
                            </span>
                            <span>{typeLabel[block.type] || block.type}</span>
                            <span className={`status-pill ${block.status}`}>{statusLabel[block.status] || block.status}</span>
                            <span className="tag-list" title={(block.tags || []).join(', ') || 'yoq'}>{(block.tags || []).join(', ') || 'yoq'}</span>
                            <span className="row-actions">
                                <button onClick={() => startEdit(block)}>Tahrirlash</button>
                                <button onClick={() => toggleStatus(block)}>
                                    {block.status === 'active' ? 'Ochirish' : 'Faollashtirish'}
                                </button>
                                <button className="danger-button" onClick={() => removeBlock(block.id)}>Ochirib tashlash</button>
                            </span>
                        </div>
                    ))}
                    {!blocks.length && <div className="empty-table">Bloklar topilmadi.</div>}
                </div>

                <form className="block-editor" onSubmit={saveBlock}>
                    <div className="editor-header">
                        <h2>{editing ? 'Blokni tahrirlash' : 'Yangi blok'}</h2>
                        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                            <option value="active">Faol</option>
                            <option value="inactive">Nofaol</option>
                        </select>
                    </div>

                    <label>Nomi<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                    <label>Tur/kategoriya<input required value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} placeholder="product, hotel_room, service" /></label>
                    <label>Tavsif<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
                    <label>Teglar<input value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="telefon, apple, mavjud" /></label>

                    <div className="field-editor">
                        <div className="field-editor-title">
                            <h3>Qoshimcha maydonlar</h3>
                            <button type="button" onClick={() => setFieldRows([...fieldRows, { key: '', value: '' }])}>Maydon qoshish</button>
                        </div>
                        {fieldRows.map((row, index) => (
                            <div className="field-row" key={index}>
                                <input placeholder="maydon_nomi" value={row.key} onChange={(event) => updateFieldRow(index, 'key', event.target.value)} />
                                <input placeholder="qiymat" value={row.value} onChange={(event) => updateFieldRow(index, 'value', event.target.value)} />
                                <button type="button" onClick={() => setFieldRows(fieldRows.filter((_, rowIndex) => rowIndex !== index))}>Olib tashlash</button>
                            </div>
                        ))}
                    </div>

                    <div className="preview-panel">
                        <h3>AI uchun korinish</h3>
                        <pre>{currentPreview}</pre>
                    </div>

                    <button type="submit">{editing ? 'Ozgartirishlarni saqlash' : 'Blok yaratish'}</button>
                </form>
            </section>

            <section className="context-panel">
                <h2>Filtrlangan Grok konteksti</h2>
                <pre>{contextPreview}</pre>
            </section>
        </main>
    );
};

export default AdminKnowledgeBase;
