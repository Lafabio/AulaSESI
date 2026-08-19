// Teste do caminho sem Supabase configurado: deve mostrar a tela de login.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.env.TEMP, 'jsdom_test', 'node_modules', 'jsdom'));

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const dom = new JSDOM(src, { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = function () {};

let fails = 0;
function check(name, cond) {
  if (cond) console.log('PASS  ' + name);
  else { fails++; console.log('FAIL  ' + name); }
}

setTimeout(() => {
  const html = window.document.getElementById('app').innerHTML || '';
  check('tela de login renderizou (form-entrar)', html.indexOf('form-entrar') !== -1);
  check('aba criar conta presente', html.indexOf('form-cadastrar') !== -1);
  check('aviso de modo desenvolvimento', html.indexOf('Modo desenvolvimento') !== -1);
  check('créditos de cortesia citados', html.indexOf('créditos de cortesia') !== -1);
  check('link esqueci minha senha', html.indexOf('btn-esqueci-senha') !== -1);
  check('mostrar senha no login', html.indexOf('btn-mostrar-login-senha') !== -1);
  check('mostrar senha no cadastro', html.indexOf('btn-mostrar-cad-senha') !== -1);
  console.log('\n' + (fails === 0 ? 'LOGIN OK' : fails + ' FALHAS'));
  process.exit(fails === 0 ? 0 : 1);
}, 500);