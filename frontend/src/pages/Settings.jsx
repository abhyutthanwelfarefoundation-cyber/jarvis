import React, { useState, useEffect } from 'react';
import { getContacts, addContact } from '../services/api';

export default function Settings({ jarvis }) {
  const { lang } = jarvis;
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ nickname: '', real_name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [notifGranted, setNotifGranted] = useState(Notification.permission === 'granted');

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    try { setContacts(await getContacts()); } catch {}
  };

  const handleAddContact = async () => {
    if (!newContact.nickname || !newContact.phone) return;
    setSaving(true);
    try {
      await addContact(newContact.nickname, newContact.real_name, newContact.phone);
      setNewContact({ nickname: '', real_name: '', phone: '' });
      await loadContacts();
    } finally {
      setSaving(false);
    }
  };

  const requestNotifications = async () => {
    const perm = await Notification.requestPermission();
    setNotifGranted(perm === 'granted');
  };

  const SectionTitle = ({ children }) => (
    <p style={{
      fontSize: 11, color: 'var(--blue)', letterSpacing: 1.5,
      textTransform: 'uppercase', fontFamily: 'var(--font-mono)',
      padding: '18px 16px 8px',
    }}>{children}</p>
  );

  const inputStyle = {
    width: '100%', background: 'var(--bg-input)',
    border: '0.5px solid var(--border-light)',
    borderRadius: 10, padding: '10px 14px',
    fontSize: 13, color: 'var(--text-primary)',
    fontFamily: 'var(--font-ui)', outline: 'none',
    marginBottom: 8,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '12px 18px 10px',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <p style={{ fontSize: 12, color: 'white', fontFamily: 'var(--font-mono)', letterSpacing: 1 , fontWeight:500 }}>SETTINGS</p>
        <p style={{ fontSize: 13, color: 'var(--blue)' }}>Configure Jarvis</p>
      </div>

      <div className="page-scroll">

        {/* Notifications */}
        <SectionTitle>Notifications</SectionTitle>
        <div style={{ padding: '0 16px' }}>
          <div style={{
            background: 'var(--bg-card)', border: '0.5px solid var(--border-light)',
            borderRadius: 12, padding: '12px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>Push Notifications</p>
              <p style={{ fontSize: 11, color: 'var(--blue)', marginTop: 2 }}>
                {notifGranted ? 'Enabled — Jarvis will remind you' : 'Enable for task reminders'}
              </p>
            </div>
            {!notifGranted ? (
              <button onClick={requestNotifications} style={{
                padding: '7px 14px', background: 'var(--blue-dim)',
                border: '1px solid var(--blue)', borderRadius: 10,
                color: 'var(--blue)', fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}>Enable</button>
            ) : (
              <span style={{ fontSize: 18 }}>✅</span>
            )}
          </div>
        </div>

        {/* Contacts */}
        <SectionTitle>{lang === 'hi' ? 'Contacts (Call के लिए)' : 'Contacts (for calls)'}</SectionTitle>
        <div style={{ padding: '0 16px' }}>
          {contacts.map(c => (
            <div key={c.id} style={{
              background: 'var(--bg-card)', border: '0.5px solid var(--border-light)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 500 }}>"{c.nickname}"</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 8px' }}>→</span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{c.real_name}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c.phone}</span>
            </div>
          ))}

          {/* Add contact form */}
          <div style={{
            background: 'var(--bg-card)', border: '0.5px solid var(--border-light)',
            borderRadius: 12, padding: '14px',
          }}>
            <p style={{ fontSize: 11, color: 'var(--blue)', marginBottom: 10, fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
              ADD CONTACT
            </p>
            <input
              style={inputStyle}
              placeholder='Nickname (e.g. "mom", "bhai")'
              value={newContact.nickname}
              onChange={e => setNewContact({ ...newContact, nickname: e.target.value })}
            />
            <input
              style={inputStyle}
              placeholder="Real name"
              value={newContact.real_name}
              onChange={e => setNewContact({ ...newContact, real_name: e.target.value })}
            />
            <input
              style={{ ...inputStyle, marginBottom: 12 }}
              placeholder="Phone number (+91XXXXXXXXXX)"
              value={newContact.phone}
              onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
              type="tel"
            />
            <button
              onClick={handleAddContact}
              disabled={saving || !newContact.nickname || !newContact.phone}
              style={{
                width: '100%', padding: '11px',
                background: 'var(--blue-dim)', border: '1px solid var(--blue)',
                borderRadius: 10, color: 'var(--blue)',
                fontSize: 14, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Add Contact'}
            </button>
          </div>
        </div>

        {/* App info */}
        <SectionTitle>About</SectionTitle>
        <div style={{ padding: '0 16px 20px' }}>
          <div style={{
            background: 'var(--bg-card)', border: '0.5px solid var(--border-light)',
            borderRadius: 12, padding: '14px',
          }}>
            {[
              ['Version', '1.0.0'],
              ['AI Model', 'Groq Llama 3'],
              ['Languages', 'English, Hindi'],
              ['User', 'Naman sir'],
            ].map(([k, v]) => (
              <div key={k} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '7px 0', borderBottom: '0.5px solid var(--border)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{k}</span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
