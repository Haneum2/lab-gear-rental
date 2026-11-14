import { STUDENT_ID_LENGTH as LEN, STUDENT_ID_PATTERN, STUDENT_ID_VISIBLE } from './config.js';

// 공백과 하이픈은 오류가 아니라 그냥 지운다.
export const cleanStudentId = (raw) => raw.replace(/[\s-]/g, '');

// { ok, message, incomplete }를 돌려준다.
// incomplete는 아직 덜 입력했을 뿐인 상태라, 입력 중에는 오류로 표시하지 않는다.
export function checkStudentId(raw) {
  const id = cleanStudentId(raw);
  if (STUDENT_ID_PATTERN.test(id)) return { ok: true, message: '' };
  if (!id) return { ok: false, message: '' };

  const bad = id.search(/\D/);
  if (bad !== -1) {
    return { ok: false, message: `숫자만 입력할 수 있습니다. ${bad + 1}번째 글자 '${id[bad]}'를 지워 주세요.` };
  }
  if (id.length > LEN) {
    return { ok: false, message: `학번은 ${LEN}자리입니다. 지금 ${id.length}자리이니 ${id.length - LEN}자리를 지워 주세요.` };
  }
  return {
    ok: false,
    incomplete: true,
    message: `${LEN}자리 중 ${id.length}자리를 입력했습니다. ${LEN - id.length}자리를 더 입력해 주세요.`,
  };
}

export const maskStudentId = (id) =>
  id.slice(0, STUDENT_ID_VISIBLE) + '*'.repeat(Math.max(id.length - STUDENT_ID_VISIBLE, 0));
