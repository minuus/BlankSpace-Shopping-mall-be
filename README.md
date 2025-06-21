# BlankSpace Shopping Mall - AI Backend 서버

이 문서는 e-커머스 웹사이트를 위한 '대화형 AI 추천 시스템' 백엔드 서버의 구축 과정과 아키텍처, 주요 트러블슈팅 기록을 담고 있습니다.

## 프로젝트 목표

사용자와의 대화를 통해 상품을 추천하고, 음성으로 상호작용할 수 있는 AI 어시스턴트 기능을 제공합니다. 이를 위해 FastAPI 기반의 Python 서버를 구축하고, Ollama를 통해 대규모 언어 모델(LLM)을, ChromaDB를 통해 벡터 데이터베이스를 활용하는 RAG(Retrieval-Augmented Generation) 시스템을 구현합니다.

## 시스템 아키텍처

```mermaid
graph TD
    subgraph "User Interface"
        A[Frontend: React]
    end

    subgraph "Main Backend"
        B[Backend: Node.js/Express]
    end

    subgraph "AI Backend (Docker)"
        C[API Server: FastAPI]
        D[LLM: Ollama (gemma2:9b-it)]
        E[Vector DB: ChromaDB]
        F[TTS Engine: Piper]
    end

    subgraph "Data"
        G[Database: MongoDB]
    end

    A -- "AI Chat Request (HTTP)" --> B
    B -- "Proxy Request" --> C
    C -- "Query" --> D
    C -- "Search Relevant Docs" --> E
    E -- "Store Product Embeddings" --> H{Embedding Pipeline}
    H -- "Load Product Data" --> G
    D -- "Generate Response" --> C
    C -- "Synthesize Speech" --> F
    C -- "Response (Audio/Text)" --> B
    B -- "Forward Response" --> A

```

## 주요 기능 및 구현

### 1. RAG (Retrieval-Augmented Generation) 시스템

-   **`rag_module.py`**: RAG 시스템의 핵심 로직을 담당합니다.
    -   **`SentenceTransformer`**: 사용자의 질문과 상품 정보를 벡터로 변환(임베딩)하기 위해 `jhgan/ko-sbert-nli` 모델을 사용합니다.
    -   **`ChromaDB`**: 변환된 상품 정보 벡터를 저장하고, 사용자 질문과 유사한 벡터를 검색하는 역할을 합니다. `docker-compose.yml`에 정의된 `chromadb` 서비스를 사용하며, `products` 컬렉션에 데이터를 저장합니다.
    -   **검색 및 증강**: 사용자의 질문이 들어오면, 질문을 벡터로 변환한 뒤 ChromaDB에서 가장 유사한 상품 정보를 검색합니다. 이 정보를 LLM의 프롬프트에 포함시켜, 더 정확하고 관련성 높은 답변을 생성하도록 합니다.

### 2. 대규모 언어 모델 (LLM) 연동

-   **`llm_service.py`**: LLM 및 TTS와의 상호작용을 관리합니다.
    -   **`Ollama`**: 로컬 환경에서 LLM을 구동하기 위한 프레임워크입니다. `gemma2:9b-it` 모델을 사용하여 사용자의 질문에 대한 최종 답변을 생성합니다.
    -   **`ConversationManager`**: 대화의 맥락을 유지하기 위해 이전 대화 기록을 관리합니다. 이를 통해 후속 질문에 더 적절하게 답변할 수 있습니다.

### 3. TTS (Text-to-Speech) 기능

-   **`llm_service.py`**: 생성된 텍스트 답변을 음성으로 변환합니다.
    -   **`piper-tts`**: 빠르고 경량화된 TTS 엔진입니다. `ko_KR-heather-medium.onnx` 모델을 사용하여 한국어 음성을 생성하고, 이를 `wav` 파일 형태로 클라이언트에 스트리밍합니다.

### 4. 실제 데이터 연동 파이프라인

-   **`embedding_pipeline.py`**: 실제 상품 데이터를 AI가 사용할 수 있도록 처리하는 파이프라인입니다.
    -   **데이터 소스**: MongoDB에 저장된 상품(`products`) 데이터를 가져옵니다.
    -   **전처리**: 상품의 `name`, `description`, `category` 등의 정보를 조합하여, AI가 검색하고 답변하기 좋은 풍부한 텍스트 문서(`"상품명: [Name]\n카테고리: [Category]\n설명: [Description]"`)로 가공합니다.
    -   **임베딩 및 저장**: 전처리된 텍스트를 `SentenceTransformer`를 이용해 벡터로 변환하고, MongoDB의 고유 ID와 함께 ChromaDB의 `products` 컬렉션에 저장합니다. 이 파이프라인은 필요시 수동으로 실행하여 ChromaDB의 데이터를 최신 상태로 유지할 수 있습니다.

