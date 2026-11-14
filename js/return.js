import { getActiveRental, getEquipmentById, getLockers, returnRental } from './store.js';
import { h } from './dom.js';

const ITEMS = ['장비를 보관함에 넣었다', '보관함을 잠갔다'];

export function renderReturn() {
  const rental = getActiveRental();
  const e = rental && getEquipmentById(rental.equipmentId);
  if (!e) return null; // 대여 중인 기록이 없으면 홈으로
  const locker = getLockers().find((l) => l.id === e.lockerId);

  const boxes = ITEMS.map(() => h('input', { type: 'checkbox' }));
  const hint = h('p', { className: 'bar-hint' });
  hint.setAttribute('aria-live', 'polite');
  const done = h('button', { className: 'btn btn-primary', type: 'button' }, '반납 완료');

  function update() {
    const left = ITEMS.filter((_, i) => !boxes[i].checked);
    done.disabled = left.length > 0;
    if (left.length === 0) hint.textContent = '모두 확인했습니다. 반납 완료를 눌러 주세요.';
    else if (left.length === ITEMS.length) hint.textContent = '두 항목을 모두 체크해야 반납을 완료할 수 있습니다.';
    else hint.textContent = `'${left[0]}'까지 체크해야 반납을 완료할 수 있습니다.`;
  }
  boxes.forEach((box) => box.addEventListener('change', update));
  update();

  const root = h('div', { className: 'with-bottom-bar' },
    h('a', { className: 'back-link', href: '#/home' }, '← 홈으로'),
    h('h1', {}, '반납'),
    h('div', { className: 'card' },
      h('div', { className: 'card-top' }, h('span', { className: 'tag' }, e.spec)),
      h('p', { className: 'card-name' }, e.name),
      h('p', {}, `반납할 곳: ${locker?.locationText ?? ''}`),
      h('a', { className: 'back-link', href: '#/key' }, '번호키 다시 보기'),
    ),
    h('p', { className: 'guide' }, '장비를 보관함에 넣고 잠가야 반납이 끝납니다. 아래 두 가지를 직접 확인하고 체크해 주세요.'),
    h('ul', { className: 'checklist' },
      ...ITEMS.map((text, i) => h('li', {}, h('label', { className: 'check' }, boxes[i], text))),
    ),
    h('div', { className: 'bottom-bar' }, hint, done),
  );

  done.addEventListener('click', () => {
    if (!returnRental(rental.id)) {
      location.hash = '#/home';
      return;
    }
    root.className = '';
    root.replaceChildren(
      h('h1', {}, '반납 완료'),
      h('p', { className: 'guide' }, `${e.name} (${e.spec}) 반납이 기록되었습니다.`),
      h('a', { className: 'btn btn-primary', href: '#/home' }, '홈으로'),
    );
    window.scrollTo(0, 0);
  });

  return root;
}
