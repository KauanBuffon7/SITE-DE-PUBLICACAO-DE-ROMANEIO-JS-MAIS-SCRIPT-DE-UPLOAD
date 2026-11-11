// ==UserScript==
// @name         Takeat Entregas – modo celular
// @namespace    https://github.com/KauanBuffon7
// @version      1.0.0
// @description  Deixa a tela de Delivery do painel Takeat fácil de usar no celular: uma coluna por vez, botões grandes, endereço com Maps/Waze, Ligar/WhatsApp e quanto cobrar (e o troco) em cada pedido.
// @match        https://dashboard.takeat.app/*
// @run-at       document-start
// @grant        none
// @noframes
// @updateURL    https://raw.githubusercontent.com/KauanBuffon7/SITE-DE-PUBLICACAO-DE-ROMANEIO-JS-MAIS-SCRIPT-DE-UPLOAD/main/takeat-mobile/takeat-mobile.user.js
// @downloadURL  https://raw.githubusercontent.com/KauanBuffon7/SITE-DE-PUBLICACAO-DE-ROMANEIO-JS-MAIS-SCRIPT-DE-UPLOAD/main/takeat-mobile/takeat-mobile.user.js
// ==/UserScript==

/*
 * Como funciona (resumo):
 * - Só liga na tela de Delivery (/delivery/...) e só quando a tela tem até 1000px de largura (celular).
 * - Não muda nada no sistema do Takeat: só reorganiza a página no SEU navegador.
 * - O botão de monitor (🖥) na barra de cima volta para a tela original a qualquer momento.
 * - Endereço, forma de pagamento, total e troco são lidos do "comprovante de impressão" que o
 *   próprio Takeat já coloca escondido dentro de cada pedido.
 */
