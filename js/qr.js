// QR에는 '주소/?locker=보관함ID' 형태의 주소가 들어 있다. ID만 적힌 QR도 받는다.
// 읽은 주소로 이동하지 않고 보관함 ID만 꺼내 쓴다.
export function lockerIdFromQr(raw) {
  try {
    return new URL(raw).searchParams.get('locker') ?? raw.trim();
  } catch {
    return raw.trim();
  }
}

const JSQR_PATH = 'js/vendor/jsQR.js'; // jsQR 1.4.0 (Apache-2.0). 필요할 때만 불러온다.
const JSQR_MAX_SIDE = 640; // 이 크기로 줄여서 읽는다. 클수록 정확하지만 느리다.

function loadJsQr() {
  if (window.jsQR) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = JSQR_PATH;
    script.onload = resolve;
    script.onerror = () => reject(new Error('QR 라이브러리를 불러오지 못했습니다.'));
    document.head.append(script);
  });
}

// video의 현재 화면에서 QR 내용을 읽어 문자열(없으면 undefined)을 돌려주는 함수를 만든다.
// 브라우저 내장 BarcodeDetector가 있으면 그것을, 없으면(아이폰 등) jsQR을 쓴다.
async function createReader(video) {
  if ('BarcodeDetector' in window && (await BarcodeDetector.getSupportedFormats()).includes('qr_code')) {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    return async () => (await detector.detect(video))[0]?.rawValue;
  }

  await loadJsQr();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async () => {
    const scale = Math.min(1, JSQR_MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.floor(video.videoWidth * scale);
    canvas.height = Math.floor(video.videoHeight * scale);
    if (!canvas.width || !canvas.height) return undefined; // 영상이 아직 준비되지 않음
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return window.jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data || undefined;
  };
}

// 카메라를 켜고 video에 비친 QR을 읽어 onResult(내용)를 한 번 부른다. 멈추는 함수를 돌려준다.
// 카메라를 쓸 수 없는 환경이면 Error('unsupported'), 카메라 권한이 없으면 getUserMedia의 오류를 던진다.
export async function startScan(video, onResult) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported'); // https가 아니거나 오래된 브라우저

  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  let stopped = false;
  const stop = () => {
    stopped = true;
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };

  let read;
  try {
    video.srcObject = stream;
    await video.play();
    read = await createReader(video);
  } catch (err) {
    stop();
    throw err;
  }

  (async function tick() {
    if (stopped) return;
    if (!video.isConnected) return stop(); // 다른 화면으로 넘어갔으면 카메라를 끈다
    try {
      const text = await read();
      if (text && !stopped) {
        stop();
        onResult(text);
        return;
      }
    } catch {
      // 영상이 아직 준비되지 않은 프레임: 다음 차례에 다시 읽는다
    }
    setTimeout(tick, 250);
  })();

  return stop;
}
