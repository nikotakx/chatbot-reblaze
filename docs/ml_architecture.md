# Machine Learning Architecture

```mermaid
graph TD
    %% Document Processing
    subgraph DocumentProcessing[Document Processing Pipeline]
        RawDocs[Raw Documentation Files]
        ParsedDocs[Parsed Documentation]
        Chunks[Text Chunks]
        
        RawDocs -->|Markdown Parser| ParsedDocs
        ParsedDocs -->|Text Chunking| Chunks
    end

    %% Vector Generation
    subgraph VectorGeneration[Vector Generation]
        Embeddings[Document Embeddings]
        VectorDB[(Vector Database)]
        
        Chunks -->|OpenAI Embeddings API| Embeddings
        Embeddings -->|Store| VectorDB
    end

    %% Query Processing
    subgraph QueryProcessing[Query Processing]
        UserQuery[User Query]
        QueryEmbedding[Query Embedding]
        RelevantDocs[Relevant Documents]
        
        UserQuery -->|OpenAI Embeddings API| QueryEmbedding
        QueryEmbedding -->|Semantic Search| VectorDB
        VectorDB -->|Retrieve| RelevantDocs
    end

    %% AI Response Generation
    subgraph ResponseGeneration[Response Generation]
        Context[Context Assembly]
        AIPrompt[AI Prompt Construction]
        Response[AI Response]
        
        RelevantDocs -->|Combine| Context
        Context -->|Format| AIPrompt
        AIPrompt -->|OpenAI Chat API| Response
    end

    %% Real-time Updates
    subgraph RealtimeUpdates[Real-time Updates]
        NewContent[New Documentation]
        UpdatePipeline[Update Pipeline]
        
        NewContent -->|Detect Changes| UpdatePipeline
        UpdatePipeline -->|Process| DocumentProcessing
    end

    %% Enhancement Features
    subgraph EnhancementFeatures[Enhancement Features]
        CodeExplanation[Code Explanation]
        ConceptClarification[Concept Clarification]
        ExampleGeneration[Example Generation]
        
        Response --> CodeExplanation
        Response --> ConceptClarification
        Response --> ExampleGeneration
    end

    %% Styling
    classDef processing fill:#e1f5fe,stroke:#01579b
    classDef vector fill:#e8f5e9,stroke:#1b5e20
    classDef query fill:#fce4ec,stroke:#880e4f
    classDef response fill:#fff3e0,stroke:#e65100
    classDef realtime fill:#f3e5f5,stroke:#4a148c
    classDef features fill:#e0f2f1,stroke:#004d40

    class DocumentProcessing processing
    class VectorGeneration vector
    class QueryProcessing query
    class ResponseGeneration response
    class RealtimeUpdates realtime
    class EnhancementFeatures features
```

## ML Flow Description

### Document Processing Pipeline
1. **Raw Documentation Intake**: System ingests documentation files from various sources
2. **Parsing**: Converts raw documentation into structured format
3. **Chunking**: Breaks down documents into optimal-sized chunks for embedding

### Vector Generation Process
1. **Embedding Creation**: Generates vector embeddings using OpenAI's embedding model
2. **Vector Storage**: Stores embeddings in PostgreSQL with pgvector extension
3. **Index Management**: Maintains efficient vector indices for quick similarity search

### Query Processing Flow
1. **Query Vectorization**: Converts user queries into vector embeddings
2. **Semantic Search**: Performs similarity search against stored document embeddings
3. **Document Retrieval**: Fetches most relevant documentation chunks

### AI Response Generation
1. **Context Assembly**: Combines relevant documentation chunks
2. **Prompt Engineering**: Constructs effective prompts for the AI model
3. **Response Generation**: Uses OpenAI's Chat API to generate helpful responses

### Real-time Update System
1. **Change Detection**: Monitors for documentation updates
2. **Incremental Processing**: Updates only changed content
3. **Index Refresh**: Maintains vector index freshness

### Enhancement Features
1. **Code Explanation**: AI-powered code analysis and explanation
2. **Concept Clarification**: Detailed explanations of technical concepts
3. **Example Generation**: Dynamic generation of relevant examples
