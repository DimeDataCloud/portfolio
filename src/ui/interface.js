// DOM interface: menu panel, project list sync, detail + about overlays,
// mode switch, sound toggle, deep links, keyboard flow.

import { projects, socials } from '../data/projects.js';
import { iconSvg } from './icons.js';
import { sound } from '../audio/sound.js';

export class Interface {
  constructor() {
    this.carousel = null; // wired by main.js
    this.openIndex = null;

    this.el = {
      list: document.getElementById('project-list'),
      menuBtn: document.getElementById('menu-btn'),
      menuPanel: document.getElementById('menu-panel'),
      menuLinks: document.getElementById('menu-links'),
      menuSocials: document.getElementById('menu-socials'),
      menuClose: document.getElementById('menu-close'),
      menuAbout: document.getElementById('menu-about'),
      detail: document.getElementById('detail'),
      detailIndex: document.getElementById('detail-index'),
      detailStatusDot: document.querySelector('#detail-status .status-dot'),
      detailStatusText: document.getElementById('detail-status-text'),
      detailTitle: document.getElementById('detail-title'),
      detailDesc: document.getElementById('detail-desc'),
      detailStack: document.getElementById('detail-stack'),
      detailLinks: document.getElementById('detail-links'),
      detailClose: document.getElementById('detail-close'),
      about: document.getElementById('about'),
      aboutClose: document.getElementById('about-close'),
      soundBtn: document.getElementById('sound-btn'),
      soundOn: document.querySelector('.icon-sound-on'),
      soundOff: document.querySelector('.icon-sound-off'),
      modeMotion: document.getElementById('mode-motion'),
      modeSound: document.getElementById('mode-sound'),
      webgl: document.getElementById('webgl'),
    };

    this.buildMenu();
    this.bindList();
    this.bindOverlays();
    this.bindSound();
    this.bindKeys();
  }

  /* ---------- menu ---------- */
  buildMenu() {
    this.el.menuLinks.innerHTML = projects
      .map((p, i) => `<li><a href="#${p.slug}" data-index="${i}">${p.title}</a></li>`)
      .join('');
    this.el.menuSocials.innerHTML = socials
      .map((s) => `<a href="${s.url}" target="_blank" rel="noopener" aria-label="${s.name}">${iconSvg(s.icon)}</a>`)
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
    const anchors = [...this.el.list.querySelectorAll('a')];
    anchors.forEach((a, i) => {
      a.addEventListener('mouseenter', () => {
        this.domFocus = i;
        this.carousel?.focusProject(i);
        this.setListFocus(i);
        sound.hoverTick();
      });
      a.addEventListener('mouseleave', () => {
        this.domFocus = null;
        this.setListFocus(null);
      });
      a.addEventListener('focus', () => {
        this.carousel?.focusProject(i);
        this.setListFocus(i);
      });
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.openDetail(i);
      });
    });
    this.anchors = anchors;
  }

  setListFocus(i) {
    this.el.list.classList.toggle('has-focus', i !== null);
    this.anchors.forEach((a, j) => a.classList.toggle('focused', i === j));
  }

  /* ---------- detail overlay ---------- */
  openDetail(i) {
    const p = projects[i];
    if (!p) return;
    this.openIndex = i;
    sound.pressThock();

    this.el.detailIndex.textContent = `P-${String(i + 1).padStart(2, '0')}`;
    this.el.detailStatusDot.className = `status-dot ${p.status}`;
    this.el.detailStatusText.textContent = p.statusText;
    this.el.detailTitle.textContent = p.title;
    this.el.detailDesc.textContent = p.desc;
    this.el.detailStack.innerHTML = p.stack.map((s) => `<li>${s}</li>`).join('');

    const links = [];
    if (p.liveUrl) links.push(`<a class="primary" href="${p.liveUrl}" target="_blank" rel="noopener">Visit live ↗</a>`);
    if (p.repoUrl) links.push(`<a class="ghost" href="${p.repoUrl}" target="_blank" rel="noopener">${iconSvg('github')} Source</a>`);
    if (p.privateNote) links.push(`<span class="private">${p.privateNote}</span>`);
    this.el.detailLinks.innerHTML = links.join('');

    this.el.detail.classList.add('open');
    this.el.detail.setAttribute('aria-hidden', 'false');
    this.el.webgl.classList.add('dimmed');
    history.replaceState(null, '', `#${p.slug}`);
    this.carousel?.input.pause();
    this.el.detailClose.focus();
  }

  closeDetail() {
    this.openIndex = null;
    this.el.detail.classList.remove('open');
    this.el.detail.setAttribute('aria-hidden', 'true');
    this.el.webgl.classList.remove('dimmed');
    history.replaceState(null, '', location.pathname);
    this.carousel?.input.resume();
  }

  /* ---------- about overlay ---------- */
  setAbout(open) {
    this.el.about.classList.toggle('open', open);
    this.el.about.setAttribute('aria-hidden', String(!open));
    this.el.webgl.classList.toggle('dimmed', open);
    this.carousel && (open ? this.carousel.input.pause() : this.carousel.input.resume());
    if (open) this.el.aboutClose.focus();
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

  /* ---------- keyboard + deep link ---------- */
  bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.openIndex !== null) this.closeDetail();
        else if (this.el.about.classList.contains('open')) this.setAbout(false);
        else if (this.el.menuPanel.classList.contains('open')) this.setMenu(false);
      }
      if (e.key === 'Enter' && document.activeElement === document.body && this.carousel?.hovered) {
        this.openDetail(this.carousel.hovered.dataIndex);
      }
    });
  }

  openFromHash() {
    const slug = location.hash.slice(1);
    if (!slug) return;
    const i = projects.findIndex((p) => p.slug === slug);
    if (i >= 0) {
      this.carousel?.focusProject(i);
      setTimeout(() => this.openDetail(i), 500);
    }
  }
}
