import { SchoolInfo } from '@/types/auth';

const NEIS_API_URL = 'https://open.neis.go.kr/hub/schoolInfo';

/**
 * NEIS 오픈 API를 사용하여 학교를 검색합니다.
 * API 키가 없는 경우 빈 배열을 반환합니다.
 */
export async function searchSchools(keyword: string): Promise<SchoolInfo[]> {
    const apiKey = process.env.NEXT_PUBLIC_NEIS_API_KEY;

    if (!apiKey || !keyword || keyword.trim().length < 2) {
        return [];
    }

    try {
        const params = new URLSearchParams({
            KEY: apiKey,
            Type: 'json',
            pIndex: '1',
            pSize: '20',
            SCHUL_NM: keyword.trim(),
        });

        const response = await fetch(`${NEIS_API_URL}?${params.toString()}`);
        const data = await response.json();

        // NEIS API 응답 구조 파싱
        const schoolInfoArray = data?.schoolInfo;
        if (!schoolInfoArray || schoolInfoArray.length < 2) {
            return [];
        }

        const rows = schoolInfoArray[1]?.row;
        if (!rows || !Array.isArray(rows)) {
            return [];
        }

        return rows.map((row: Record<string, string>) => ({
            schoolName: row.SCHUL_NM || '',
            schoolCode: row.SD_SCHUL_CODE || '',
            address: row.ORG_RDNMA || row.ORG_UADDR || '',
            schoolType: row.SCHUL_KND_SC_NM || '',
            eduOfficeCode: row.ATPT_OFCDC_SC_CODE || '',
        }));
    } catch (error) {
        console.error('학교 검색 오류:', error);
        return [];
    }
}