---

## 트러블슈팅 및 해결 과정

이 프로젝트는 초기 설정부터 실제 운영까지 다양한 기술적 난관에 부딪혔으며, 해결 과정은 다음과 같습니다.

### 문제 1: 프론트엔드 ↔ AI 서버 간 완전 통신 두절

-   **증상**: AI 채팅 요청 시, 어느 쪽에도 로그가 남지 않는 완전 먹통 상태.
-   **해결 과정**:
    1.  **Node.js 프록시 교착 상태**: `curl`로는 AI 서버(Python)에 직접 요청이 성공했으나, 유독 메인 백엔드(Node.js)의 `http-proxy-middleware`를 통한 요청만 멈추는 현상 발생. 원인은 **Node.js v17부터 `localhost`를 IPv6(`::1`)로 먼저 해석하려는 정책**과 Python 서버가 IPv4(`127.0.0.1`)로만 리스닝하는 것의 불일치 문제였습니다.
    2.  **최종 해결**: `http-proxy-middleware`를 포기하고, `llm.api.js` 파일의 내용을 Node.js의 내장 `fetch`를 사용하여 `http://llm_api_server:8008` (Docker 내부 서비스명)로 직접 요청하는 **수동 프록시 코드로 완전히 교체**하여 네트워크 연결 문제를 최종적으로 해결했습니다.

### 문제 2: AI 서버 내부 초기화 실패

-   **증상**: 네트워크 연결 후, AI 서버가 시작 과정에서 특정 모듈을 로드하지 못하고 비정상적으로 작동.
-   **해결 과정**:
    1.  **ChromaDB 연결 실패**: `Could not connect to tenant default_tenant` 오류는 서비스 시작 순서 경쟁(Race Condition) 문제였습니다. `docker-compose.yml`에 `healthcheck` 기능을 도입하여, `chromadb` 서비스가 완전히 준비될 때까지 `llm_api_server`가 기다리도록 `depends_on` 조건을 `service_healthy`로 변경하여 해결했습니다.
    2.  **RAG 검색 실패**: `You must provide an embedding function` 오류는 임베딩 모델 로딩 로직을 복구하고, `Chroma` 클래스에 `embedding_function`을 명시적으로 전달하도록 `rag_module.py`를 수정하여 해결했습니다.

### 문제 3: 모델 다운로드 중 서버 멈춤 (최종 관문)

-   **증상**: AI 서버 컨테이너가 시작될 때, `SentenceTransformer` 모델(`ko-sbert-nli`)을 인터넷에서 다운로드하다가 무한정 멈추는 현상 발생.
-   **원인**: Docker 컨테이너 내부의 불안정한 네트워크 환경 또는 Hugging Face 서버와의 일시적인 통신 문제.
-   **최종 해결책 (다운로드 방식의 근본적 변경)**:
    1.  **호스트에서 사전 다운로드**: `download_model.py` 스크립트를 생성하여, 안정적인 **호스트 PC 환경**에서 모델 파일을 미리 `huggingface_cache` 폴더에 다운로드했습니다.
    2.  **볼륨 마운트**: 다운로드된 `huggingface_cache` 폴더를 `docker-compose.yml`의 `volumes` 설정을 통해 컨테이너 내부(`/app/huggingface_cache`)로 공유했습니다.
    3.  **로컬 경로 지정**: `rag_module.py`가 인터넷이 아닌, 공유된 로컬 폴더에서 모델을 즉시 로드하도록 `cache_folder` 경로를 명시했습니다. 이로써 불안정한 네트워크 의존성을 완전히 제거하고, 컨테이너 시작 시간을 크게 단축했습니다.

이 과정을 통해, 복잡한 네트워크 및 초기화 문제를 모두 해결하고, 실제 데이터를 기반으로 답변할 수 있는 안정적인 대화형 AI 추천 시스템의 기반을 성공적으로 구축했습니다.

---

## 1. 대화형 AI 추천 시스템

단순 키워드 검색을 넘어, 사용자의 숨은 의도를 파악하여 최적의 상품을 추천하는 대화형 AI 시스템을 구축했습니다.

### 1.1. 핵심 동작 시나리오

