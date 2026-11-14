// 학번 형식 검사 기준. 실제 학번 자릿수가 확인되면 이 값만 바꾼다. (PRD 11절 '확인 필요')
export const STUDENT_ID_LENGTH = 8;
export const STUDENT_ID_PATTERN = new RegExp(`^\\d{${STUDENT_ID_LENGTH}}$`);
export const STUDENT_ID_EXAMPLE = '20261234'; // 입력 칸 안내에 쓰는 예시. 자릿수를 바꾸면 같이 바꾼다.
export const STUDENT_ID_VISIBLE = 4; // 화면에 그대로 보여 주는 앞자리 수. 나머지는 *로 가린다.
