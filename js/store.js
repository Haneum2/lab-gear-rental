// 재고와 대여 상태는 이 파일에서만 다룬다.
// 장비 이름·규격·총수량은 항상 data/ JSON에서 읽고, 바뀌는 값(남은 수량, 대여 기록)만 localStorage에 둔다.

const STORAGE_KEY = 'lab-gear-rental:v1';

const state = {
  lockers: [],
  equipment: [],
  rentals: [], // { id, equipmentId, studentId, status, rentedAt, returnedAt }
};

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} 불러오기 실패 (${res.status})`);
  return res.json();
}

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {}; // 저장값이 깨졌거나 저장소를 못 쓰면 예시 데이터로 시작
  }
}

function save() {
  const available = Object.fromEntries(state.equipment.map((e) => [e.id, e.available]));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ available, rentals: state.rentals }));
  } catch {
    // 사생활 보호 모드 등: 이번 방문 동안은 메모리 값으로 계속 동작
  }
}

export async function init() {
  [state.lockers, state.equipment] = await Promise.all([
    loadJson('data/lockers.json'),
    loadJson('data/equipment.json'),
  ]);
  const saved = readSaved();
  for (const e of state.equipment) {
    const n = saved.available?.[e.id];
    if (Number.isInteger(n)) e.available = Math.min(Math.max(n, 0), e.total);
  }
  state.rentals = Array.isArray(saved.rentals) ? saved.rentals : [];
}

export const getLockers = () => state.lockers;
export const getDefaultLocker = () => state.lockers[0];
// 보관함 ID로 찾는다. 대소문자와 앞뒤 공백은 무시한다 (a1 → A1).
export const findLocker = (id) => {
  const key = String(id ?? '').trim().toLowerCase();
  return state.lockers.find((l) => l.id.toLowerCase() === key);
};
// lockerId를 주면 그 보관함의 장비만, 안 주면 전체
export const getEquipment = (lockerId) =>
  lockerId ? state.equipment.filter((e) => e.lockerId === lockerId) : state.equipment;
export const getEquipmentById = (id) => state.equipment.find((e) => e.id === id);
export const getRentals = () => state.rentals;

// 대여는 delta -1, 반납은 +1. 0 미만이나 총수량 초과가 되면 바꾸지 않고 false를 돌려준다.
export function changeAvailable(equipmentId, delta) {
  const e = getEquipmentById(equipmentId);
  if (!e) return false;
  const next = e.available + delta;
  if (next < 0 || next > e.total) return false;
  e.available = next;
  save();
  return true;
}

// 재고를 1 줄이고 대여 기록을 남긴다. 재고가 없으면 null.
export function rent(equipmentId, studentId) {
  if (!changeAvailable(equipmentId, -1)) return null;
  const rental = {
    id: `r-${Date.now()}-${state.rentals.length}`,
    equipmentId,
    studentId,
    status: '대여중',
    rentedAt: new Date().toISOString(),
    returnedAt: null,
  };
  state.rentals.push(rental);
  save();
  return rental;
}

// 대여 기록을 '반납완료'로 바꾸고 재고를 1 늘린다. 대여 중인 기록이 아니면 false.
export function returnRental(rentalId) {
  const r = state.rentals.find((x) => x.id === rentalId && x.status === '대여중');
  if (!r) return false;
  r.status = '반납완료';
  r.returnedAt = new Date().toISOString();
  changeAvailable(r.equipmentId, +1);
  save();
  return true;
}

// 이 기기에서 가장 최근에 빌린, 아직 반납하지 않은 기록
export const getActiveRental = () => state.rentals.findLast((r) => r.status === '대여중');
