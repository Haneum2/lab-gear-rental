import { getEquipment, getEquipmentById, getActiveRental, findLocker, getDefaultLocker } from './store.js';
import { lockerIdFromQr, startScan } from './qr.js';
import { h } from './dom.js';

// 대여 중일 때만 홈 맨 위에 나오는 배너 (F8 최소 구현)
function rentalBanner() {
  const rental = getActiveRental();
  const e = rental && getEquipmentById(rental.equipmentId);
  if (!e) return '';
  return h('section', { className: 'banner' },
    h('p', { className: 'banner-title' }, `대여 중: ${e.name} (${e.spec})`),
    h('div', { className: 'banner-actions' },
      h('a', { className: 'btn btn-secondary', href: '#/key' }, '번호키 다시 보기'),
      h('a', { className: 'btn btn-primary', href: '#/return' }, '반납하기'),
    ),
  );
}

function card(e) {
  const out = e.available <= 0;
  return h('li', { className: 'card' },
    h('div', { className: 'card-top' },
      h('span', { className: `badge ${out ? 'badge-out' : 'badge-ok'}` }, out ? '재고 없음' : `남음 ${e.available}`),
      h('span', { className: 'tag' }, e.spec),
    ),
    h('h3', { className: 'card-name' }, e.name),
    h('button', {
      className: 'btn btn-primary',
      type: 'button',
      disabled: out,
      onclick: () => { location.hash = `#/rent?equipment=${encodeURIComponent(e.id)}`; },
    }, '대여'),
  );
}

export function renderHome() {
  // 주소의 ?locker=보관함ID. 없거나 모르는 ID면 기본 보관함을 연다.
  const requested = new URLSearchParams(location.search).get('locker');
  const found = findLocker(requested);
  const locker = found ?? getDefaultLocker();
  const equipment = getEquipment(locker.id);

  // QR 스캔 영역
  const video = h('video', { className: 'scan-video', muted: true, autoplay: true });
  video.setAttribute('playsinline', ''); // 아이폰에서 전체 화면으로 넘어가지 않게 한다
  const cancel = h('button', { className: 'btn btn-secondary', type: 'button' }, '스캔 취소하고 코드 입력');
  const scanBox = h('div', { className: 'panel', hidden: true },
    h('p', {}, '보관함의 QR 코드를 화면에 비춰 주세요.'),
    video,
    cancel,
  );

  // 스캔을 못 할 때 쓰는 보관함 코드 입력 칸
  const codeInput = h('input', {
    id: 'locker-code',
    className: 'input',
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'characters',
    placeholder: `예: ${getDefaultLocker().id}`,
  });
  codeInput.setAttribute('aria-describedby', 'locker-code-msg');
  const codeMsg = h('p', { id: 'locker-code-msg', className: 'field-msg' });
  codeMsg.setAttribute('aria-live', 'polite');
  const manual = h('form', { className: 'panel', hidden: true, noValidate: true },
    h('label', { className: 'label', htmlFor: 'locker-code' }, '보관함 코드 입력'),
    codeInput,
    codeMsg,
    h('button', { className: 'btn btn-primary', type: 'submit' }, '보관함 열기'),
  );

  let stopScan = null;

  function showManual(message, isError = false) {
    stopScan?.();
    stopScan = null;
    scanBox.hidden = true;
    manual.hidden = false;
    codeInput.classList.toggle('is-error', isError);
    codeMsg.classList.toggle('is-error', isError);
    codeMsg.textContent = isError ? `오류: ${message}` : message;
    codeInput.focus();
  }

  function openLocker(id) {
    const target = findLocker(id);
    if (!target) {
      showManual(`'${id}' 보관함을 찾지 못했습니다. 보관함에 적힌 코드를 확인해 주세요.`, true);
      return;
    }
    stopScan?.();
    history.replaceState(null, '', `${location.pathname}?locker=${encodeURIComponent(target.id)}#/home`);
    window.dispatchEvent(new HashChangeEvent('hashchange')); // 새 보관함으로 홈을 다시 그린다
  }

  const qrButton = h('button', { className: 'btn btn-primary btn-large', type: 'button' }, 'QR 스캔');
  qrButton.addEventListener('click', async () => {
    if (stopScan) return; // 이미 스캔 중
    qrButton.disabled = true;
    manual.hidden = true;
    scanBox.hidden = false;
    try {
      stopScan = await startScan(video, (raw) => {
        stopScan = null;
        openLocker(lockerIdFromQr(raw));
      });
    } catch (err) {
      showManual(err.message === 'unsupported'
        ? '이 브라우저에서는 카메라를 쓸 수 없습니다. 보관함에 적힌 코드를 입력해 주세요.'
        : '카메라를 사용할 수 없습니다. 카메라 권한을 허용하거나 보관함에 적힌 코드를 입력해 주세요.');
    } finally {
      qrButton.disabled = false;
    }
  });
  cancel.addEventListener('click', () => showManual(''));
  manual.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const id = codeInput.value.trim();
    if (!id) showManual('보관함 코드를 입력해 주세요.', true);
    else openLocker(id);
  });

  return h('div', {},
    rentalBanner(),
    h('h1', {}, '실습 기자재 대여'),
    requested !== null && !found
      ? h('p', { className: 'notice notice-top' }, `'${requested}' 보관함을 찾지 못해 기본 보관함을 열었습니다.`)
      : '',
    h('p', { className: 'locker-info' }, `보관함 ${locker.id} · ${locker.name}`),
    qrButton,
    scanBox,
    manual,
    h('h2', {}, '장비 목록'),
    equipment.length
      ? h('ul', { className: 'card-list' }, ...equipment.map(card))
      : h('p', {}, '이 보관함에 등록된 장비가 없습니다.'),
  );
}