(function () {
  'use strict';
  if (window.__tkmLoaded) return;
  try { if (window.top !== window.self) return; } catch (e) { return; }
  window.__tkmLoaded = true;

  var D = document;
  var MAX_WIDTH = 1000;
  var STORE_KEY = 'tkm:v1';

  // ---------------------------------------------------------------- settings
  var settings = { disabled: false, col: '', onlyMine: false, myName: '' };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    for (var k in saved) if (Object.prototype.hasOwnProperty.call(settings, k)) settings[k] = saved[k];
  } catch (e) { /* sem localStorage: usa o padrão */ }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) { /* ignora */ }
  }

  // ---------------------------------------------------------------- css
  var CSS = [
    '#tkm-bar,#tkm-fab,#tkm-backdrop,.tkm-info{display:none}',

    /* ---------- página: rolagem normal do celular ---------- */
    'html.tkm-on{overflow-x:hidden!important;overflow-y:auto!important;height:auto!important}',
    'html.tkm-on body{height:auto!important;min-height:100%!important;overflow:visible!important;padding-top:var(--tkm-bar-h,96px)!important;background:#f2f3f5!important}',
    'html.tkm-on #root{height:auto!important;min-height:0!important;overflow:visible!important}',
    'html.tkm-on [data-tkm-chain]{display:block!important;height:auto!important;max-height:none!important;min-height:0!important;overflow:visible!important;width:auto!important;max-width:100%!important;min-width:0!important}',
    'html.tkm-on [data-tkm=page]{padding:8px 8px 32px!important;background:transparent!important}',
    'html.tkm-on .tab-content>.tab-pane.active{height:auto!important}',

    /* ---------- some com o que atrapalha no celular ---------- */
    'html.tkm-on [data-tkm=hide],html.tkm-on [data-tkm=nav],html.tkm-on [data-tkm=topbar],html.tkm-on #hubspot-messages-iframe-container{display:none!important}',
    'html.tkm-on #root>:not([data-tkm-chain]) p{font-size:14px!important}',

    /* ---------- menu lateral (abre pelo botão ☰) ---------- */
    'html.tkm-on.tkm-menu [data-tkm=nav]{display:flex!important;position:fixed!important;top:0!important;left:0!important;bottom:0!important;height:100%!important;z-index:1002!important;background:#fff!important;box-shadow:4px 0 24px rgba(0,0,0,.25)!important}',
    'html.tkm-on.tkm-menu #tkm-backdrop{display:block;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1001}',

    /* ---------- abas (Novos / Agendados / Entregues / Cancelados) e filtros ---------- */
    'html.tkm-on [data-tkm=toolbar]{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:8px!important;margin:0 0 10px!important;padding:0!important;width:auto!important;height:auto!important}',
    'html.tkm-on [data-tkm=tabs]{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;border:0!important}',
    'html.tkm-on [data-tkm=tabs]>*{margin:0!important;padding:5px 6px!important;min-height:36px!important;height:auto!important;width:auto!important;border-radius:10px!important;font-size:13px!important;line-height:1.2!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;text-align:center!important;border:1px solid #e3e3e8!important}',
    'html.tkm-on [data-tkm=tabs]>* span{font-size:13px!important;line-height:1.2!important}',
    'html.tkm-on [data-tkm=filters]{display:flex!important;flex-wrap:wrap!important;gap:6px!important;width:auto!important;height:auto!important;margin:0!important;padding:6px!important;justify-content:flex-start!important;border-radius:12px!important}',
    'html.tkm-on [data-tkm=filters]>*{flex:0 0 auto!important;margin:0!important}',
    'html.tkm-on [data-tkm=filters] button{height:36px!important;min-height:36px!important;width:auto!important;min-width:44px!important;padding:0 10px!important;margin:0!important;font-size:12px!important;display:inline-flex!important;flex-direction:row!important;align-items:center!important;gap:4px!important}',

    /* ---------- quadro de pedidos: uma coluna por vez, largura total ---------- */
    'html.tkm-on [data-tkm=board]{display:block!important;padding:0!important;margin:0!important;height:auto!important;min-height:0!important;overflow:visible!important;width:auto!important}',
    'html.tkm-on [data-tkm-col]{display:block!important;width:auto!important;min-width:0!important;max-width:none!important;height:auto!important;min-height:0!important;margin:0 0 12px!important;flex:none!important;border-radius:14px!important}',
    /* coluna escondida: altura zero (NÃO usar visibility/display: os ícones SVG de outras colunas usam máscaras com o mesmo id) */
    'html.tkm-on [data-tkm-col][data-tkm-off]{height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;pointer-events:none!important;box-shadow:none!important}',
    'html.tkm-on [data-tkm-col]>:first-child{padding:8px 12px!important;min-height:0!important;height:auto!important}',
    'html.tkm-on [data-tkm-col]>:first-child [class*="HeaderTopRow"]>div:first-child{font-size:18px!important}',
    'html.tkm-on [data-tkm=colbody]{display:block!important;height:auto!important;max-height:none!important;min-height:200px!important;overflow:visible!important;padding:8px!important}',
    'html.tkm-on [data-tkm=asz]{width:100%!important;height:auto!important;overflow:visible!important}',
    'html.tkm-on [data-tkm=colbody] .ReactVirtualized__Grid{width:100%!important;height:auto!important;overflow:visible!important;will-change:auto!important}',
    'html.tkm-on [data-tkm=colbody] .ReactVirtualized__Grid__innerScrollContainer{width:100%!important;height:auto!important;max-width:none!important;max-height:none!important;overflow:visible!important}',

    /* ---------- cartão do pedido ---------- */
    'html.tkm-on [data-tkm-card]{position:relative!important;top:auto!important;left:auto!important;width:100%!important;height:auto!important;margin:0 0 12px!important;border-radius:14px!important;box-shadow:0 1px 4px rgba(0,0,0,.14)!important;background:#fff!important;overflow:visible!important;box-sizing:border-box!important}',
    'html.tkm-on [data-tkm-other]{display:none!important}',
    'html.tkm-on [data-tkm-card] [class*="HeaderAuxiliaryText"]{display:none!important}',
    'html.tkm-on [data-tkm-card] [class*="OrderNumber"]{font-size:20px!important}',
    'html.tkm-on [data-tkm-card] [class*="OrderType"],html.tkm-on [data-tkm-card] [class*="OrderType"] span{font-size:15px!important}',
    'html.tkm-on [data-tkm-card] [class*="DateInfo"] span{font-size:13px!important}',
    'html.tkm-on [data-tkm-card] [class*="NameClient"]{font-size:18px!important;line-height:1.25!important}',
    'html.tkm-on [data-tkm-card] [class*="PhoneClient"]{font-size:16px!important}',
    'html.tkm-on [data-tkm-card] [class*="BuyerOrderCount"]{font-size:12px!important}',
    'html.tkm-on [data-tkm-card] [class*="InfoClientDelivery"],html.tkm-on [data-tkm-card] [class*="UserDeliveryInfo"],html.tkm-on [data-tkm-card] [class*="DeliveryInfo"]{font-size:14px!important}',
    'html.tkm-on [data-tkm-card] [class*="CardBody"]{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:10px!important;height:auto!important}',
    'html.tkm-on [data-tkm-card] [class*="CardBody"]>div:first-child{width:auto!important;max-width:none!important}',
    'html.tkm-on [data-tkm-card] .checkbox-label{transform:scale(1.35);transform-origin:left center}',

    /* botões do cartão (avançar, ver, editar): grandes para o dedo */
    'html.tkm-on [data-tkm-card] [class*="styles__Actions-"]{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;justify-content:stretch!important;align-items:center!important;align-self:stretch!important;gap:8px!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;position:static!important}',
    'html.tkm-on [data-tkm-card] [class*="styles__Actions-"]>:empty{display:none!important}',
    'html.tkm-on [data-tkm-card] [class*="styles__Actions-"]>svg{flex:1 1 0;width:48px!important;height:48px!important;min-width:48px!important;padding:12px!important;box-sizing:border-box!important;border-radius:12px!important;background:#f1f2f4!important;margin:0!important;cursor:pointer}',
    'html.tkm-on [data-tkm-card] [class*="styles__Actions-"]>button{flex:1 1 0;width:48px!important;height:48px!important;min-width:48px!important;padding:0!important;border-radius:12px!important;background:#f1f2f4!important;border:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;margin:0!important}',
    'html.tkm-on [data-tkm-card] [class*="styles__Actions-"]>button button{width:100%!important;height:100%!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0!important}',
    'html.tkm-on [data-tkm-card] [class*="styles__Actions-"] svg{min-width:24px;min-height:24px}',

    /* ---------- janelas (detalhes do pedido etc.) cabendo na tela ---------- */
    'html.tkm-on .modal-dialog{max-width:calc(100vw - 16px)!important;margin:8px auto!important}',
    'html.tkm-on .ReactModal__Content{max-width:calc(100vw - 16px)!important;max-height:calc(100vh - 16px)!important;overflow:auto!important;box-sizing:border-box!important}',
    'html.tkm-on [role=dialog]{max-width:100vw!important}',
    'html.tkm-on .tab-pane table{display:block!important;max-width:100%!important;overflow-x:auto!important}',

    /* ---------- barra do modo celular ---------- */
    'html.tkm-on #tkm-bar{display:block;position:fixed;top:0;left:0;right:0;z-index:900;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.12);font-family:Poppins,Roboto,system-ui,sans-serif;color:#222;-webkit-tap-highlight-color:transparent}',
    'html.tkm-on body.modal-open #tkm-bar,html.tkm-on body.ReactModal__Body--open #tkm-bar,html.tkm-on body.swal2-shown #tkm-bar{display:none}',
    'html.tkm-on:has(.ReactModal__Overlay--after-open) #tkm-bar,html.tkm-on:has(.modal.show) #tkm-bar{display:none}',
    '#tkm-bar *{box-sizing:border-box}',
    '#tkm-bar .tkm-row{display:flex;align-items:center;gap:6px;padding:6px 8px;height:52px}',
    '#tkm-bar button{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;min-width:40px;padding:0 10px;border-radius:10px;font:600 13px/1 Poppins,Roboto,system-ui,sans-serif;color:#333;background:#f1f2f4;white-space:nowrap}',
    '#tkm-bar button svg{width:22px;height:22px;flex:none}',
    '#tkm-bar .tkm-ico{padding:0;width:40px}',
    '#tkm-bar .tkm-title{flex:1;min-width:0;font:700 17px/1.1 Poppins,Roboto,system-ui,sans-serif;color:#c8131b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#tkm-bar .tkm-mine.tkm-active{background:#c8131b;color:#fff}',
    '#tkm-bar .tkm-spin svg{animation:tkm-spin .8s linear infinite}',
    '@keyframes tkm-spin{to{transform:rotate(360deg)}}',
    '#tkm-bar .tkm-cols{display:flex;gap:5px;padding:0 8px 8px;overflow-x:auto;scrollbar-width:none}',
    '#tkm-bar .tkm-cols::-webkit-scrollbar{display:none}',
    '#tkm-bar .tkm-cols:empty{display:none}',
    '#tkm-bar .tkm-col{flex:1 1 0;min-width:fit-content;height:40px;padding:0 6px;gap:4px;background:#fff;border:2px solid var(--c);color:var(--c);font-size:12px}',
    '#tkm-bar .tkm-col b{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:var(--c);color:#fff;font-size:11px}',
    '#tkm-bar .tkm-col.tkm-active{background:var(--c);color:#fff}',
    '#tkm-bar .tkm-col.tkm-active b{background:#fff;color:var(--c)}',

    /* botão para voltar ao modo celular quando a tela original estiver ativa */
    'html.tkm-off #tkm-fab{all:unset;display:flex;align-items:center;gap:6px;position:fixed;left:76px;bottom:12px;z-index:1000;padding:10px 14px;border-radius:24px;background:#c8131b;color:#fff;font:600 14px/1 Poppins,Roboto,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer}',

    /* ---------- caixa de entrega dentro de cada pedido ---------- */
    'html.tkm-on .tkm-info{display:block;align-self:stretch;width:100%;box-sizing:border-box;margin:2px 0 0;padding:10px;border-radius:12px;background:#f7f7f9;border:1px solid #e4e4ea;font:400 14px/1.35 Poppins,Roboto,system-ui,sans-serif;color:#222;text-align:left;white-space:normal}',
    '.tkm-info *{box-sizing:border-box}',
    '.tkm-info .tkm-addr{display:flex;gap:6px}',
    '.tkm-info .tkm-addr-main{font-weight:600;font-size:15px}',
    '.tkm-info .tkm-addr-sub,.tkm-info .tkm-ref{color:#555;font-size:13px;margin-top:2px}',
    '.tkm-info .tkm-ref{font-style:italic}',
    '.tkm-info .tkm-pickup{font-weight:600}',
    '.tkm-info .tkm-pay{margin-top:8px;padding:8px 10px;border-radius:10px;font-size:14px}',
    '.tkm-info .tkm-pay b{font-weight:700}',
    '.tkm-info .tkm-pay-sub{font-size:13px;margin-top:3px}',
    '.tkm-info .tkm-paid{background:#e8f7ef;color:#0f5c35;border:1px solid #bfe7cf}',
    '.tkm-info .tkm-due{background:#fff3df;color:#6e4300;border:1px solid #ffd592}',
    '.tkm-info .tkm-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}',
    '.tkm-info a.tkm-btn{display:flex!important;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:0 8px;border-radius:10px;font:600 14px/1 Poppins,Roboto,system-ui,sans-serif;text-decoration:none!important;border:1px solid #d6d6dc;background:#fff;color:#222!important;-webkit-tap-highlight-color:transparent}',
    '.tkm-info a.tkm-maps{background:#1a73e8;border-color:#1a73e8;color:#fff!important}',
    '.tkm-info a.tkm-waze{background:#33ccff;border-color:#33ccff;color:#04263a!important}',
    '.tkm-info a.tkm-wa{background:#25d366;border-color:#25d366;color:#fff!important}',
    '.tkm-info a.tkm-btn:active{filter:brightness(.9)}'
  ].join('\n');

  var styleEl = null;
  function injectCss() {
    if (styleEl && styleEl.isConnected) return;
    var parent = D.head || D.documentElement;
    if (!parent) return;
    styleEl = D.getElementById('tkm-style') || D.createElement('style');
    styleEl.id = 'tkm-style';
    styleEl.textContent = CSS;
    parent.appendChild(styleEl);
  }

  // ---------------------------------------------------------------- helpers
  function h(tag, attrs) {
    var el = D.createElement(tag);
    if (attrs) {
      for (var a in attrs) {
        var v = attrs[a];
        if (v == null || v === false) continue;
        if (a === 'class') el.className = v;
        else if (a === 'html') el.innerHTML = v; // só usado com SVG fixo deste arquivo
        else el.setAttribute(a, v);
      }
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false || c === '') continue;
      el.appendChild(typeof c === 'object' ? c : D.createTextNode(String(c)));
    }
    return el;
  }
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function setTag(el, name) { if (el && el.getAttribute('data-tkm') !== name) el.setAttribute('data-tkm', name); }
  function setAttr(el, name, on, value) {
    if (!el) return;
    if (on) { if (el.getAttribute(name) !== (value || '')) el.setAttribute(name, value || ''); }
    else if (el.hasAttribute(name)) el.removeAttribute(name);
  }
  function norm(s) { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); }

  var ICONS = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg>',
    desktop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'
  };

  // ---------------------------------------------------------------- estado da página
  function isDeliveryPage() { return /^\/delivery(\/|$)/.test(location.pathname) || window.__tkmForce === true; }
  function isSmall() { return Math.min(window.innerWidth || 9999, (D.documentElement && D.documentElement.clientWidth) || 9999) <= MAX_WIDTH; }

  var lastPath = '';
  function applyMode() {
    var html = D.documentElement;
    var eligible = isDeliveryPage() && isSmall();
    var on = eligible && !settings.disabled;
    html.classList.toggle('tkm-on', on);
    html.classList.toggle('tkm-off', eligible && settings.disabled);
    html.classList.toggle('tkm-mine', on && settings.onlyMine && !!settings.myName);
    if (location.pathname !== lastPath) { lastPath = location.pathname; html.classList.remove('tkm-menu'); }
    if (!on) html.classList.remove('tkm-menu');
    return on;
  }

  // ---------------------------------------------------------------- barra
  var bar, colsEl, mineBtn;
  function ensureUi() {
    if (!D.body) return;
    if (bar && bar.isConnected) return;
    bar = h('div', { id: 'tkm-bar' });
    var row = h('div', { class: 'tkm-row' });
    row.appendChild(h('button', { class: 'tkm-ico', 'data-act': 'menu', 'aria-label': 'Abrir menu', title: 'Menu', html: ICONS.menu }));
    row.appendChild(h('div', { class: 'tkm-title' }, 'Entregas'));
    mineBtn = h('button', { class: 'tkm-mine', 'data-act': 'mine', title: 'Esconder pedidos de outros motoboys' });
    row.appendChild(mineBtn);
    row.appendChild(h('button', { class: 'tkm-ico', 'data-act': 'refresh', 'aria-label': 'Atualizar pedidos', title: 'Atualizar', html: ICONS.refresh }));
    row.appendChild(h('button', { class: 'tkm-ico', 'data-act': 'off', 'aria-label': 'Voltar para a tela original', title: 'Tela original', html: ICONS.desktop }));
    bar.appendChild(row);
    colsEl = h('div', { class: 'tkm-cols', role: 'tablist' });
    bar.appendChild(colsEl);
    bar.addEventListener('click', onBarClick);

    var backdrop = D.getElementById('tkm-backdrop') || h('div', { id: 'tkm-backdrop' });
    backdrop.onclick = function () { D.documentElement.classList.remove('tkm-menu'); };
    var fab = D.getElementById('tkm-fab') || h('button', { id: 'tkm-fab', type: 'button' }, '📱 Modo celular');
    fab.onclick = function () { settings.disabled = false; save(); schedule(); };

    D.body.appendChild(bar);
    if (!backdrop.isConnected) D.body.appendChild(backdrop);
    if (!fab.isConnected) D.body.appendChild(fab);
    lastColsSig = '';
    renderMine();
  }

  function renderMine() {
    if (!mineBtn) return;
    var active = settings.onlyMine && !!settings.myName;
    mineBtn.classList.toggle('tkm-active', active);
    mineBtn.innerHTML = ICONS.user;
    mineBtn.appendChild(D.createTextNode(active ? 'Só ' + settings.myName.split(' ')[0] : 'Só meus'));
  }

  function onBarClick(ev) {
    var btn = ev.target.closest('button');
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    if (act === 'menu') {
      D.documentElement.classList.toggle('tkm-menu');
    } else if (act === 'refresh') {
      var orig = findButtonByText(D.getElementById('root'), /^atualizar$/i);
      btn.classList.add('tkm-spin');
      setTimeout(function () { btn.classList.remove('tkm-spin'); }, 900);
      if (orig) orig.click(); else location.reload();
    } else if (act === 'off') {
      settings.disabled = true; save(); schedule();
    } else if (act === 'mine') {
      if (settings.onlyMine) {
        settings.onlyMine = false;
      } else {
        var name = window.prompt('Mostrar só os pedidos de qual motoboy?\n(digite o nome como aparece no pedido)', settings.myName || guessMotoboy());
        if (name == null) return;
        name = name.trim();
        if (!name) return;
        settings.myName = name;
        settings.onlyMine = true;
      }
      save(); renderMine(); schedule();
    } else if (act === 'col') {
      settings.col = btn.getAttribute('data-col') || '';
      save();
      lastColsSig = '';
      scan();
      var board = D.querySelector('.tab-content>.tab-pane.active [data-tkm=board]');
      if (board) {
        var top = board.getBoundingClientRect().top + window.pageYOffset - barHeight() - 8;
        if (window.pageYOffset > top) window.scrollTo(0, Math.max(0, top));
      }
    }
  }

  function findButtonByText(scope, re) {
    if (!scope) return null;
    var list = scope.querySelectorAll('button');
    for (var i = 0; i < list.length; i++) if (re.test(txt(list[i]))) return list[i];
    return null;
  }

  function barHeight() { return bar && bar.isConnected ? bar.offsetHeight : 0; }
  var lastBarH = -1;
  function syncBarHeight() {
    var hgt = barHeight();
    if (hgt && hgt !== lastBarH) {
      lastBarH = hgt;
      D.documentElement.style.setProperty('--tkm-bar-h', hgt + 'px');
    }
  }

  // ---------------------------------------------------------------- estrutura da página
  function containsText(el, re) { return re.test(el.textContent || ''); }

  function tagLayout(root) {
    var tabContent = root.querySelector('.tab-content');
    if (!tabContent) return null;

    // caminho do quadro até o #root: tudo vira bloco simples com altura automática
    var chain = [];
    for (var p = tabContent; p && p !== root && p !== D.body; p = p.parentElement) chain.push(p);
    var old = root.querySelectorAll('[data-tkm-chain]');
    for (var i = 0; i < old.length; i++) if (chain.indexOf(old[i]) < 0) old[i].removeAttribute('data-tkm-chain');
    chain.forEach(function (el) { setAttr(el, 'data-tkm-chain', true); });

    var page = tabContent.parentElement;
    if (page && page !== root) setTag(page, 'page');

    chain.forEach(function (el) {
      if (el === tabContent) return; // as abas de pedidos ficam como estão
      var kids = el.children;
      for (var j = 0; j < kids.length; j++) {
        var c = kids[j];
        if (chain.indexOf(c) >= 0 || c.hasAttribute('data-tkm')) continue;
        if (c.getAttribute('role') === 'navigation') { setTag(c, 'nav'); continue; }
        if (el === page) {
          if (containsText(c, /Pedidos Agendados|Pedidos Entregues/i)) setTag(c, 'toolbar');
          else if (c.querySelector('input[placeholder*="esquis"]') || containsText(c, /links de delivery|Plant[aã]o tira/i)) setTag(c, 'hide');
        } else if (containsText(c, /Card[aá]pio|Reservas|Gar[cç]om Digital/i)) {
          setTag(c, 'topbar');
        }
      }
    });
    var nav = root.querySelector('[role="navigation"][aria-label="Menu principal"]');
    if (nav) setTag(nav, 'nav');

    // dentro da barra de abas: lista de abas e área de filtros
    var tb = page && page.querySelector('[data-tkm=toolbar]');
    if (tb) {
      for (var t = 0; t < tb.children.length; t++) {
        var tc = tb.children[t];
        if (containsText(tc, /Pedidos Agendados/i)) setTag(tc, 'tabs');
        else if (findButtonByText(tc, /^atualizar$/i)) setTag(tc, 'filters');
      }
    }
    return tabContent;
  }

  function columnsOf(pane) {
    var board = pane.querySelector('[class*="LugarPedidos"]');
    var grids = pane.querySelectorAll('.ReactVirtualized__Grid');
    if (!board && grids.length >= 2) {
      // menor elemento que contém as duas primeiras listas
      board = grids[0].parentElement;
      while (board && !board.contains(grids[1])) board = board.parentElement;
    }
    if (!board) return { board: null, cols: [] };
    setTag(board, 'board');
    var cols = [];
    for (var i = 0; i < board.children.length; i++) {
      var c = board.children[i];
      if (/Bloco/.test(c.className) || c.querySelector('.ReactVirtualized__Grid')) cols.push(c);
    }
    return { board: board, cols: cols };
  }

  function colInfo(col) {
    var header = col.firstElementChild;
    var topRow = col.querySelector('[class*="HeaderTopRow"]') || header;
    var title = topRow ? txt(topRow.firstElementChild || topRow) : '';
    if (!title || title.length > 30) title = txt(header).split(' ').slice(0, 2).join(' ');
    var countEl = col.querySelector('[class*="ItemsCount"]');
    var count = countEl ? txt(countEl) : '';
    var color = header ? getComputedStyle(header).backgroundColor : '';
    if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') color = col.getAttribute('color') || '#c8131b';
    return { title: title, count: count, color: color };
  }

  var lastColsSig = '';
  function updateColumns(cols) {
    if (!colsEl) return;
    var infos = cols.map(colInfo);
    var titles = infos.map(function (x) { return x.title.toUpperCase(); });
    var active = titles.indexOf((settings.col || '').toUpperCase());
    if (active < 0) active = titles.indexOf('PRONTO');
    if (active < 0) active = 0;

    cols.forEach(function (col, i) {
      setAttr(col, 'data-tkm-col', true, String(i));
      setAttr(col, 'data-tkm-off', cols.length > 1 && i !== active);
    });

    var sig = cols.length < 2 ? '' : infos.map(function (x, i) { return x.title + '|' + x.count + '|' + x.color + '|' + (i === active); }).join(';');
    if (sig === lastColsSig) return;
    lastColsSig = sig;
    colsEl.textContent = '';
    if (cols.length < 2) return;
    infos.forEach(function (x, i) {
      var b = h('button', {
        class: 'tkm-col' + (i === active ? ' tkm-active' : ''),
        'data-act': 'col', 'data-col': x.title, role: 'tab',
        'aria-selected': i === active ? 'true' : 'false',
        style: '--c:' + x.color
      }, prettyTitle(x.title), x.count !== '' ? h('b', null, x.count) : null);
      colsEl.appendChild(b);
    });
  }
  function prettyTitle(t) {
    var s = t.toLowerCase();
    if (s === 'em andamento') return 'Andamento';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ---------------------------------------------------------------- pedidos
  function cardsOf(pane) {
    var out = [];
    var inners = pane.querySelectorAll('.ReactVirtualized__Grid__innerScrollContainer');
    for (var i = 0; i < inners.length; i++) {
      var grid = inners[i].parentElement;
      var asz = grid && grid.parentElement;
      var colbody = asz && asz.parentElement;
      if (asz && colbody) { setTag(asz, 'asz'); setTag(colbody, 'colbody'); }
      var kids = inners[i].children;
      for (var j = 0; j < kids.length; j++) {
        var k = kids[j];
        if (k.tagName !== 'DIV' || /DisplayNoneImprimir/.test(k.className)) continue;
        if (!k.querySelector('[class*="CardBody"],[class*="NameClient"]')) continue;
        out.push(k);
      }
    }
    return out;
  }

  function findReceipt(card) {
    var r = card.querySelector('[class*="DisplayNoneImprimir"]');
    if (r) return r;
    var p = card.previousElementSibling;
    for (var i = 0; p && i < 4; i++, p = p.previousElementSibling) {
      if (/DisplayNoneImprimir/.test(p.className)) return p;
      if (p.hasAttribute('data-tkm-card')) break;
    }
    return null;
  }

  function parseMoney(s) {
    var m = /(-?)\s*R\$\s*([\d.]+,\d{2})/.exec(s || '');
    return m ? parseFloat(m[2].replace(/\./g, '').replace(',', '.')) * (m[1] ? -1 : 1) : NaN;
  }

  function parseReceipt(rc) {
    var d = { phone: '', name: '', lines: [], method: '', status: '', pickup: false, prices: {} };
    if (!rc) return d;
    var info = rc.querySelector('[class*="DeliveryInfo"]');
    var kids = info ? Array.prototype.slice.call(info.children) : [];
    var start = 0;
    for (var i = 0; i < kids.length; i++) {
      var t0 = txt(kids[i]);
      if (/^CLIENTE/i.test(t0)) {
        var sp = kids[i].children;
        d.phone = sp.length > 1 ? txt(sp[sp.length - 1]) : t0.replace(/^CLIENTE/i, '').trim();
        start = i + 1;
        break;
      }
    }
    for (var j = start; j < kids.length; j++) {
      var t = txt(kids[j]);
      if (!t) continue;
      if (/^m[ée]todo de pagamento:/i.test(t)) { d.method = t.replace(/^m[ée]todo de pagamento:\s*/i, ''); continue; }
      if (/^pagamento\b/i.test(t)) { d.status = t; continue; }
      if (/ir[aá] retirar/i.test(t)) { d.pickup = true; continue; }
      if (!d.name) { d.name = t; continue; }
      d.lines.push(t);
    }
    var price = rc.querySelector('[class*="DeliveryPrice"]');
    if (price) {
      for (var p = 0; p < price.children.length; p++) {
        var row = price.children[p];
        var label = row.firstElementChild ? txt(row.firstElementChild) : '';
        var value = row.lastElementChild ? txt(row.lastElementChild) : '';
        if (label) d.prices[norm(label).replace(/:$/, '')] = value;
      }
    }
    return d;
  }

  // "Rua - Número - Complemento - Bairro - Cidade - UF"
  function parseAddress(raw) {
    var parts = raw.split(/\s+-\s+/).map(function (s) { return s.replace(/[\s,]+$/, '').trim(); }).filter(Boolean);
    var res = { main: raw, sub: '', query: raw.replace(/\s+-\s+/g, ', ') };
    if (parts.length >= 5 && /^[A-Z]{2}$/.test(parts[parts.length - 1])) {
      var uf = parts[parts.length - 1], city = parts[parts.length - 2], bairro = parts[parts.length - 3];
      var street = parts[0], num = parts[1], comp = parts.slice(2, parts.length - 3);
      var noNum = /^(s\/?n|sn|0+|sem n[uú]mero)$/i.test(num);
      var unknownStreet = /^n[aã]o sei/i.test(street);
      res.main = (unknownStreet ? '(rua não informada)' : street) + ', ' + (noNum ? 's/n' : num);
      res.sub = comp.concat([bairro]).join(' · ');
      var q = [];
      if (!unknownStreet) q.push(street);
      if (!noNum && !unknownStreet) q.push(num);
      q.push(bairro, city + ' - ' + uf);
      res.query = q.join(', ');
    }
    return res;
  }

  function phoneDigits(s) {
    var dg = (s || '').replace(/\D/g, '');
    if (dg.length === 10 || dg.length === 11) dg = '55' + dg;
    return dg.length >= 12 ? dg : '';
  }

  function payBlock(d) {
    var total = d.prices['total'] || '';
    var receber = d.prices['receber do cliente'] || '';
    var troco = d.prices['troco'] || '';
    var m = d.method || '';
    var paid = /efetuado|j[aá] pago|pago online/i.test(d.status) && !/na entrega/i.test(d.status);
    if (!m && !d.status && !total) return null;
    if (paid) {
      return h('div', { class: 'tkm-pay tkm-paid' },
        '✅ ', h('b', null, 'JÁ PAGO'), m ? ' · ' + m : '',
        h('div', { class: 'tkm-pay-sub' }, 'Não cobrar nada' + (total ? ' · Total ' + total : '')));
    }
    var icon = '💰', how = m ? ' · ' + m : '', sub = '';
    if (/dinheiro/i.test(m)) {
      icon = '💵'; how = ' em dinheiro';
      var tr = parseMoney(troco);
      sub = tr > 0 ? 'Cliente paga com ' + receber + ' → levar ' + troco + ' de troco' : 'Sem troco informado';
    } else if (/pix/i.test(m)) {
      icon = '📲'; how = ' no Pix';
    } else if (/cr[eé]dito|d[eé]bito|cart[aã]o|visa|master|elo\b|hiper|amex|maquin|vale|ticket|sodexo|alelo|vr\b/i.test(m)) {
      icon = '💳'; how = ' no cartão'; sub = m + ' · levar a maquininha';
    }
    return h('div', { class: 'tkm-pay tkm-due' },
      icon + ' ', h('b', null, 'COBRAR ' + (total || '')), how,
      sub ? h('div', { class: 'tkm-pay-sub' }, sub) : null);
  }

  function linkBtn(cls, label, href, newTab) {
    return h('a', { class: 'tkm-btn ' + cls, href: href, target: newTab ? '_blank' : null, rel: newTab ? 'noopener noreferrer' : null }, label);
  }

  function stopAll(el) {
    ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'dblclick'].forEach(function (t) {
      el.addEventListener(t, function (e) { e.stopPropagation(); }, /^touch/.test(t) ? { passive: true } : false);
    });
  }

  function buildInfo(card, rc, sig) {
    var d = parseReceipt(rc);
    var cardPhone = txt(card.querySelector('[class*="PhoneClient"]'));
    var phone = phoneDigits(cardPhone || d.phone);
    var box = h('div', { class: 'tkm-info', 'data-sig': sig });

    if (d.pickup) {
      box.appendChild(h('div', { class: 'tkm-pickup' }, '🏪 Cliente vai retirar no balcão'));
    }
    var addr = null;
    if (!d.pickup && d.lines.length) {
      addr = parseAddress(d.lines[0]);
      var a = h('div', { class: 'tkm-addr' }, h('span', null, '📍'),
        h('div', null,
          h('div', { class: 'tkm-addr-main' }, addr.main),
          addr.sub ? h('div', { class: 'tkm-addr-sub' }, addr.sub) : null,
          d.lines.slice(1).map(function (l) { return h('div', { class: 'tkm-ref' }, 'Ref.: ' + l); }).reduce(function (frag, el) { frag.appendChild(el); return frag; }, D.createDocumentFragment())));
      box.appendChild(a);
    }
    var pay = payBlock(d);
    if (pay) box.appendChild(pay);

    var btns = h('div', { class: 'tkm-btns' });
    if (addr) {
      var q = encodeURIComponent(addr.query);
      btns.appendChild(linkBtn('tkm-maps', '🗺️ Maps', 'https://www.google.com/maps/search/?api=1&query=' + q, true));
      btns.appendChild(linkBtn('tkm-waze', 'Waze', 'https://waze.com/ul?q=' + q + '&navigate=yes', true));
    }
    if (phone) {
      btns.appendChild(linkBtn('tkm-tel', '📞 Ligar', 'tel:+' + phone, false));
      btns.appendChild(linkBtn('tkm-wa', '💬 WhatsApp', 'https://wa.me/' + phone, true));
    }
    if (btns.children.length) box.appendChild(btns);
    if (!box.children.length) return null;
    stopAll(box);
    return box;
  }

  function motoboyOf(card) {
    var els = card.querySelectorAll('span,div');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (e.children.length > 2) continue;
      var t = txt(e);
      if (/^motoboy:/i.test(t)) return t.replace(/^motoboy:\s*/i, '').trim();
    }
    return '';
  }

  function guessMotoboy() {
    var counts = {}, best = '', n = 0;
    var cards = D.querySelectorAll('[data-tkm-card]');
    for (var i = 0; i < cards.length; i++) {
      var m = cards[i].getAttribute('data-tkm-moto');
      if (!m) continue;
      counts[m] = (counts[m] || 0) + 1;
      if (counts[m] > n) { n = counts[m]; best = m; }
    }
    return best;
  }

  function updateCards(pane) {
    var cards = cardsOf(pane);
    var mine = norm(settings.myName);
    cards.forEach(function (card) {
      setAttr(card, 'data-tkm-card', true);
      var rc = findReceipt(card);
      var body = card.querySelector('[class*="CardBody"]');
      var host = (body && body.firstElementChild && body.firstElementChild.tagName === 'DIV') ? body.firstElementChild : card;
      var sig = (rc ? rc.textContent : '') + '#' + txt(card.querySelector('[class*="PhoneClient"]'));
      var box = card.querySelector('.tkm-info');
      if (!box || box.getAttribute('data-sig') !== sig) {
        if (box) box.remove();
        box = buildInfo(card, rc, sig);
        if (box) host.appendChild(box);
      } else if (box.parentElement !== host || box !== host.lastElementChild) {
        host.appendChild(box); // mantém a caixa sempre no fim
      }

      var moto = motoboyOf(card);
      setAttr(card, 'data-tkm-moto', !!moto, moto);
      setAttr(card, 'data-tkm-other', settings.onlyMine && !!mine && !!moto && norm(moto) !== mine);
    });
  }

  // ---------------------------------------------------------------- ciclo principal
  function scan() {
    if (!D.documentElement) return;
    injectCss();
    var on = applyMode();
    ensureUi();
    if (!on) return;
    var root = D.getElementById('root');
    if (!root) return;
    var tabContent = tagLayout(root);
    if (!tabContent) { if (colsEl && colsEl.firstChild) { colsEl.textContent = ''; lastColsSig = ''; } syncBarHeight(); return; }
    var panes = tabContent.querySelectorAll(':scope > .tab-pane');
    for (var i = 0; i < panes.length; i++) columnsOf(panes[i]);
    var active = tabContent.querySelector(':scope > .tab-pane.active') || panes[0];
    var cols = active ? columnsOf(active).cols : [];
    updateColumns(cols);
    if (active) updateCards(active);
    syncBarHeight();
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    var run = function () {
      scheduled = false;
      try { scan(); } catch (e) { if (window.console) console.error('[takeat-mobile]', e); }
    };
    if (window.requestAnimationFrame && !D.hidden) requestAnimationFrame(run); else setTimeout(run, 50);
  }

  injectCss();
  // observa o documento inteiro (funciona mesmo antes do <html> existir)
  new MutationObserver(schedule).observe(D, { childList: true, subtree: true, characterData: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.addEventListener('popstate', schedule);
  D.addEventListener('visibilitychange', schedule);
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', schedule);
  schedule();
})();
