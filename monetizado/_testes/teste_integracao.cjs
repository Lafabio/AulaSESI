const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.env.TEMP, 'jsdom_test', 'node_modules', 'jsdom'));

const dir = __dirname;
let src = fs.readFileSync(path.join(dir, '..', 'index.html'), 'utf8');
src = src.replace(/\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>\s*/, '\n');
src = src
  .replace("const SUPABASE_URL = 'COLE_SUA_URL_DO_SUPABASE';", "const SUPABASE_URL = 'https://fake.supabase.co';")
  .replace("const SUPABASE_ANON_KEY = 'COLE_SUA_CHAVE_ANON';", "const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.fake';");
const mock = fs.readFileSync(path.join(dir, 'mock.js'), 'utf8');
const html = src.replace(/<body>/, '<script>\n' + mock + '\n</script>\n<body>');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  pretendToBeVisual: true
});
const { window } = dom;
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = function () {};
window.confirm = () => true;
window.prompt = () => null;

let fails = 0;
function check(name, cond, extra) {
  if (cond) console.log('PASS  ' + name);
  else { fails++; console.log('FAIL  ' + name + (extra !== undefined ? '  -> ' + extra : '')); }
}

function appHtml() { return window.document.getElementById('app').innerHTML || ''; }

async function waitFor(fn, timeout = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { if (fn()) return true; } catch (e) {}
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

(async () => {
  const okBoot = await waitFor(() => appHtml().indexOf('Meus planos') !== -1);
  check('dashboard renderizou (Meus planos)', okBoot, appHtml().slice(0, 200));

  const chip = window.document.getElementById('credito-chip-saldo');
  check('chip de créditos presente', !!chip);
  check('saldo inicial = 3', chip && chip.textContent === '3', chip && chip.textContent);

  check('nome do professor (Maria)', appHtml().indexOf('Maria') !== -1);
  check('botão admin ausente (não é admin)', appHtml().indexOf('btn-admin') === -1);

  const novoSaldo = await window.reservarCreditoIA();
  check('reservarCreditoIA retornou 2', novoSaldo === 2, novoSaldo);
  check('chip atualizou para 2', chip.textContent === '2', chip.textContent);

  window.DB.perfis[0].credito_inicial = 0;
  try {
    await window.reservarCreditoIA();
    check('paywall: deveria lançar erro sem créditos', false);
  } catch (e) {
    check('paywall: erro sem créditos', /sem cr.ditos/i.test(e.message), e.message);
    check('paywall: flag semCreditos', !!e.semCreditos);
  }
  window.DB.perfis[0].credito_inicial = 3;

  window.showCompraCreditos();
  const okCompra = await waitFor(() => appHtml().indexOf('Comprar cr') !== -1);
  check('tela de compra abriu', okCompra);
  const okPacotes = await waitFor(() => appHtml().indexOf('data-plano-id') !== -1);
  check('pacotes carregaram', okPacotes);
  check('pacote Básico listado', appHtml().indexOf('Basico') !== -1);
  check('pacote Popular listado', appHtml().indexOf('Popular') !== -1);

  const btns = [...window.document.querySelectorAll('[data-plano-id]')];
  check('botões de comprar presentes', btns.length === 2, btns.length);
  btns[0].click();
  const okPix = await waitFor(() => appHtml().indexOf('Pagamento PIX') !== -1);
  check('painel de pagamento PIX abriu', okPix);
  check('chave PIX exibida', appHtml().indexOf('COLE_SUA_CHAVE_PIX') !== -1);
  check('referência do pedido criada', /PA\d+/.test(appHtml()));
  check('pedido salvo no banco (mock)', window.DB.pedidos_pix.length === 1, window.DB.pedidos_pix.length);

  window.DB.pedidos_pix[0].status = 'aguardando';
  window.DB.perfis[0].is_admin = true;
  await window.carregarPerfil();
  window.showPainelAdmin();
  const okAdmin = await waitFor(() => appHtml().indexOf('Pedidos PIX aguardando') !== -1);
  check('painel admin abriu', okAdmin);
  check('pedido pendente visível', appHtml().indexOf('maria@edu.sesisc.org.br') !== -1);
  const btnApr = window.document.querySelector('[data-aprovar]');
  check('botão aprovar presente', !!btnApr);
  btnApr.click();
  const okApr = await waitFor(() => window.DB.pedidos_pix[0].status === 'aprovado');
  check('pedido aprovado', okApr, window.DB.pedidos_pix[0].status);
  check('créditos creditados (3 + 50)', window.DB.perfis[0].credito_inicial === 53, window.DB.perfis[0].credito_inicial);

  console.log('\n' + (fails === 0 ? 'TODOS OS TESTES PASSARAM OK' : fails + ' FALHAS'));
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('ERRO no teste:', e); process.exit(2); });