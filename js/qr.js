// QR에는 '주소/?locker=보관함ID' 형태의 주소가 들어 있다. ID만 적힌 QR도 받는다.
// 읽은 주소로 이동하지 않고 보관함 ID만 꺼내 쓴다.
export function lockerIdFromQr(raw) {
  try {
    return new URL(raw).searchParams.get('locker') ?? raw.trim();
  } catch {
    return raw.trim();
  }
}

// 카메라를 켜고 video에 비친 QR을 읽어 onResult(내용)를 한 번 부른다. 멈추는 함수를 돌려준다.
// 브라우저가 지원하지 않으면 Error('unsupported'), 카메라 권한이 없으면 getUserMedia의 오류를 던진다.
export async function startScan(video, onResult) {
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
  if (!(await BarcodeDetector.getSupportedFormats()).includes('qr_code')) throw new Error('unsupported');

  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  let stopped = false;
  const stop = () => {
    stopped = true;
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };

  try {
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    stop();
    throw err;
  }

  const detector = new BarcodeDetector({ formats: ['qr_code'] });
  (async function tick() {
    if (stopped) return;
    if (!video.isConnected) return stop(); // 다른 화면으로 넘어갔으면 카메라를 끈다
    try {
      const [code] = await detector.detect(video);
      if (code && !stopped) {
        stop();
        onResult(code.rawValue);
        return;
      }
    } catch {
      // 영상이 아직 준비되지 않은 프레임: 다음 차례에 다시 읽는다
    }
    setTimeout(tick, 250);
  })();

  return stop;
}
