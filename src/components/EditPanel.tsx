import { useState, useRef, useEffect } from 'react';
import type { InvitationConfig, L10n, WeddingEvent, Venue } from '../config/types';
import { downloadConfigJson } from '../lib/configStorage';
import { useInvite } from './context';
import { Sheet } from './Chrome';
import { CloseIcon } from './bits';

type TabKey = 'couple' | 'events' | 'venues' | 'family' | 'messages' | 'data';

export function EditPanel({
  open,
  onClose,
  initialConfig,
  onSave,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  initialConfig: InvitationConfig;
  onSave: (newConfig: InvitationConfig) => void;
  onReset: () => void;
}) {
  const { s } = useInvite();
  const [tab, setTab] = useState<TabKey>('couple');
  const [cfg, setCfg] = useState<InvitationConfig>(() => JSON.parse(JSON.stringify(initialConfig)));
  const [savedNotice, setSavedNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with initialConfig whenever opened
  useEffect(() => {
    if (open) {
      setCfg(JSON.parse(JSON.stringify(initialConfig)));
    }
  }, [open, initialConfig]);

  const handleSave = () => {
    onSave(cfg);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2600);
  };

  const handleReset = () => {
    if (window.confirm(s.resetConfirm)) {
      onReset();
      onClose();
    }
  };

  const updateCouple = (field: 'bride' | 'groom', lang: 'en' | 'si', val: string) => {
    setCfg((prev) => ({
      ...prev,
      couple: {
        ...prev.couple,
        [field]: {
          ...prev.couple[field],
          [lang]: val,
        },
      },
    }));
  };

  const updateMonogram = (val: string) => {
    setCfg((prev) => ({
      ...prev,
      couple: {
        ...prev.couple,
        monogram: val,
      },
    }));
  };

  const updateCopy = (key: keyof InvitationConfig['copy'], lang: 'en' | 'si', val: string) => {
    setCfg((prev) => {
      const prevVal = prev.copy[key] as L10n | null;
      return {
        ...prev,
        copy: {
          ...prev.copy,
          [key]: {
            ...(prevVal ?? { en: '', si: '' }),
            [lang]: val,
          },
        },
      };
    });
  };

  const updateEvent = (index: number, patch: Partial<WeddingEvent>) => {
    setCfg((prev) => {
      const nextEvents = [...prev.events];
      nextEvents[index] = { ...nextEvents[index], ...patch };
      return { ...prev, events: nextEvents };
    });
  };

  const addCustomEvent = () => {
    const newId = `event-${Date.now()}`;
    const newEv: WeddingEvent = {
      id: newId,
      kind: 'custom',
      enabled: true,
      title: { en: 'New Ceremony Event', si: 'නව මංගල අවස්ථාව' },
      description: { en: 'Details of this special occasion.', si: 'මෙම විශේෂ අවස්ථාවේ විස්තර.' },
      date: cfg.weddingDate,
      time: '11:00',
      timeStatus: 'confirmed',
      venueId: cfg.mainVenueId,
      rsvpSelectable: true,
    };
    setCfg((prev) => ({
      ...prev,
      events: [...prev.events, newEv],
    }));
  };

  const removeEvent = (index: number) => {
    setCfg((prev) => ({
      ...prev,
      events: prev.events.filter((_, i) => i !== index),
    }));
  };

  const updateVenue = (venueId: string, patch: Partial<Venue>) => {
    setCfg((prev) => {
      const nextVenues = prev.venues.map((v) => (v.id === venueId ? { ...v, ...patch } : v));
      return { ...prev, venues: nextVenues };
    });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed && typeof parsed === 'object' && parsed.couple && parsed.weddingDate) {
          setCfg(parsed);
          onSave(parsed);
          alert(s.savedSuccess);
        } else {
          alert(s.invalidJson);
        }
      } catch (err) {
        alert(s.invalidJson);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Sheet open={open} onClose={onClose} labelledBy="edit-panel-title" className="sheet--edit">
      <div className="edit-shell">
        <header className="edit-header">
          <div>
            <h2 id="edit-panel-title" className="edit-title">{s.editInvitation}</h2>
            <p className="edit-sub">{s.editSubtitle}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={s.close}>
            <CloseIcon />
          </button>
        </header>

        {/* Tab Navigation */}
        <nav className="edit-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'couple'} className={`edit-tab ${tab === 'couple' ? 'is-active' : ''}`} onClick={() => setTab('couple')}>
            {s.tabCouple}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'events'} className={`edit-tab ${tab === 'events' ? 'is-active' : ''}`} onClick={() => setTab('events')}>
            {s.tabEvents}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'venues'} className={`edit-tab ${tab === 'venues' ? 'is-active' : ''}`} onClick={() => setTab('venues')}>
            {s.tabVenues}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'family'} className={`edit-tab ${tab === 'family' ? 'is-active' : ''}`} onClick={() => setTab('family')}>
            {s.tabFamily}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'messages'} className={`edit-tab ${tab === 'messages' ? 'is-active' : ''}`} onClick={() => setTab('messages')}>
            {s.tabMessages}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'data'} className={`edit-tab ${tab === 'data' ? 'is-active' : ''}`} onClick={() => setTab('data')}>
            {s.tabExport}
          </button>
        </nav>

        {/* Body based on active tab */}
        <div className="edit-body">
          {tab === 'couple' && (
            <div className="edit-section">
              <div className="edit-field-group">
                <h3 className="edit-group-title">{s.brideName}</h3>
                <div className="edit-duo">
                  <label className="edit-field">
                    <span>English</span>
                    <input type="text" value={cfg.couple.bride.en} onChange={(e) => updateCouple('bride', 'en', e.target.value)} />
                  </label>
                  <label className="edit-field">
                    <span>සිංහල</span>
                    <input type="text" value={cfg.couple.bride.si} onChange={(e) => updateCouple('bride', 'si', e.target.value)} />
                  </label>
                </div>
              </div>

              <div className="edit-field-group">
                <h3 className="edit-group-title">{s.groomName}</h3>
                <div className="edit-duo">
                  <label className="edit-field">
                    <span>English</span>
                    <input type="text" value={cfg.couple.groom.en} onChange={(e) => updateCouple('groom', 'en', e.target.value)} />
                  </label>
                  <label className="edit-field">
                    <span>සිංහල</span>
                    <input type="text" value={cfg.couple.groom.si} onChange={(e) => updateCouple('groom', 'si', e.target.value)} />
                  </label>
                </div>
              </div>

              <div className="edit-duo">
                <label className="edit-field">
                  <span>{s.monogram}</span>
                  <input type="text" value={cfg.couple.monogram} onChange={(e) => updateMonogram(e.target.value)} placeholder="N & K" />
                </label>
                <label className="edit-field">
                  <span>{s.weddingDateLabel}</span>
                  <input type="date" value={cfg.weddingDate} onChange={(e) => setCfg((prev) => ({ ...prev, weddingDate: e.target.value }))} />
                </label>
              </div>

              <label className="edit-field">
                <span>{s.rsvpDeadlineLabel}</span>
                <input type="date" value={cfg.rsvp.deadline} onChange={(e) => setCfg((prev) => ({ ...prev, rsvp: { ...prev.rsvp, deadline: e.target.value } }))} />
              </label>
            </div>
          )}

          {tab === 'events' && (
            <div className="edit-section">
              <p className="edit-hint">Customize auspicious ceremony timings, titles, and dates. All times are local Sri Lanka time (UTC+5:30).</p>
              
              <div className="edit-events-list">
                {cfg.events.map((ev, idx) => (
                  <div key={ev.id} className="edit-event-card">
                    <div className="edit-event-head">
                      <label className="edit-checkbox-label">
                        <input
                          type="checkbox"
                          checked={ev.enabled}
                          onChange={(e) => updateEvent(idx, { enabled: e.target.checked })}
                        />
                        <strong>{ev.title.en}</strong>
                      </label>
                      <button type="button" className="btn-delete" onClick={() => removeEvent(idx)} aria-label={`${s.removeEvent} ${ev.title.en}`}>
                        {s.removeEvent}
                      </button>
                    </div>

                    <div className="edit-duo">
                      <label className="edit-field">
                        <span>{s.eventTitle} (English)</span>
                        <input
                          type="text"
                          value={ev.title.en}
                          onChange={(e) => updateEvent(idx, { title: { ...ev.title, en: e.target.value } })}
                        />
                      </label>
                      <label className="edit-field">
                        <span>{s.eventTitle} (සිංහල)</span>
                        <input
                          type="text"
                          value={ev.title.si}
                          onChange={(e) => updateEvent(idx, { title: { ...ev.title, si: e.target.value } })}
                        />
                      </label>
                    </div>

                    <div className="edit-duo">
                      <label className="edit-field">
                        <span>{s.eventDate}</span>
                        <input
                          type="date"
                          value={ev.date}
                          onChange={(e) => updateEvent(idx, { date: e.target.value })}
                        />
                      </label>
                      <label className="edit-field">
                        <span>{s.eventTime} (HH:MM)</span>
                        <input
                          type="time"
                          value={ev.time ?? ''}
                          onChange={(e) => updateEvent(idx, { time: e.target.value || null })}
                        />
                      </label>
                    </div>

                    <div className="edit-duo">
                      <label className="edit-field">
                        <span>{s.eventTimeStatus}</span>
                        <select
                          value={ev.timeStatus}
                          onChange={(e) => updateEvent(idx, { timeStatus: e.target.value as WeddingEvent['timeStatus'] })}
                        >
                          <option value="confirmed">{s.statusConfirmed}</option>
                          <option value="sample">{s.statusSample}</option>
                          <option value="tba">{s.statusTba}</option>
                        </select>
                      </label>
                      <label className="edit-field">
                        <span>{s.venue}</span>
                        <select
                          value={ev.venueId}
                          onChange={(e) => updateEvent(idx, { venueId: e.target.value })}
                        >
                          {cfg.venues.map((v) => (
                            <option key={v.id} value={v.id}>{v.name.en}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="edit-duo">
                      <label className="edit-field">
                        <span>{s.eventDescription} (English)</span>
                        <textarea
                          rows={2}
                          value={ev.description.en}
                          onChange={(e) => updateEvent(idx, { description: { ...ev.description, en: e.target.value } })}
                        />
                      </label>
                      <label className="edit-field">
                        <span>{s.eventDescription} (සිංහල)</span>
                        <textarea
                          rows={2}
                          value={ev.description.si}
                          onChange={(e) => updateEvent(idx, { description: { ...ev.description, si: e.target.value } })}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="btn btn--soft edit-add-btn" onClick={addCustomEvent}>
                {s.addNewEvent}
              </button>
            </div>
          )}

          {tab === 'venues' && (
            <div className="edit-section">
              {cfg.venues.map((venue) => (
                <div key={venue.id} className="edit-event-card">
                  <h3 className="edit-group-title">{venue.id === cfg.mainVenueId ? `${s.mainVenueLabel} (${venue.id})` : venue.id}</h3>
                  <div className="edit-duo">
                    <label className="edit-field">
                      <span>{s.venueName} (English)</span>
                      <input
                        type="text"
                        value={venue.name.en}
                        onChange={(e) => updateVenue(venue.id, { name: { ...venue.name, en: e.target.value } })}
                      />
                    </label>
                    <label className="edit-field">
                      <span>{s.venueName} (සිංහල)</span>
                      <input
                        type="text"
                        value={venue.name.si}
                        onChange={(e) => updateVenue(venue.id, { name: { ...venue.name, si: e.target.value } })}
                      />
                    </label>
                  </div>
                  <div className="edit-duo">
                    <label className="edit-field">
                      <span>{s.venueAddress} (English)</span>
                      <input
                        type="text"
                        value={venue.address.en}
                        onChange={(e) => updateVenue(venue.id, { address: { ...venue.address, en: e.target.value } })}
                      />
                    </label>
                    <label className="edit-field">
                      <span>{s.venueAddress} (සිංහල)</span>
                      <input
                        type="text"
                        value={venue.address.si}
                        onChange={(e) => updateVenue(venue.id, { address: { ...venue.address, si: e.target.value } })}
                      />
                    </label>
                  </div>
                  <label className="edit-field">
                    <span>{s.venueMapUrl}</span>
                    <input
                      type="url"
                      value={venue.mapUrl}
                      onChange={(e) => updateVenue(venue.id, { mapUrl: e.target.value })}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}

          {tab === 'family' && (
            <div className="edit-section">
              {cfg.families && (
                <>
                  <div className="edit-event-card">
                    <h3 className="edit-group-title">Bride's Family</h3>
                    <div className="edit-duo">
                      <label className="edit-field">
                        <span>Parents (English)</span>
                        <input
                          type="text"
                          value={cfg.families.bride.parents.en}
                          onChange={(e) =>
                            setCfg((prev) => prev.families ? {
                              ...prev,
                              families: {
                                ...prev.families,
                                bride: {
                                  ...prev.families.bride,
                                  parents: { ...prev.families.bride.parents, en: e.target.value },
                                },
                              },
                            } : prev)
                          }
                        />
                      </label>
                      <label className="edit-field">
                        <span>දෙමාපියන් (සිංහල)</span>
                        <input
                          type="text"
                          value={cfg.families.bride.parents.si}
                          onChange={(e) =>
                            setCfg((prev) => prev.families ? {
                              ...prev,
                              families: {
                                ...prev.families,
                                bride: {
                                  ...prev.families.bride,
                                  parents: { ...prev.families.bride.parents, si: e.target.value },
                                },
                              },
                            } : prev)
                          }
                        />
                      </label>
                    </div>
                    <div className="edit-duo">
                      <label className="edit-field">
                        <span>Hometown / Origin (English)</span>
                        <input
                          type="text"
                          value={cfg.families.bride.from?.en ?? ''}
                          onChange={(e) =>
                            setCfg((prev) => prev.families ? {
                              ...prev,
                              families: {
                                ...prev.families,
                                bride: {
                                  ...prev.families.bride,
                                  from: { en: e.target.value, si: prev.families.bride.from?.si ?? '' },
                                },
                              },
                            } : prev)
                          }
                        />
                      </label>
                      <label className="edit-field">
                        <span>ගම / ප්‍රදේශය (සිංහල)</span>
                        <input
                          type="text"
                          value={cfg.families.bride.from?.si ?? ''}
                          onChange={(e) =>
                            setCfg((prev) => prev.families ? {
                              ...prev,
                              families: {
                                ...prev.families,
                                bride: {
                                  ...prev.families.bride,
                                  from: { en: prev.families.bride.from?.en ?? '', si: e.target.value },
                                },
                              },
                            } : prev)
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="edit-event-card">
                    <h3 className="edit-group-title">Groom's Family</h3>
                    <div className="edit-duo">
                      <label className="edit-field">
                        <span>Parents (English)</span>
                        <input
                          type="text"
                          value={cfg.families.groom.parents.en}
                          onChange={(e) =>
                            setCfg((prev) => prev.families ? {
                              ...prev,
                              families: {
                                ...prev.families,
                                groom: {
                                  ...prev.families.groom,
                                  parents: { ...prev.families.groom.parents, en: e.target.value },
                                },
                              },
                            } : prev)
                          }
                        />
                      </label>
                      <label className="edit-field">
                        <span>දෙමාපියන් (සිංහල)</span>
                        <input
                          type="text"
                          value={cfg.families.groom.parents.si}
                          onChange={(e) =>
                            setCfg((prev) => prev.families ? {
                              ...prev,
                              families: {
                                ...prev.families,
                                groom: {
                                  ...prev.families.groom,
                                  parents: { ...prev.families.groom.parents, si: e.target.value },
                                },
                              },
                            } : prev)
                          }
                        />
                      </label>
                    </div>
                    <div className="edit-duo">
                      <label className="edit-field">
                        <span>Hometown / Origin (English)</span>
                        <input
                          type="text"
                          value={cfg.families.groom.from?.en ?? ''}
                          onChange={(e) =>
                            setCfg((prev) => prev.families ? {
                              ...prev,
                              families: {
                                ...prev.families,
                                groom: {
                                  ...prev.families.groom,
                                  from: { en: e.target.value, si: prev.families.groom.from?.si ?? '' },
                                },
                              },
                            } : prev)
                          }
                        />
                      </label>
                      <label className="edit-field">
                        <span>ගම / ප්‍රදේශය (සිංහල)</span>
                        <input
                          type="text"
                          value={cfg.families.groom.from?.si ?? ''}
                          onChange={(e) =>
                            setCfg((prev) => prev.families ? {
                              ...prev,
                              families: {
                                ...prev.families,
                                groom: {
                                  ...prev.families.groom,
                                  from: { en: prev.families.groom.from?.en ?? '', si: e.target.value },
                                },
                              },
                            } : prev)
                          }
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="edit-event-card">
                <h3 className="edit-group-title">{s.dressCode}</h3>
                <div className="edit-duo">
                  <label className="edit-field">
                    <span>English</span>
                    <input
                      type="text"
                      value={cfg.copy.dressCode?.en ?? ''}
                      onChange={(e) => updateCopy('dressCode', 'en', e.target.value)}
                    />
                  </label>
                  <label className="edit-field">
                    <span>සිංහල</span>
                    <input
                      type="text"
                      value={cfg.copy.dressCode?.si ?? ''}
                      onChange={(e) => updateCopy('dressCode', 'si', e.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {tab === 'messages' && (
            <div className="edit-section">
              <div className="edit-event-card">
                <h3 className="edit-group-title">Opening Invitation (Envelope)</h3>
                <div className="edit-duo">
                  <label className="edit-field">
                    <span>English</span>
                    <textarea rows={2} value={cfg.copy.opening.en} onChange={(e) => updateCopy('opening', 'en', e.target.value)} />
                  </label>
                  <label className="edit-field">
                    <span>සිංහල</span>
                    <textarea rows={2} value={cfg.copy.opening.si} onChange={(e) => updateCopy('opening', 'si', e.target.value)} />
                  </label>
                </div>
              </div>

              <div className="edit-event-card">
                <h3 className="edit-group-title">Formal Request of Company</h3>
                <div className="edit-duo">
                  <label className="edit-field">
                    <span>English</span>
                    <textarea rows={2} value={cfg.copy.invitation.en} onChange={(e) => updateCopy('invitation', 'en', e.target.value)} />
                  </label>
                  <label className="edit-field">
                    <span>සිංහල</span>
                    <textarea rows={2} value={cfg.copy.invitation.si} onChange={(e) => updateCopy('invitation', 'si', e.target.value)} />
                  </label>
                </div>
              </div>

              <div className="edit-event-card">
                <h3 className="edit-group-title">Closing Message</h3>
                <div className="edit-duo">
                  <label className="edit-field">
                    <span>English</span>
                    <textarea rows={2} value={cfg.copy.closing.en} onChange={(e) => updateCopy('closing', 'en', e.target.value)} />
                  </label>
                  <label className="edit-field">
                    <span>සිංහල</span>
                    <textarea rows={2} value={cfg.copy.closing.si} onChange={(e) => updateCopy('closing', 'si', e.target.value)} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {tab === 'data' && (
            <div className="edit-section">
              <div className="edit-event-card">
                <h3 className="edit-group-title">Display Settings</h3>
                <label className="edit-checkbox-label">
                  <input
                    type="checkbox"
                    checked={cfg.demo}
                    onChange={(e) => setCfg((prev) => ({ ...prev, demo: e.target.checked }))}
                  />
                  <span>{s.previewModeToggle}</span>
                </label>
              </div>

              <div className="edit-event-card">
                <h3 className="edit-group-title">Backup & Migration</h3>
                <p className="edit-hint">Download your customized invitation as a JSON backup, or import a saved config on another browser.</p>
                <div className="edit-actions-row">
                  <button type="button" className="btn btn--soft" onClick={() => downloadConfigJson(cfg)}>
                    {s.exportJson}
                  </button>
                  <button type="button" className="btn btn--soft" onClick={() => fileInputRef.current?.click()}>
                    {s.importJson}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleFileImport}
                  />
                </div>
              </div>

              <div className="edit-event-card edit-event-card--danger">
                <h3 className="edit-group-title">Restore Defaults</h3>
                <p className="edit-hint">Discard all changes and reset back to the template’s original sample names and dates.</p>
                <button type="button" className="btn btn--danger" onClick={handleReset}>
                  {s.resetDefaults}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <footer className="edit-footer">
          {savedNotice && <span className="edit-success-tag">✓ {s.savedSuccess}</span>}
          <div className="edit-footer-right">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {s.close}
            </button>
            <button type="button" className="btn btn--primary" onClick={handleSave}>
              {s.saveChanges}
            </button>
          </div>
        </footer>
      </div>
    </Sheet>
  );
}
