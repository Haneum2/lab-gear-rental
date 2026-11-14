import { getActiveRental, getEquipmentById, getLockers } from './store.js';
import { maskStudentId } from './student-id.js';
import { h } from './dom.js';

export function renderKey() {
  const rental = getActiveRental();
  const e = rental && getEquipmentById(rental.equipmentId);
  const locker = e && getLockers().find((l) => l.id === e.lockerId);
  if (!locker) return null; // 대여 중인 기록이 없으면 홈으로

  return h('div', { className: 'key-screen' },
    h('p', { className: 'eyebrow' }, '보관함 위치'),
    h('h1', { className: 'location-text' }, locker.locationText),
    h('p', { className: 'eyebrow' }, '번호키 4자리'),
    h('p', { className: 'keycode' }, locker.code),
    h('p', { className: 'notice' }, '번호키는 캡처해 두어도 됩니다. 대여 중에는 이 화면을 다시 열 수 있습니다.'),
    h('p', { className: 'rental-info' }, `${e.name} (${e.spec}) · 학번 ${maskStudentId(rental.studentId)}`),
    h('a', { className: 'btn btn-secondary', href: '#/home' }, '홈으로'),
  );
}
