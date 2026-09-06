// One state owner for all four cards; CSS only renders these states.
let disposePrevious;
export function bindEcosystemCards() {
  disposePrevious?.();
  const cards = [...document.querySelectorAll('.eco-card')];
  const controller = new AbortController();
  const { signal } = controller;
  const timers = new Map();
  const collage = document.querySelector('.eco-collage');
  // Clamp outward expansion only when its preferred position exceeds the viewport.
  const measureViewport = () => {
    if (collage) collage.style.setProperty('--viewport-room', `${innerWidth - collage.getBoundingClientRect().left - 24}px`);
  };
  measureViewport();
  let active = null;
  let triggerRect = null;
  let leaveTimer;
  const cancelLeave = () => { clearTimeout(leaveTimer); leaveTimer = undefined; };
  const inside = (rect, event) => rect && event.clientX >= rect.left - 8 &&
    event.clientX <= rect.right + 8 && event.clientY >= rect.top - 8 && event.clientY <= rect.bottom + 8;
  function close() {
    cancelLeave();
    if (!active) return;
    const card = active;
    card.classList.remove('is-open');
    card.classList.add('is-closing');
    card.querySelector('.eco-card-detail').inert = true;
    // Retain stacking order until the shrinking surface has finished moving.
    timers.set(card, setTimeout(() => {
      card.classList.remove('is-closing');
      timers.delete(card);
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 480));
    active = null;
    triggerRect = null;
  }
  function open(card) {
    cancelLeave();
    if (active === card) return;
    close();
    clearTimeout(timers.get(card));
    timers.delete(card);
    triggerRect = card.getBoundingClientRect();
    active = card;
    card.classList.remove('is-closing');
    card.classList.add('is-open');
    card.querySelector('.eco-card-detail').inert = false;
  }
  cards.forEach(card => {
    card.querySelector('.eco-card-detail').inert = true;
    card.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch' && innerWidth > 620) open(card);
    }, { signal });
    card.addEventListener('click', event => {
      // Model controls must not toggle their parent card.
      if (event.target.closest('button,a,input,[role="button"]')) return;
      if (innerWidth <= 620) active === card ? close() : open(card);
    }, { signal });
    card.addEventListener('keydown', event => {
      if (event.target !== card) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        active === card ? close() : open(card);
      }
    }, { signal });
    card.addEventListener('focusout', event => {
      if (active === card && !card.contains(event.relatedTarget)) close();
    }, { signal });
  });
  document.addEventListener('pointermove', event => {
    if (!active || event.pointerType === 'touch' || innerWidth <= 620) return;
    if (inside(triggerRect, event) || inside(active.getBoundingClientRect(), event)) cancelLeave();
    else if (!leaveTimer) leaveTimer = setTimeout(close, 220);
  }, { signal });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
  }, { signal });
  window.addEventListener('resize', () => { measureViewport(); close(); }, { signal });
  disposePrevious = () => {
    controller.abort();
    cancelLeave();
    timers.forEach(clearTimeout);
  };
}