1.  **의도 분석**: 사용자의 복합적인 질문("오늘 비 오는데 뭐 입지?")에서 핵심 정보(`날씨: 비`, `의도: 옷 추천`)를 추출합니다.
2.  **추가 질문 및 정보 축적**: 부족한 정보는 AI가 추가 질문("어떤 목적으로 외출하시나요?")을 통해 파악하고, 사용자의 답변에서 '정보 토큰'(`목적: 친구 약속`, `스타일: 캐주얼`)을 수집합니다.
3.  **RAG (검색 증강 생성) 기반 상품 검색**: 축적된 정보 토큰을 바탕으로, 다국어 임베딩을 통해 Vector DB에서 가장 적합한 상품(`방수 기능이 있는 캐주얼 아우터`)을 검색(Retrieve)합니다.
4.  **최종 답변 생성**: 검색된 상품과 전체 대화 맥락을 LLM에 전달하여, 추천 근거가 명확한 최종 답변("비 오는 날 친구를 만나는 캐주얼한 상황에 어울리는 이 레인코트를 추천합니다.")을 생성(Generate)합니다.

### 1.2. 기술 아키텍처 (Backend)

모든 백엔드 서비스는 Docker 기반으로 관리하여 개발 및 배포 편의성을 확보했습니다.

-   **`docker-compose.yml`**: Ollama, ChromaDB, FastAPI AI 서버 등 모든 서비스를 총괄 관리합니다.
-   **Ollama**: `Llama 3`와 같은 로컬 LLM을 서빙합니다.
-   **ChromaDB**: 상품 정보의 벡터 임베딩을 저장하고 검색하는 벡터 데이터베이스입니다.
-   **FastAPI AI Server**: 사용자의 요청을 받아 LangChain으로 대화 흐름을 제어하고, Ollama와 ChromaDB를 연동하여 최종 응답을 생성하는 핵심 애플리케이션입니다.
-   **다국어 임베딩**: `paraphrase-multilingual-mpnet-base-v2` 모델을 사용하여, 한국어 질문으로 영어 상품 데이터를 원활하게 검색할 수 있습니다.

## 2. 프론트엔드: AI 어시스턴트 (`aiAssistant.js`)

React 기반으로 구현된 AI 어시스턴트 UI 컴포넌트입니다.

### 2.1. 주요 기능 및 리팩토링

-   **컴포넌트 재작성**: 기존 `VoiceAssistant.js`를 백엔드 API와 직접 통신하는 가볍고 효율적인 `aiAssistant.js`로 완전히 리팩토링했습니다.
-   **서버 중심 상태 관리**: 클라이언트에서 처리하던 복잡한 세션 및 대화 기록 관리를 모두 서버로 이전하여, 일관성과 확장성을 높였습니다.
-   **동적 컨텍스트 제공**: 페이지를 이동할 때마다 현재 URL(상품 상세, 장바구니 등) 정보를 백엔드에 전달하여, 현재 상황에 맞는 더욱 정확한 답변을 유도합니다.
-   **음성 및 텍스트 입력**: 사용자는 음성 녹음 또는 텍스트 입력을 통해 AI와 상호작용할 수 있습니다.

### 2.2. UI/UX 개선

-   **모던한 디자인**: 채팅 패널, 메시지 버블, 버튼 등 모든 UI 요소를 최신 디자인 트렌드에 맞춰 개선했습니다.
-   **직관적인 아이콘**: AI 기능을 상징하는 'Sparkles' 아이콘을 플로팅 버튼에 적용하여 주목도를 높이고, 녹음 상태에 따라 마이크 아이콘이 변경되어 사용자에게 명확한 시각적 피드백을 제공합니다.

## 3. 설치 및 실행

### 3.1. Main Backend (Node.js)

```bash
# BlankSpace-Shopping-mall-be 루트 폴더로 이동
cd /path/to/BlankSpace-Shopping-mall-be

# 의존성 설치 (최초 1회)
npm install

# 서버 실행
npm start
```

### 3.2. AI Backend (Python/FastAPI)

AI 관련 서비스들은 모두 Docker 컨테이너로 관리됩니다.

**1. 서비스 실행**
```bash
# BlankSpace-Shopping-mall-be 루트 폴더에서 AI 백엔드 폴더로 이동
cd backend

# Docker 컨테이너 빌드 및 실행 (백그라운드)
docker-compose up -d --build
```

**2. LLM 모델 다운로드 (최초 1회 수동 실행)**

AI 서버가 사용하는 LLM 모델을 수동으로 다운로드해야 합니다. 위 `docker-compose up` 명령어로 서비스가 완전히 실행된 후, 새 터미널을 열고 아래 명령어를 실행하세요.

