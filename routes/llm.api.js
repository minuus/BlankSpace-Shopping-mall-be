const express = require('express');
const axios = require('axios');
const router = express.Router();

// AI 백엔드 서버 주소 (Docker 포트 매핑: 62000 → 8001)
const aiApiUrl = 'http://localhost:62000';

console.log(`[LLM Manual Proxy] AI 백엔드 서버 URL: ${aiApiUrl}`);

// 프록시 미들웨어
router.use('/', async (req, res) => {
    // /api/llm 접두사를 제거하고 실제 엔드포인트 경로만 사용
    const originalPath = req.originalUrl.replace('/api/llm', '');
    const targetUrl = `${aiApiUrl}${originalPath}`;

    console.log(`[LLM Manual Proxy] 요청 수신: ${req.method} ${req.originalUrl}`);
    console.log(`[LLM Manual Proxy] 대상 URL로 전달 시도: ${targetUrl}`);

    try {
        const headers = { ...req.headers };
        // 프록시 요청을 위해 호스트 헤더를 대상에 맞게 변경
        headers.host = 'localhost:62000';      
        // Express에서 추가하는 기타 관련 헤더 제거
        delete headers['connection'];
        delete headers['content-length']; // Content-Length는 axios가 자동으로 설정하도록 함

        // axios 요청 옵션 구성
        const axiosOptions = {
            method: req.method.toLowerCase(),
            url: targetUrl,
            headers: headers,
            timeout: 30000, // 30초 타임아웃
            validateStatus: () => true, // 모든 상태 코드 허용
        };

        // 요청 본문 처리
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            // JSON 요청의 경우
            if (req.is('application/json')) {
                axiosOptions.data = req.body;
                // Content-Type이 없으면 추가
                if (!headers['content-type']) {
                    headers['content-type'] = 'application/json';
                }
            }
            // 멀티파트 폼 데이터 파일 업로드의 경우
            else if (req.is('multipart/form-data')) {
                console.log('[LLM Manual Proxy] 멀티파트 폼 데이터는 지원하지 않습니다.');
                return res.status(415).json({
                    error: '멀티파트 폼 데이터는 지원하지 않습니다.'
                });
            }
            // 기타 형식의 요청(텍스트 등)
            else {
                axiosOptions.data = req.body;
            }
        }

        console.log(`[LLM Manual Proxy] 요청 본문 타입: ${typeof axiosOptions.data}`);
        if (axiosOptions.data) {
            console.log(`[LLM Manual Proxy] 요청 본문:`, JSON.stringify(axiosOptions.data).substring(0, 200));
        }

        const response = await axios(axiosOptions);

        console.log(`[LLM Manual Proxy] 응답 수신: ${response.status} ${response.statusText}`);
        console.log(`[LLM Manual Proxy] 응답 헤더:`, response.headers);

        // 응답 헤더 복사
        res.statusCode = response.status;
        for (const [key, value] of Object.entries(response.headers)) {
            // 일부 헤더는 Express가 자동으로 처리하므로 제외
            if (!['connection', 'transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        }

        // 응답 본문 처리
        console.log(`[LLM Manual Proxy] 응답 데이터 타입: ${typeof response.data}`);
        console.log(`[LLM Manual Proxy] 응답 데이터:`, JSON.stringify(response.data).substring(0, 200));
        
        // JSON 응답인 경우 그대로 전달
        if (response.headers['content-type']?.includes('application/json')) {
            res.json(response.data);
        } else {
            res.send(response.data);
        }

    } catch (error) {
        console.error('[LLM Manual Proxy] 프록시 요청 중 오류 발생:', error);
        
        if (error.response) {
            // axios 응답 오류
            console.error('[LLM Manual Proxy] 응답 오류:', error.response.status, error.response.data);
            res.status(error.response.status).json({
                error: 'AI 백엔드 서버 응답 오류',
                status: error.response.status,
                message: error.response.data
            });
        } else if (error.request) {
            // 요청 오류 (네트워크 등)
            console.error('[LLM Manual Proxy] 요청 오류:', error.message);
            res.status(503).json({
                error: 'AI 백엔드 서버 연결 실패',
                message: 'AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
            });
        } else {
            // 기타 오류
            console.error('[LLM Manual Proxy] 기타 오류:', error.message);
            res.status(500).json({
                error: 'AI 백엔드 서버 통신 오류',
                message: error.message
            });
        }
    }
});

module.exports = router; 