import OpenAI from "openai";

// Get API key from environment variable (NEXT_PUBLIC_ prefix for client-side)
const API_KEY = process.env.NEXT_PUBLIC_UPSTAGE_API_KEY;

export async function summarizeNote(text: string, dateObj: Date): Promise<string> {
    if (!text) return "";

    if (!API_KEY || API_KEY === 'your_upstage_api_key_here') {
        throw new Error("Upstage API 키가 설정되지 않았습니다. .env.local 파일에서 NEXT_PUBLIC_UPSTAGE_API_KEY를 설정해주세요.");
    }

    const openai = new OpenAI({
        apiKey: API_KEY,
        baseURL: "https://api.upstage.ai/v1/solar",
        dangerouslyAllowBrowser: true
    });

    try {
        // 날짜 포맷팅
        const d = new Date(dateObj);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const formattedDate = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]})`;

        const prompt = `
다음은 교사가 작성한 알림장 메모입니다. 이를 **학생과 학부모(보호자)** 모두가 보기 편하도록 정리해주세요.

**작성 규칙:**
1. **헤더 필수**: 맨 첫 줄은 반드시 "# ${formattedDate} 전달사항"으로 시작하세요.
2. **인사말 생략**: "학부모님께", "안녕하세요" 같은 인사말이나 수신자 호칭은 **절대 넣지 마세요**.
3. **핵심 내용만**: 바로 본론으로 들어가서 전달 사항을 명확하게 작성하세요.
4. **가독성**: 
   - 중요한 정보는 **굵게** 표시하세요.
   - 항목이 여러 개면 목록(Bullet points)으로 정리하세요.
   - 준비물, 시간, 장소 등은 눈에 띄게 구분하세요.

**메모 내용:**
${text}
`;

        const response = await openai.chat.completions.create({
            model: "solar-mini",
            messages: [
                {
                    role: "system",
                    content: "당신은 교사의 알림장 작성을 돕는 유능한 비서입니다. 입력받은 메모를 가독성 좋은 알림장 형식으로 정리합니다."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
        });

        return response.choices[0].message.content || "";
    } catch (error) {
        console.error("Upstage API Error:", error);
        throw error;
    }
}