```bash
# 실행 중인 ollama_server 컨테이너에 접속하여 경량화된 llama3 모델을 다운로드합니다.
# (llama3:8b-instruct-q4_K_M: 대화형에 최적화되고, 용량을 줄여 효율성을 높인 버전)
docker exec -it ollama_server ollama pull llama3:8b-instruct-q4_K_M
```

모델 다운로드는 인터넷 환경에 따라 수 분이 소요될 수 있습니다. `Success` 메시지가 나타나면 모든 AI 백엔드 준비가 완료된 것입니다.

**3. LLM API 서버 수동 실행 (Bash 모드)**

LLM API 서버는 이제 자동으로 `llm_service.py`를 실행하지 않고 bash 상태로 시작됩니다. 이를 통해 개발 및 디버깅 작업을 더 유연하게 수행할 수 있습니다.

```bash
# llm_api_server 컨테이너에 접속
docker exec -it llm_api_server bash

# 컨테이너 내부에서 서비스 수동 실행
uvicorn llm_service:app --host 0.0.0.0 --port 8001
```

필요에 따라 다른 Python 스크립트를 실행하거나 파일을 수정한 후 서비스를 시작할 수 있습니다.

### 3.3. Frontend (React)

```bash
# frontend 폴더로 이동
cd /path/to/BlankSpace-Shopping-mall-fe

# 의존성 설치
npm install

# 개발 서버 실행
npm start
```

---

## 4. 최근 문제 및 해결 방안

### 4.1. RAG 시스템의 목걸이 상품 검색 문제

**문제 상황**: 
- 사용자가 "목걸이는 없어?"라고 질문했을 때, AI 어시스턴트가 데이터베이스에 있는 "Nickel Chain Necklace - Silver" 목걸이 상품을 찾지 못하고 "아쉽게도 현재 저희 데이터베이스에는 목걸이는 준비되어 있지 않습니다"라고 잘못된 응답을 반환했습니다.

**원인 분석**:
1. **데이터 연동 문제**: 현재 프로젝트 구조에서는 AI 백엔드 서버(`backend` 폴더)가 존재하지 않거나 접근할 수 없는 상태입니다. 따라서 RAG 시스템이 MongoDB의 상품 데이터를 ChromaDB에 임베딩하는 과정이 실행되지 않았을 가능성이 높습니다.

2. **임베딩 파이프라인 미실행**: `embedding_pipeline.py`가 실행되지 않아 최신 상품 데이터가 ChromaDB에 반영되지 않았을 수 있습니다. 특히 목걸이 상품이 최근에 추가되었다면 이런 문제가 발생할 수 있습니다.

3. **벡터 검색 정확도 문제**: 사용자의 "목걸이" 질문과 "Necklace" 상품 간의 다국어 매칭이 제대로 이루어지지 않았을 수 있습니다. 한국어 질문과 영어 상품명 간의 의미적 연결이 임베딩 모델에서 충분히 강하게 표현되지 않았을 가능성이 있습니다.

**해결 방안**:
1. **AI 백엔드 복구**: `backend` 폴더와 관련 Docker 서비스를 복구하여 RAG 시스템을 정상화해야 합니다. 현재 프로젝트 구조에서는 AI 백엔드가 분리되어 있거나 삭제된 상태로 보입니다.

2. **임베딩 파이프라인 실행**: AI 백엔드가 복구되면 `embedding_pipeline.py`를 실행하여 최신 상품 데이터를 ChromaDB에 임베딩해야 합니다.

3. **다국어 매칭 강화**: 한국어 "목걸이"와 영어 "Necklace" 간의 매칭을 강화하기 위해, 상품 데이터에 한국어 별칭이나 태그를 추가하는 것을 고려할 수 있습니다. 또는 더 성능이 좋은 다국어 임베딩 모델로 교체하는 방안도 검토할 수 있습니다.

4. **임시 해결책**: AI 백엔드 복구가 어렵다면, 현재 Node.js 백엔드에서 직접 MongoDB 쿼리를 통해 상품을 검색하는 간단한 키워드 검색 기능을 `llm.api.js`에 추가하여 임시로 대응할 수 있습니다.

### 4.2. 다음 단계

1. AI 백엔드 서버 코드 복구 또는 재구현
2. Docker 서비스 구성 복원
3. 임베딩 파이프라인 실행으로 최신 데이터 반영
4. 다국어 매칭 성능 개선

# Dependency

npm i express mongoose dotenv body-parser cors jsonwebtoken bcrypt nodemon