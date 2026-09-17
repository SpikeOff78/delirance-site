/* ═══════════════════════════════════════════
   LA DÉLIRANCE — Comportements partagés
   ═══════════════════════════════════════════ */

/* ─── Utilitaires ─── */
const fmt = n => Number(n || 0).toLocaleString('fr-FR');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const mouvementReduit = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Formules identiques au bot Discord : le site affiche les mêmes niveaux */
const niveauDepuisXp = xp => Math.floor(Math.sqrt((xp || 0) / 150));
const xpPourNiveau   = n  => Math.floor(n * n * 150);

/* Avatar de repli : pastille avec initiale + couleur stable dérivée du pseudo */
function avatarDefaut(pseudo){
  const nom = String(pseudo || 'Membre').trim();
  let initiale = '?';
  for (const c of nom) { if (/[\p{L}\p{N}]/u.test(c)) { initiale = c.toUpperCase(); break; } }
  let empreinte = 0;
  for (let i = 0; i < nom.length; i++) empreinte = (empreinte * 31 + nom.charCodeAt(i)) >>> 0;
  const t = empreinte % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${t} 44% 32%)"/><stop offset="1" stop-color="hsl(${(t+30)%360} 50% 20%)"/>
</linearGradient></defs><rect width="64" height="64" fill="url(#g)"/>
<text x="32" y="34" text-anchor="middle" dominant-baseline="central" font-family="Space Grotesk,sans-serif"
font-size="27" font-weight="700" fill="hsl(${t} 70% 85%)">${initiale}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* ─── Apparitions au défilement ─── */
let observateur = null;
function revele(){
  const cibles = document.querySelectorAll('.reveal:not(.vu)');
  if (typeof IntersectionObserver === 'undefined' || mouvementReduit()){
    cibles.forEach(el => el.classList.add('vu'));
    return;
  }
  if (observateur) observateur.disconnect();
  observateur = new IntersectionObserver(entrees => {
    entrees.forEach((e, i) => {
      if (!e.isIntersecting) return;
      setTimeout(() => e.target.classList.add('vu'), Math.min(i * 55, 330));
      observateur.unobserve(e.target);
    });
  }, { rootMargin:'0px 0px -50px 0px', threshold:.08 });
  cibles.forEach(el => observateur.observe(el));
}

/* ─── Compteurs animés (déclenchés à l'apparition) ─── */
function anime(el, cible, suffixe = ''){
  cible = Number(cible) || 0;
  if (mouvementReduit() || cible === 0){ el.textContent = fmt(cible) + suffixe; return; }
  const duree = 1100, depart = performance.now();
  const tick = t => {
    const p = Math.min(1, (t - depart) / duree);
    el.textContent = fmt(Math.round(cible * (1 - Math.pow(1 - p, 3)))) + suffixe;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function compteursAuScroll(){
  const els = [...document.querySelectorAll('[data-compteur]')];
  if (!els.length) return;
  const lancer = el => anime(el, el.dataset.compteur, el.dataset.suffixe || '');
  if (typeof IntersectionObserver === 'undefined'){ els.forEach(lancer); return; }
  const obs = new IntersectionObserver(entrees => {
    entrees.forEach(e => {
      if (!e.isIntersecting) return;
      lancer(e.target);
      obs.unobserve(e.target);
    });
  }, { threshold:.4 });
  els.forEach(el => obs.observe(el));
}

/* ─── Notifications ─── */
function toast(message, duree = 2600){
  let zone = document.querySelector('.toasts');
  if (!zone){
    zone = document.createElement('div');
    zone.className = 'toasts';
    document.body.appendChild(zone);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  zone.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s, transform .3s';
    t.style.opacity = '0';
    t.style.transform = 'translateY(10px)';
    setTimeout(() => t.remove(), 320);
  }, duree);
}

/* ─── Décor : quelques points scintillants ─── */
function semerEtoiles(nb = 14){
  if (mouvementReduit()) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < nb; i++){
    const e = document.createElement('div');
    e.className = 'etoile';
    e.style.left = Math.random() * 100 + 'vw';
    e.style.top = Math.random() * 100 + 'vh';
    e.style.animationDelay = (Math.random() * 9).toFixed(1) + 's';
    if (Math.random() > .65) e.style.background = 'var(--teal)';
    frag.appendChild(e);
  }
  document.body.appendChild(frag);
}


/* ─── Curseur : halo qui suit la souris (souris uniquement) ─── */
function curseurPerso(){
  if (mouvementReduit()) return;
  if (!window.matchMedia || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  const halo = document.createElement('div');
  halo.className = 'curseur';
  halo.setAttribute('aria-hidden', 'true');
  document.body.appendChild(halo);

  let x = 0, y = 0, cx = 0, cy = 0, anime = false;

  document.addEventListener('mousemove', e => {
    x = e.clientX; y = e.clientY;
    halo.classList.add('actif');
    if (!anime){ anime = true; requestAnimationFrame(suivre); }
  }, { passive:true });

  document.addEventListener('mouseleave', () => halo.classList.remove('actif'));

  /* Interpolation : le halo suit avec une légère inertie */
  function suivre(){
    cx += (x - cx) * 0.18;
    cy += (y - cy) * 0.18;
    halo.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
    if (Math.abs(x - cx) > .4 || Math.abs(y - cy) > .4) requestAnimationFrame(suivre);
    else anime = false;
  }

  /* Le halo grossit au survol des éléments interactifs */
  const interactifs = 'a, button, input, .pod-m, .suite-l, .ligne, .marche, .chiffre-case, .regle-tete';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(interactifs)) halo.classList.add('sur-lien');
  }, { passive:true });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(interactifs)) halo.classList.remove('sur-lien');
  }, { passive:true });
}

/* ─── Grain : texture fine en surimpression ─── */
function ajouterGrain(){
  if (document.querySelector('.grain')) return;
  const g = document.createElement('div');
  g.className = 'grain';
  g.setAttribute('aria-hidden', 'true');
  document.body.appendChild(g);
}

/* ─── Initialisation commune ─── */
function initSite(){
  /* Header : bordure au défilement */
  const entete = document.getElementById('entete');
  if (entete){
    const maj = () => entete.classList.toggle('ancree', window.scrollY > 8);
    window.addEventListener('scroll', maj, { passive:true });
    maj();
  }

  /* Menu mobile */
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  if (burger && nav){
    burger.addEventListener('click', () => {
      const ouvert = nav.classList.toggle('ouvert');
      burger.classList.toggle('ouvert', ouvert);
      burger.setAttribute('aria-expanded', String(ouvert));
      burger.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('ouvert');
      burger.classList.remove('ouvert');
      burger.setAttribute('aria-expanded', 'false');
    }));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('ouvert')) burger.click();
    });
  }

  /* Lien actif dans la navigation */
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav a[href]').forEach(a => {
    const cible = a.getAttribute('href').toLowerCase();
    if (cible === page || (page === '' && cible === 'index.html')) a.classList.add('actif');
  });

  /* Bouton retour en haut */
  const haut = document.getElementById('haut');
  if (haut){
    const maj = () => haut.classList.toggle('visible', window.scrollY > 500);
    window.addEventListener('scroll', maj, { passive:true });
    haut.addEventListener('click', () =>
      window.scrollTo({ top:0, behavior: mouvementReduit() ? 'auto' : 'smooth' }));
    maj();
  }

  ajouterGrain();
  curseurPerso();
  semerEtoiles();
  revele();
  compteursAuScroll();
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', initSite);
else
  initSite();
