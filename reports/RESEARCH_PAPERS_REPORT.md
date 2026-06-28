# Research Papers to Project Mapping Report

This report considers only the PDFs inside:

`C:\Users\harsh\OneDrive\Desktop\project\asknlearn-v2\RESEARCH PAPERS`

## Scope

The project already implements a practical AI-assisted learning platform with:

- multimodal study input
- AI-generated summaries
- flashcards
- MCQ and other quiz formats
- memory map / mind map generation
- tutor chat
- saved library and progress tracking

This report maps those implemented features to the research papers available in the local `RESEARCH PAPERS` folder.

## Papers Identified

### 2.pdf

This PDF is identifiable from its internal table of contents as a paper centered on **GraphAIR**.

Observed section titles include:

- `The Proposed Method: GraphAIR`
- `Modeling the Neighborhood Interaction with Residual Functions`
- `Learning the Parameters of GraphAIR`
- `Model Architecture and Complexity Analysis`

Project relevance:

- supports the idea of representing knowledge as a structured graph rather than only plain text
- aligns with the project's **Mermaid memory map / mind map** feature
- motivates converting generated study content into linked concept structures

What the project has done:

- implemented AI-generated memory maps in Mermaid format
- added mind map rendering and interaction controls
- uses graph-style visual study support for topic understanding

What is still simpler than the paper:

- the current project uses Mermaid-based concept maps, not a learned graph neural architecture
- it is a visualization-oriented educational adaptation, not a graph learning research implementation

### 3.pdf

This PDF is identifiable from its internal table of contents as a **deep learning survey / workflow paper**.

Observed section titles include:

- `High Level Considerations for Deep Learning`
- `Templates for Deep Learning in Scientific Settings`
- `Deep Learning Workflow`
- `Deep Learning Libraries and Resources`
- `Standard Neural Network Models and Tasks`
- `Convolutional Neural Networks`

Project relevance:

- supports the overall AI pipeline design
- supports the use of modern deep learning components for:
  - content understanding
  - OCR-enabled image processing
  - speech/audio processing
  - multimodal study material generation

What the project has done:

- built a pipeline that accepts document, image, text, URL, audio, and video inputs
- uses AI model selection for content generation
- supports local or integrated transcription flow for media inputs
- structures the app around a practical AI workflow rather than a single isolated feature

What is still simpler than the paper:

- the project is an application platform, not a general-purpose deep learning framework
- it uses pretrained services and libraries rather than training its own deep models from scratch

### 4.pdf

This PDF is identifiable from embedded links as:

`A Survey of OCR Applications`

Project relevance:

- directly supports image and screenshot understanding
- justifies OCR-style text extraction from image-based learning content
- aligns strongly with AskNLearn input support for screenshots and image uploads

What the project has done:

- supports image-based study ingestion
- extracts text from visual documents/screenshots through OCR-capable reading flow
- allows those extracted contents to be converted into:
  - summaries
  - flashcards
  - quizzes
  - mind maps

This is one of the clearest paper-to-feature matches in the project.

### 5.pdf

This PDF is clearly identifiable as:

`A Systematic Review of Automatic Question Generation for Educational Purposes`

Observed sections include:

- `Generation Tasks`
- `Generation Methods`
- `Question Construction`
- `Difficulty`
- `Feedback Generation`
- `Assembling Exams from the Generated Questions`
- `Enriching Question Forms and Structures`

Project relevance:

- this is the strongest direct match to the project
- the AskNLearn module is fundamentally an **automatic educational content and question generation system**

What the project has done:

- generates multiple educational content types from source material
- supports:
  - summary
  - flashcards
  - MCQ
  - fill in the blanks
  - true/false
  - yes/no
  - WH questions
  - memory map
- lets the user choose content types and quantity
- stores generated content in the library
- supports quiz-like interaction and feedback

What this means academically:

- the project operationalizes the AQG literature into a usable application
- it goes beyond single-question generation by combining several study formats in one workflow

## Papers With Partial or Unclear Extraction

### 1.pdf

This PDF could not be reliably identified from machine-readable metadata in the current environment.

What can still be said:

- it appears to be a formatted academic PDF with both text and figure content
- because its text was not extractable here, I am not making a strong claim about its exact contribution

### 6.pdf

This PDF could not be reliably identified from machine-readable metadata either.

Observed clues:

- SSRN / ICAESMT 2019 link
- author emails embedded in the PDF

What can still be said:

- it is likely an academic conference-style paper
- but I am intentionally not mapping project claims to it without reliable extraction

## Consolidated Interpretation

Based only on the papers that could be identified from the local folder, the project has already implemented research-aligned features in four major areas:

### 1. OCR and visual-content understanding

Supported mainly by `4.pdf`.

Implemented in the project as:

- screenshot/image upload support
- text extraction from visual study material
- conversion of extracted text into learnable content

### 2. Automatic question generation for education

Supported mainly by `5.pdf`.

Implemented in the project as:

- multi-format question generation
- educational quiz construction
- learner-oriented output formats
- configurable generation counts

### 3. Graph-based concept representation

Supported conceptually by `2.pdf`.

Implemented in the project as:

- Mermaid memory maps
- concept-structure visualization for revision

### 4. Deep learning workflow for multimodal educational AI

Supported mainly by `3.pdf`.

Implemented in the project as:

- integrated AI pipeline
- multimodal study ingestion
- media-to-text processing workflow
- practical use of modern AI tooling inside a learning product

## What the Project Can Honestly Claim

The project can confidently claim that it is inspired by and aligned with research in:

- automatic question generation
- OCR applications
- graph-based knowledge representation
- deep learning workflow for multimodal AI systems

The project should **not** claim that it reproduces those research papers exactly.

A safer and more accurate academic claim is:

> The project translates ideas from research on OCR, automatic question generation, deep learning workflows, and graph-based knowledge representation into a practical AI-powered study assistant.

## Strongest Research-Backed Features in This Project

The most research-grounded parts of the current project are:

1. AI-generated quiz and study content
2. OCR-driven content extraction from images/screenshots
3. concept visualization through memory maps
4. multimodal processing pipeline for educational content

## Recommended Academic Positioning

If this is used in a report, presentation, or viva, the best framing is:

- **Core contribution:** an AI-powered study assistant that transforms raw study material into interactive learning assets
- **Research grounding:** AQG, OCR, graph-based concept structuring, and deep learning-based multimodal processing
- **Practical novelty:** combining all of these in one full-stack educational platform with persistence, interaction, and progress tracking

## Note

This report was prepared using only the local PDFs in the `RESEARCH PAPERS` folder and the current project codebase. Two PDFs, `1.pdf` and `6.pdf`, could not be reliably identified from machine-readable extraction in the current environment, so they were not used for strong claims.
