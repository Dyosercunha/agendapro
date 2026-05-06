function agendaProCleanText(value) {
  if (!value) return value;
  var text = String(value);
  var fixes = [
    ['Descolora??o', 'Descoloracao'],
    ['Colora??o', 'Coloracao'],
    ['Sobrancelho', 'Sobrancelha'],
    ['hor?rio', 'horario'],
    ['Hor?rio', 'Horario'],
    ['j?', 'ja'],
    ['J?', 'Ja'],
    ['est?', 'esta'],
    ['Est?', 'Esta'],
    ['servi?o', 'servico'],
    ['Servi?o', 'Servico'],
    ['n?o', 'nao'],
    ['N?o', 'Nao'],
    ['Livre', 'Disponivel'],
    ['livre', 'disponivel'],
    ['Horarios inteligentes', 'Horarios disponiveis'],
    ['Horários inteligentes', 'Horarios disponiveis'],
    ['2 meses', 'Proximos 60 dias'],
    ['Falar com barbeiro', 'Falar com a barbearia'],
    ['Falar com o barbeiro', 'Falar com a barbearia'],
    ['Sugestão calculada para', 'Encaixe ideal para os servicos escolhidos.'],
    ['Sugestao calculada para', 'Encaixe ideal para os servicos escolhidos.'],
    ['Em caso de cancelamento ou reagendamento, entre em contato com o barbeiro.', 'Em caso de cancelamento ou reagendamento, entre em contato com a barbearia.']
  ];
  fixes.forEach(function(pair) {
    text = text.split(pair[0]).join(pair[1]);
  });
  text = text.replace(/Encaixe ideal para os servicos escolhidos\.\s*\d+\s*min de atendimento\./g, 'Encaixe ideal para os servicos escolhidos.');
  return text;
}

function agendaProApplyTextFixes() {
  if (!document.body) return;

  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  var nodes = [];
  var node;
  while ((node = walker.nextNode())) {
    var parent = node.parentElement;
    if (!parent) continue;
    if (['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA'].indexOf(parent.tagName) >= 0) continue;
    nodes.push(node);
  }

  nodes.forEach(function(textNode) {
    var fixed = agendaProCleanText(textNode.nodeValue);
    if (fixed !== textNode.nodeValue) textNode.nodeValue = fixed;
  });

  document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(function(el) {
    ['placeholder', 'title', 'aria-label'].forEach(function(attr) {
      var value = el.getAttribute(attr);
      if (!value) return;
      var fixed = agendaProCleanText(value);
      if (fixed !== value) el.setAttribute(attr, fixed);
    });
  });

  document.querySelectorAll('.stepper span').forEach(function(el) {
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text === 'Antes' || text === 'Processo' || text === 'Final') {
      el.style.display = 'none';
    }
  });

  document.querySelectorAll('*').forEach(function(el) {
    if (el.closest && el.closest('.adminApp')) return;
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text === 'Tempo' || text === '0 min' || /^Tempo\s+\d+\s*min$/i.test(text)) {
      el.style.display = 'none';
    }
  });
}

function agendaProStartTextFixes() {
  agendaProApplyTextFixes();
  var locked = false;
  var observer = new MutationObserver(function() {
    if (locked) return;
    locked = true;
    requestAnimationFrame(function() {
      locked = false;
      agendaProApplyTextFixes();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', agendaProStartTextFixes, { once: true });
} else {
  agendaProStartTextFixes();
}
