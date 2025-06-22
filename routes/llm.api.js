const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const router = express.Router();

// AI 백엔드 서버 주소 (Docker 포트 매핑: 62000 → 8001)
const aiApiUrl = 'http://127.0.0.1:62000';

console.log(`[LLM Manual Proxy] AI 백엔드 서버 URL: ${aiApiUrl}`);

// multer 설정 - 메모리 스토리지 사용
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB 제한
    }
});

// STT 엔드포인트 전용 처리
router.post('/stt', upload.single('audio'), async (req, res) => {
    console.log(`[LLM Manual Proxy] STT 요청 수신`);
    console.log(`[LLM Manual Proxy] req.file:`, req.file);
    
    if (!req.file) {
        console.error('[LLM Manual Proxy] 오디오 파일이 없습니다.');
        console.error('[LLM Manual Proxy] req.body:', req.body);
        console.error('[LLM Manual Proxy] req.headers:', req.headers);
        return res.status(400).json({ error: '오디오 파일이 필요합니다.' });
    }

    try {
        // FormData 생성
        const formData = new FormData();
        formData.append('audio', req.file.buffer, {
            filename: req.file.originalname || 'audio.webm',
            contentType: req.file.mimetype || 'audio/webm'
        });

        const targetUrl = `${aiApiUrl}/stt`;
        console.log(`[LLM Manual Proxy] STT 요청 전달: ${targetUrl}`);
        console.log(`[LLM Manual Proxy] 파일 정보:`, {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            fieldname: req.file.fieldname
        });

        // FormData 헤더 확인
        const headers = formData.getHeaders();
        console.log(`[LLM Manual Proxy] FormData 헤더:`, headers);

        // axios로 전송
        const response = await axios.post(targetUrl, formData, {
            headers: {
                ...headers,
                'Accept': 'application/json'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 90000 // STT도 90초 타임아웃
        });

        console.log(`[LLM Manual Proxy] STT 응답 수신: ${response.status}`);
        console.log(`[LLM Manual Proxy] STT 응답 데이터:`, response.data);
        res.json(response.data);

    } catch (error) {
        console.error('[LLM Manual Proxy] STT 프록시 요청 중 오류:', error.message);
        if (error.response) {
            console.error('[LLM Manual Proxy] 에러 응답 상태:', error.response.status);
            console.error('[LLM Manual Proxy] 에러 응답 데이터:', error.response.data);
        }
        
        if (error.response) {
            res.status(error.response.status).json({
                error: 'STT 처리 실패',
                message: error.response.data
            });
        } else {
            res.status(500).json({
                error: 'STT 서버 오류',
                message: error.message
            });
        }
    }
});

// 기본 프록시 미들웨어 (다른 모든 요청 처리)
router.use('/', async (req, res) => {
    // /api/llm 접두사를 제거하고 실제 엔드포인트 경로만 사용
    const originalPath = req.originalUrl.replace('/api/llm', '');
    const targetUrl = `${aiApiUrl}${originalPath}`;

    console.log(`[LLM Manual Proxy] 요청 수신: ${req.method} ${req.originalUrl}`);
    console.log(`[LLM Manual Proxy] 대상 URL로 전달 시도: ${targetUrl}`);

    try {
        const headers = { ...req.headers };
        // 프록시 요청을 위해 호스트 헤더를 대상에 맞게 변경
        headers.host = '127.0.0.1:62000';      
        // Express에서 추가하는 기타 관련 헤더 제거
        delete headers['connection'];
        delete headers['content-length']; // Content-Length는 axios가 자동으로 설정하도록 함

        // axios 요청 옵션 구성
        const axiosOptions = {
            method: req.method.toLowerCase(),
            url: targetUrl,
            headers: headers,
            timeout: 90000, // 90초 타임아웃 (LLM 응답 대기 시간 고려)
            validateStatus: () => true, // 모든 상태 코드 허용
        };

        // TTS 요청인 경우에만 arraybuffer로 설정
        if (originalPath.includes('/tts') && req.method === 'POST') {
            axiosOptions.responseType = 'arraybuffer';
        }

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
        const contentType = response.headers['content-type'] || '';
        
        if (contentType.includes('application/json')) {
            // JSON 응답인 경우
            try {
                // responseType이 arraybuffer인 경우와 아닌 경우를 구분
                const jsonData = axiosOptions.responseType === 'arraybuffer' 
                    ? JSON.parse(response.data.toString('utf8'))
                    : response.data;
                    
                console.log(`[LLM Manual Proxy] 응답 데이터 타입: object (JSON)`);
                console.log(`[LLM Manual Proxy] 응답 데이터:`, JSON.stringify(jsonData).substring(0, 200));
                res.json(jsonData);
            } catch (e) {
                console.error('[LLM Manual Proxy] JSON 파싱 오류:', e);
                res.send(response.data);
            }
        } else if (contentType.includes('audio/') || contentType.includes('application/octet-stream')) {
            // 오디오 또는 바이너리 응답인 경우
            console.log(`[LLM Manual Proxy] 응답 데이터 타입: binary (${contentType})`);
            console.log(`[LLM Manual Proxy] 응답 데이터 크기: ${response.data.length} bytes`);
            res.send(Buffer.from(response.data));
        } else if (contentType.includes('text/')) {
            // 텍스트 응답인 경우
            const textData = axiosOptions.responseType === 'arraybuffer'
                ? response.data.toString('utf8')
                : response.data;
                
            console.log(`[LLM Manual Proxy] 응답 데이터 타입: string (${contentType})`);
            console.log(`[LLM Manual Proxy] 응답 데이터:`, textData.substring(0, 200));
            res.send(textData);
        } else {
            // 기타 응답
            console.log(`[LLM Manual Proxy] 응답 데이터 타입: unknown (${contentType})`);
            if (axiosOptions.responseType === 'arraybuffer') {
                console.log(`[LLM Manual Proxy] 응답 데이터 크기: ${response.data.length} bytes`);
                res.send(Buffer.from(response.data));
            } else {
                res.send(response.data);
            }
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