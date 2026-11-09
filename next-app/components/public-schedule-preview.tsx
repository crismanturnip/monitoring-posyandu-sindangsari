'use client';

import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { scheduleCategoryLabels, type ScheduleCategory } from '@/lib/schedule-categories';

type PreviewSchedule = {
  id: string;
  posyandu_name: string;
  title: string;
  target_category: ScheduleCategory;
  starts_at: string;
  ends_at: string | null;
  location: string;
};

const fullDate = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
});
const timeOnly = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
}

export function PublicSchedulePreview({ schedules, upcoming }: { schedules: PreviewSchedule[]; upcoming: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplayStopped, setAutoplayStopped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(true);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const hasMultiple = schedules.length > 1;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setVisible(!document.hidden);
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    if (!hasMultiple || autoplayStopped || hovered || focused || reducedMotion || !visible) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % schedules.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [hasMultiple, autoplayStopped, hovered, focused, reducedMotion, visible, schedules.length]);

  const showSchedule = (index: number) => {
    setAutoplayStopped(true);
    setActiveIndex((index + schedules.length) % schedules.length);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const end = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !end || !hasMultiple) return;
    const horizontal = end.clientX - start.x;
    const vertical = end.clientY - start.y;
    if (Math.abs(horizontal) < 40 || Math.abs(horizontal) <= Math.abs(vertical)) return;
    showSchedule(activeIndex + (horizontal < 0 ? 1 : -1));
  };

  return (
    <section
      className="lp-visual-card lp-visual-main"
      aria-label={hasMultiple ? 'Pratinjau jadwal Posyandu. Geser atau gunakan tombol panah untuk melihat jadwal lain.' : 'Pratinjau jadwal Posyandu'}
      tabIndex={hasMultiple ? 0 : undefined}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHovered(false); }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      onKeyDown={(event) => {
        if (!hasMultiple || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
        event.preventDefault();
        showSchedule(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
      }}
    >
      <div className="lp-visual-head">
        <span className="lp-visual-title">Jadwal Posyandu</span>
        <span className="lp-live"><span className="lp-dot" aria-hidden="true" />Publik</span>
      </div>
      <div className="lp-visual-content">
        <p className="lp-visual-label">{upcoming || schedules.length === 0 ? 'Kegiatan berikutnya' : 'Jadwal terakhir'}</p>
        {schedules.length === 0 ? (
          <div className="lp-preview-empty"><h3>Belum ada jadwal</h3><p>Jadwal kegiatan berikutnya belum diumumkan. Silakan cek kembali nanti.</p></div>
        ) : (
          <div
            className="lp-preview-viewport"
            onTouchStart={(event) => {
              const point = event.touches[0];
              if (point) touchStart.current = { x: point.clientX, y: point.clientY };
            }}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => { touchStart.current = null; }}
          >
            <div className="lp-preview-track" style={{ transform: 'translateX(-' + activeIndex * 100 + '%)' }}>
              {schedules.map((schedule, index) => {
                const date = new Date(schedule.starts_at);
                return (
                  <div
                    className="lp-preview-slide"
                    key={schedule.id}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={'Jadwal ' + (index + 1) + ' dari ' + schedules.length}
                    aria-hidden={index !== activeIndex}
                  >
                    <div className="lp-preview-entry">
                      <h3>{schedule.title}</h3>
                      <span className={`lp-tag lp-tag-${schedule.target_category.toLowerCase()}`}>{scheduleCategoryLabels[schedule.target_category]}</span>
                      <p><ClockIcon /><time dateTime={schedule.starts_at}>{fullDate.format(date)} · {timeOnly.format(date)}{schedule.ends_at ? ` - ${timeOnly.format(new Date(schedule.ends_at))}` : ''} WIB</time></p>
                      <p><PinIcon />{schedule.posyandu_name} · {schedule.location}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
