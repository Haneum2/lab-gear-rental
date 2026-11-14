// 재고 저장 점검. 프로젝트 폴더에서 실행: node tests/store.check.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const saved = new Map();
globalThis.localStorage = {
  getItem: (k) => saved.get(k) ?? null,
  setItem: (k, v) => saved.set(k, v),
};
globalThis.fetch = async (path) => ({ ok: true, json: async () => JSON.parse(readFileSync(path, 'utf8')) });

const store = await import('../js/store.js');
const id = 'hdmi-gender-c';

await store.init();
assert.equal(store.getEquipmentById(id).available, 3, '저장값이 없으면 예시 데이터로 시작');

assert.equal(store.changeAvailable(id, -1), true);
await store.init(); // 새로고침
assert.equal(store.getEquipmentById(id).available, 2, '새로고침 후에도 유지');

store.changeAvailable(id, -1);
store.changeAvailable(id, -1);
assert.equal(store.changeAvailable(id, -1), false, '0 아래로 내려가지 않음');
assert.equal(store.getEquipmentById(id).available, 0);

store.changeAvailable(id, +1);
store.changeAvailable(id, +1);
store.changeAvailable(id, +1);
assert.equal(store.changeAvailable(id, +1), false, '총수량을 넘지 않음');

saved.set('lab-gear-rental:v1', '{깨진 값');
await store.init();
assert.equal(store.getEquipmentById(id).available, 3, '저장값이 깨지면 예시 데이터로 시작');

// 대여: 재고 -1, 기록 저장, 새로고침 후에도 대여 중 기록이 남는다
saved.clear();
await store.init();
assert.equal(store.getActiveRental(), undefined, '기록이 없으면 대여 중 기록도 없음');
const rental = store.rent(id, '20261234');
assert.equal(rental.status, '대여중');
assert.ok(rental.rentedAt);
await store.init(); // 새로고침
assert.equal(store.getEquipmentById(id).available, 2);
assert.equal(store.getActiveRental().studentId, '20261234');
store.rent(id, '20261234');
store.rent(id, '20261234');
assert.equal(store.rent(id, '20261234'), null, '재고가 없으면 대여되지 않음');
assert.equal(store.getRentals().length, 3);
assert.equal(new Set(store.getRentals().map((r) => r.id)).size, 3, '대여 기록 id는 서로 다름');

// 반납: 상태 '반납완료', 재고 +1, 새로고침 후에도 유지
const active = store.getActiveRental();
assert.equal(store.returnRental(active.id), true);
assert.equal(store.returnRental(active.id), false, '이미 반납한 기록은 다시 반납되지 않음');
await store.init(); // 새로고침
assert.equal(store.getEquipmentById(id).available, 1);
const returned = store.getRentals().find((r) => r.id === active.id);
assert.equal(returned.status, '반납완료');
assert.ok(returned.returnedAt);
assert.notEqual(store.getActiveRental().id, active.id, '남은 대여 중 기록이 다음 차례');
store.returnRental(store.getActiveRental().id);
store.returnRental(store.getActiveRental().id);
assert.equal(store.getActiveRental(), undefined, '모두 반납하면 대여 중 기록 없음');
assert.equal(store.getEquipmentById(id).available, 3);

// 보관함 찾기 (?locker=, QR, 코드 입력)
assert.equal(store.findLocker('a1 ').id, 'A1', '대소문자와 공백은 무시');
assert.equal(store.findLocker('ZZ'), undefined);
assert.equal(store.findLocker(null), undefined);
assert.equal(store.getDefaultLocker().id, 'A1');
assert.equal(store.getEquipment('A1').length, 1);
assert.equal(store.getEquipment('ZZ').length, 0);
const { lockerIdFromQr } = await import('../js/qr.js');
assert.equal(lockerIdFromQr('https://example.github.io/lab-gear-rental/?locker=A1#/home'), 'A1');
assert.equal(lockerIdFromQr(' A1 '), 'A1', 'ID만 적힌 QR도 읽음');

// 넣어 둔 jsQR 파일이 불러와지고, QR이 없는 화면에서는 null을 돌려준다
const { createRequire } = await import('node:module');
const jsQR = createRequire(import.meta.url)('../js/vendor/jsQR.js');
assert.equal(jsQR(new Uint8ClampedArray(64 * 64 * 4).fill(255), 64, 64), null);

// 학번 형식
const { cleanStudentId, checkStudentId, maskStudentId } = await import('../js/student-id.js');
assert.equal(cleanStudentId(' 2026-12 34 '), '20261234');
assert.equal(checkStudentId('2026 1234').ok, true, '공백이 섞여도 통과');
assert.equal(checkStudentId('2026-1234').ok, true, '하이픈이 섞여도 통과');
assert.equal(checkStudentId('').message, '', '빈 칸은 오류 문장 없음');
assert.equal(checkStudentId('2026').incomplete, true, '덜 입력한 상태');
assert.match(checkStudentId('2026a234').message, /5번째 글자 'a'/, '틀린 위치를 알려 줌');
assert.match(checkStudentId('202612345').message, /1자리를 지워/);
assert.ok(!checkStudentId('202612345').incomplete);
assert.equal(maskStudentId('20261234'), '2026****');

console.log('store 점검 통과');
