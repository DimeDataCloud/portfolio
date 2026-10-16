// DOM interface: menu, project list sync, case-study overlay, profile overlay,
// focus management (trap + return), mode switch, sound toggle, deep links.
// Content comes from src/data/profile.js and src/data/projects.js only.

import { projects, socials } from '../data/projects.js';
import { contact, education, experience, metrics, profile, skills } from '../data/profile.js';
import { iconSvg } from './icons.js';
import { sound } from '../audio/sound.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export class Interface {
  constructor() {
    this.carousel = null; // wired by main.js
    this.openIndex = null; // project detail open
    this.aboutOpen = false;
    this.returnFocus = null;

    this.el = {
      list: document.getElementById('project-list'),
      menuBtn: document.getElementById('menu-btn'),
      menuPanel: document.getElementById('menu-panel'),
      menuLinks: document.getElementById('menu-links'),
      menuSocials: document.getElementById('menu-socials'),
      menuClose: document.getElementById('menu-close'),
      menuAbout: document.getElementById('menu-about'),
      detail: document.getElementById('detail'),
      detailPanel: document.getElementById('detail-panel'),
      detailInner: document.getElementById('detail-inner'),
      detailIndex: document.getElementById('detail-index'),
      detailStatusDot: document.querySelector('#detail-status .status-dot'),
      detailStatusText: document.getElementById('detail-status-text'),
      detailTitle: document.getElementById('detail-title'),
      detailDesc: document.getElementById('detail-desc'),
      detailMetrics: document.getElementById('detail-metrics'),
      detailCase: document.getElementById('detail-case'),
      detailStack: document.getElementById('detail-stack'),
      detailLinks: document.getElementById('detail-links'),
      detailClose: document.getElementById('detail-close'),
      about: document.getElementById('about'),
      aboutPanel: document.getElementById('about-panel'),
      aboutInner: document.getElementById('about-inner'),
      aboutBody: document.getElementById('about-body'),
      aboutClose: document.getElementById('about-close'),
      soundBtn: document.getElementById('sound-btn'),
      soundOn: document.querySelector('.icon-sound-on'),
      soundOff: document.querySelector('.icon-sound-off'),
      modeMotion: document.getElementById('mode-motion'),
      modeSound: document.getElementById('mode-sound'),
      webgl: document.getElementById('webgl'),
    };

    // overlay bodies that can overflow must be reachable by keyboard
    this.el.detailInner.tabIndex = 0;
    this.el.aboutInner.tabIndex = 0;

    this.renderProfile();
    this.buildMenu();
    this.bindList();
    this.bindOverlays();
    this.bindSound();
    this.bindKeys();
  }

  /* ---------- profile (rendered from profile.js) ---------- */
  renderProfile() {
    const metricItems = metrics
      .map((m) => `<li class="metric"><span class="metric-value">${esc(m.value)}</span><span class="metric-label">${esc(m.label)}</span></li>`)
      .join('');

    const roles = experience
      .map(
        (r) => `
        <article class="role">
          <div class="role-head">
            <h4 class="role-title">${esc(r.role)}</h4>
            <p class="role-org">${esc(r.org)}<span class="role-place"> · ${esc(r.place)}</span></p>
          </div>
          <p class="role-blurb">${esc(r.blurb)}</p>
          <ul class="role-points">${r.points.map((pt) => `<li>${esc(pt)}</li>`).join('')}</ul>
        </article>`,
      )
      .join('');

    const groups = skills
      .map(
        (g) => `
        <div class="skill-group">
          <h4 class="skill-name">${esc(g.group)}</h4>
          <ul class="tags">${g.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        </div>`,
      )
      .join('');

    const edu = education.map((x) => `<li>${esc(x)}</li>`).join('');

    const links = contact.links
      .map(
        (l) =>
          `<li><a class="contact-link" href="${esc(l.url)}" target="_blank" rel="noopener">${iconSvg(l.icon)}<span>${esc(l.name)}</span></a></li>`,
      )
      .join('');

    this.el.aboutBody.innerHTML = `
      <div class="profile-head">
        <h2 class="about-title" id="about-title">${esc(profile.name)}</h2>
        <p class="profile-headline">${esc(profile.headline)}</p>
        <p class="profile-loc">${esc(profile.location)}</p>
      </div>
      <p class="profile-summary">${esc(profile.summary)}</p>
      <p class="profile-running">${esc(profile.running)}</p>
      <ul class="metrics" aria-label="Headline numbers">${metricItems}</ul>

      <section class="profile-sec" aria-labelledby="sec-exp">
        <h3 class="sec-title" id="sec-exp">Experience</h3>
        ${roles}
      </section>

      <section class="profile-sec" aria-labelledby="sec-skills">
        <h3 class="sec-title" id="sec-skills">Skills</h3>
        ${groups}
      </section>

      <section class="profile-sec" aria-labelledby="sec-edu">
        <h3 class="sec-title" id="sec-edu">Education</h3>
        <ul class="edu">${edu}</ul>
      </section>

      <section class="profile-sec" aria-labelledby="sec-contact">
        <h3 class="sec-title" id="sec-contact">Contact</h3>
        <p><a class="contact-mail" href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></p>
        <ul class="contact-links">${links}</ul>
      </section>`;
  }

  /* ---------- menu ---------- */
  buildMenu() {
    this.el.menuLinks.innerHTML = projects
      .map((p, i) => `<li><a href="#${esc(p.slug)}" data-index="${i}">${esc(p.title)}</a></li>`)
      .join('');
    this.el.menuSocials.innerHTML = socials
      .map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.name)}">${iconSvg(s.icon)}</a>`)
      .join('');

    this.el.menuBtn.addEventListener('click', () => this.setMenu(true));
    this.el.menuClose.addEventListener('click', () => this.setMenu(false));
    this.el.menuLinks.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      const i = Number(a.dataset.index);
      this.setMenu(false);
      this.carousel?.focusProject(i);
      setTimeout(() => this.openDetail(i), 350);
    });
    this.el.menuAbout.addEventListener('click', () => {
      this.setMenu(false);
      setTimeout(() => this.setAbout(true), 250);
    });
  }

  setMenu(open) {
    this.el.menuPanel.classList.toggle('open', open);
    this.el.menuPanel.setAttribute('aria-hidden', String(!open));
    this.el.menuPanel.inert = !open; // closed panels take no focus or clicks
    this.el.menuBtn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    if (open) sound.pressThock();
    this.carousel && (open ? this.carousel.input.pause() : this.carousel.input.resume());
    if (open) this.el.menuClose.focus();
    else this.el.menuBtn.focus();
  }

  /* ---------- DOM project list <-> carousel sync ---------- */
  bindList() {
    this.domFocus = null; // list-owned hover; carousel raycast must not clobber it
    this.anchors = [...this.el.list.querySelectorAll('a[data-index]')];
    this.anchors.forEach((a, pos) => {
      const i = Number(a.dataset.index);
      a.addEventListener('mouseenter', () => {
        this.domFocus = pos;
        this.carousel?.focusProject(i);
        this.setListFocus(pos);
        sound.hoverTick();
      });
      a.addEventListener('mouseleave', () => {
        this.domFocus = null;
        this.setListFocus(null);
      });
      a.addEventListener('focus', () => {
        this.carousel?.focusProject(i);
        this.setListFocus(pos);
      });
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.openDetail(i);
      });
    });
  }

  setListFocus(pos) {
    this.el.list.classList.toggle('has-focus', pos !== null);
    this.anchors.forEach((a, j) => a.classList.toggle('focused', pos === j));
  }

  /* ---------- project case study overlay ---------- */
  openDetail(i) {
    const p = projects[i];
    if (!p) return;
    this.rememberFocus();
    this.openIndex = i;
    sound.pressThock();

    this.el.detailIndex.textContent = `P-${String(i + 1).padStart(2, '0')}`;
    this.el.detailStatusDot.className = `status-dot ${p.status}`;
    this.el.detailStatusText.textContent = p.statusText;
    this.el.detailTitle.textContent = p.title;
    this.el.detailDesc.textContent = p.desc;

    const chips = (p.metrics || []).slice(0, 3);
    this.el.detailMetrics.innerHTML = chips
      .map((m) => `<div class="chip"><span class="chip-value">${esc(m.value)}</span><span class="chip-label">${esc(m.label)}</span></div>`)
      .join('');
    this.el.detailMetrics.hidden = chips.length === 0;

    const sections = [
      ['Problem', p.problem],
      ['Built', p.built],
      ['Result', p.result],
    ].filter(([, text]) => text);
    this.el.detailCase.innerHTML = sections
      .map(([heading, text]) => `<section class="case-sec"><h3 class="case-title">${heading}</h3><p>${esc(text)}</p></section>`)
      .join('');

    this.el.detailStack.innerHTML = p.stack.map((s) => `<li>${esc(s)}</li>`).join('');

    const links = [];
    if (p.liveUrl) links.push(`<a class="primary" href="${esc(p.liveUrl)}" target="_blank" rel="noopener">Visit live ↗</a>`);
    if (p.repoUrl) links.push(`<a class="ghost" href="${esc(p.repoUrl)}" target="_blank" rel="noopener">${iconSvg('github')} Source</a>`);
    if (p.privateNote) links.push(`<span class="private">${esc(p.privateNote)}</span>`);
    this.el.detailLinks.innerHTML = links.join('');

    this.el.detailInner.scrollTop = 0;
    this.el.detail.classList.add('open');
    this.el.detail.setAttribute('aria-hidden', 'false');
    this.el.detail.inert = false;
    this.el.webgl.classList.add('dimmed');
    history.replaceState(null, '', `#${p.slug}`);
    this.carousel?.input.pause();
    this.el.detailClose.focus();
  }

  closeDetail() {
    this.openIndex = null;
    this.el.detail.classList.remove('open');
    this.el.detail.setAttribute('aria-hidden', 'true');
    this.el.detail.inert = true;
    this.el.webgl.classList.toggle('dimmed', this.aboutOpen);
    history.replaceState(null, '', location.pathname);
    this.carousel?.input.resume();
    this.restoreFocus();
  }

  /* ---------- profile overlay ---------- */
  setAbout(open) {
    if (open === this.aboutOpen) return;
    this.aboutOpen = open;
    if (open) this.rememberFocus();
    this.el.about.classList.toggle('open', open);
    this.el.about.setAttribute('aria-hidden', String(!open));
    this.el.about.inert = !open;
    this.el.webgl.classList.toggle('dimmed', open);
    this.carousel && (open ? this.carousel.input.pause() : this.carousel.input.resume());
    if (open) {
      this.el.aboutInner.scrollTop = 0;
      history.replaceState(null, '', '#about');
      this.el.aboutClose.focus();
    } else {
      history.replaceState(null, '', location.pathname);
      this.restoreFocus();
    }
  }

  bindOverlays() {
    this.el.detailClose.addEventListener('click', () => this.closeDetail());
    this.el.detail.addEventListener('click', (e) => {
      if (e.target === this.el.detail) this.closeDetail();
    });
    this.el.aboutClose.addEventListener('click', () => this.setAbout(false));
    this.el.about.addEventListener('click', (e) => {
      if (e.target === this.el.about) this.setAbout(false);
    });
  }

  /* ---------- focus management ---------- */
  rememberFocus() {
    const a = document.activeElement;
    this.returnFocus = a && a !== document.body ? a : null;
  }

  restoreFocus() {
    const target = this.returnFocus;
    this.returnFocus = null;
    if (target && document.contains(target)) target.focus({ preventScroll: true });
  }

  trapFocus(e, container) {
    const items = [...container.querySelectorAll(FOCUSABLE)].filter((n) => n.getClientRects().length > 0);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    const inside = container.contains(active);
    if (e.shiftKey && (active === first || !inside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !inside)) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---------- sound + mode ---------- */
  bindSound() {
    this.el.soundBtn.addEventListener('click', () => {
      const on = sound.toggle();
      this.reflectSound(on);
    });
    this.el.modeMotion.addEventListener('click', () => {
      sound.disable();
      this.reflectSound(false);
      this.setMode('motion');
    });
    this.el.modeSound.addEventListener('click', () => {
      sound.enable();
      this.reflectSound(true);
      this.setMode('sound');
    });
  }

  reflectSound(on) {
    this.el.soundBtn.setAttribute('aria-pressed', String(on));
    this.el.soundOn.hidden = !on;
    this.el.soundOff.hidden = on;
    this.setMode(on ? 'sound' : 'motion');
  }

  setMode(mode) {
    this.el.modeMotion.classList.toggle('active', mode === 'motion');
    this.el.modeMotion.setAttribute('aria-pressed', String(mode === 'motion'));
    this.el.modeSound.classList.toggle('active', mode === 'sound');
    this.el.modeSound.setAttribute('aria-pressed', String(mode === 'sound'));
  }

  /* ---------- keyboard ---------- */
  bindKeys() {
    window.addEventListener('keydown', (e) => {
      const menuOpen = this.el.menuPanel.classList.contains('open');

      if (e.key === 'Escape') {
        if (this.openIndex !== null) this.closeDetail();
        else if (this.aboutOpen) this.setAbout(false);
        else if (menuOpen) this.setMenu(false);
        return;
      }

      if (e.key === 'Tab') {
        const layer =
          this.openIndex !== null ? this.el.detailPanel : this.aboutOpen ? this.el.aboutPanel : menuOpen ? this.el.menuPanel : null;
        if (layer) this.trapFocus(e, layer);
        return;
      }

      if (e.key === 'Enter' && document.activeElement === document.body && this.carousel?.hovered) {
        this.openDetail(this.carousel.hovered.dataIndex);
      }
    });
  }

  /* ---------- deep links: #slug opens a case study, #about the profile ---------- */
  openFromHash() {
    const slug = decodeURIComponent(location.hash.slice(1));
    if (!slug) return;
    if (slug === 'about') {
      this.setAbout(true);
      return;
    }
    const i = projects.findIndex((p) => p.slug === slug);
    if (i >= 0) {
      this.carousel?.focusProject(i);
      setTimeout(() => this.openDetail(i), 500);
    }
  }
}
