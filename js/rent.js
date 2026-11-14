import { getEquipmentById, rent } from './store.js';
import { STUDENT_ID_LENGTH, STUDENT_ID_EXAMPLE } from './config.js';
import { cleanStudentId, checkStudentId } from './student-id.js';
import { h } from './dom.js';

export function renderRent(query) {
  const e = getEquipmentById(query.get('equipment'));
  if (!e || e.available <= 0) return null; // 장비가 없거나 재고가 없으면 홈으로

  const input = h('input', {
    id: 'student-id',
    className: 'input',
    type: 'text',
    inputMode: 'numeric',
    autocomplete: 'off',
    placeholder: `예: ${STUDENT_ID_EXAMPLE} (숫자 ${STUDENT_ID_LENGTH}자리)`,
  });
  input.setAttribute('aria-describedby', 'student-id-msg');
  const msg = h('p', { id: 'student-id-msg', className: 'field-msg' });
  msg.setAttribute('aria-live', 'polite');
  const submit = h('button', { className: 'btn btn-primary', type: 'submit', disabled: true }, '대여하기');

  // strict: 칸을 벗어났거나 제출할 때. 이때는 자릿수가 모자란 것도 오류로 표시한다.
  function update(strict = false) {
    const r = checkStudentId(input.value);
    const isError = Boolean(r.message) && (!r.incomplete || strict);
    input.classList.toggle('is-error', isError);
    input.setAttribute('aria-invalid', String(isError));
    msg.classList.toggle('is-error', isError);
    msg.textContent = isError ? `오류: ${r.message}` : r.message;
    submit.disabled = !r.ok;
    return r.ok;
  }

  // 공백·하이픈만 지우고 나머지 입력과 커서 위치는 그대로 둔다.
  function stripSeparators() {
    const caret = cleanStudentId(input.value.slice(0, input.selectionStart)).length;
    const cleaned = cleanStudentId(input.value);
    if (cleaned !== input.value) {
      input.value = cleaned;
      input.setSelectionRange(caret, caret);
    }
  }

  input.addEventListener('input', (ev) => {
    if (!ev.isComposing) stripSeparators(); // 한글 조합 중에는 값을 건드리지 않는다
    update();
  });
  input.addEventListener('compositionend', () => { stripSeparators(); update(); });
  input.addEventListener('blur', () => update(true));

  const form = h('form', { className: 'with-bottom-bar', noValidate: true },
    h('a', { className: 'back-link', href: '#/home' }, '← 홈으로'),
    h('h1', {}, '학번 입력'),
    h('div', { className: 'card' },
      h('div', { className: 'card-top' }, h('span', { className: 'tag' }, e.spec)),
      h('p', { className: 'card-name' }, e.name),
    ),
    h('label', { className: 'label', htmlFor: 'student-id' }, '학번'),
    input,
    msg,
    h('ul', { className: 'notes' },
      h('li', {}, '학번을 도용하면 제재를 받을 수 있습니다.'),
      h('li', {}, '수집하는 정보는 학번 하나이며 이 기기에만 저장됩니다.'),
      h('li', {}, '프로토타입 실습용입니다.'),
    ),
    h('div', { className: 'bottom-bar' }, submit),
  );

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!update(true)) {
      input.focus();
      return;
    }
    if (!rent(e.id, cleanStudentId(input.value))) {
      msg.classList.add('is-error');
      msg.textContent = '오류: 방금 재고가 모두 나갔습니다. 홈에서 재고를 다시 확인해 주세요.';
      submit.disabled = true;
      return;
    }
    location.hash = '#/key';
  });

  return form;
}
