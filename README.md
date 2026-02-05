# LabelVerify

An AI-powered alcohol label compliance verification tool that helps agents verify label submissions by extracting key fields from label images and validating them against regulatory requirements.

---

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
  - [Approach](#approach)
  - [Assumptions](#assumptions)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [High-Level Data Flow](#high-level-data-flow)
  - [Component Structure](#component-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
  - [Building for Production](#building-for-production)
- [Usage](#usage)
  - [Single Mode](#single-mode)
  - [Batch Mode](#batch-mode)
- [Validation Rules](#validation-rules)
  - [Government Warning Strictness](#government-warning-strictness)
  - [Field Comparisons](#field-comparisons)
  - [Label-Only Mode](#label-only-mode)
- [Reports](#reports)
  - [Local Persistence](#local-persistence)
  - [Downloads](#downloads)
  - [Images Not Stored](#images-not-stored)
- [Performance Considerations](#performance-considerations)
- [Trade-offs Made](#trade-offs-made)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

---

## Overview

LabelVerify is a standalone web application designed for alcohol label compliance agents. It automates the verification of label artwork by:

1. **Extracting** key fields from uploaded label images using AI-powered vision OCR
2. **Validating** extracted values against regulatory requirements (especially the government health warning)
3. **Comparing** label values against user-provided application values (optional)
4. **Producing** clear Pass/Fail/Needs Review outcomes with detailed explanations
5. **Saving** reports locally for later review and download

The tool is designed to be fast (~5 seconds per application), simple to use, and batch-friendly for peak season workloads.

---

## The Problem

Label review is a repetitive matching task: compliance agents compare label artwork to what appears in the application (brand name, ABV, government warning statement, etc.). Manual review is:

- **Time-consuming**: Each label requires careful examination of multiple fields
- **Error-prone**: Human fatigue leads to missed discrepancies
- **Inconsistent**: Different reviewers may apply rules differently

A previous pilot solution failed because it took ~30-40 seconds per label, causing agents to revert to manual review. The adoption threshold is explicit: **if results don't return in ~5 seconds, agents won't use it**.

Peak season can involve **200-300 label applications**, making batch processing essential.

---

## The Solution

### Approach

LabelVerify takes a pragmatic approach to label verification:

1. **AI-Powered Extraction**: Uses OpenAI's GPT-4 Vision models to extract structured data from label images, enforcing a strict JSON schema for reliable parsing

2. **Strict Government Warning Validation**: Implements word-for-word validation of the canonical government warning statement with:
   - Whitespace normalization
   - Uppercase prefix verification ("GOVERNMENT WARNING:")
   - Visual formatting observations (bold detection, font size, visibility)

3. **Flexible Field Comparison**: Supports both strict matching and normalized comparison with:
   - Case/punctuation normalization for text fields
   - Unit conversion for numeric fields (ABV/proof, ml/L)
   - Accent/diacritic normalization for brand names

4. **Progressive Batch Processing**: Uses controlled concurrency to process multiple applications simultaneously while keeping the UI responsive

5. **Local-First Storage**: Reports are saved in the browser using IndexedDB, ensuring privacy and eliminating server-side storage requirements

### Assumptions

- **Users have access to clear label images**: The accuracy of extraction depends on image quality. Blurry, skewed, or low-resolution images may produce lower confidence results.

- **Labels follow standard U.S. TTB formatting**: The government warning validation is based on the canonical U.S. government health warning statement.

- **Network connectivity is available**: OpenAI API calls require internet access. The app handles network failures gracefully with retry options.

- **Modern browser with IndexedDB support**: Reports are stored locally using IndexedDB (supported in all modern browsers).

- **One application = one or more related images**: Front/back/side panels of the same label should be grouped together for accurate verification.

---

## Key Features

- **Dual Verification Modes**: Single application or batch processing
- **Smart Auto-Grouping**: Automatically groups related images by filename pattern
- **Manual Grouping Tools**: Group, split, and rename application groups as needed
- **AI-Powered OCR**: Extracts brand, class/type, ABV, net contents, producer, country, and government warning
- **Strict Warning Validation**: Word-for-word verification of government health warning
- **Visual Formatting Detection**: Observes bold formatting, font size, and visibility of warning text
- **Field Comparison**: Compares extracted values against user-provided application values
- **Label-Only Mode**: Validates labels without requiring expected values
- **Progressive Results**: See results as each application completes
- **Local Report Storage**: Reports saved in browser for later access
- **PDF & JSON Export**: Download reports in multiple formats
- **Error Recovery**: Per-application retry for failed extractions

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.x (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS 4.x |
| **AI/OCR** | OpenAI GPT-4 Vision API |
| **Schema Validation** | Zod |
| **File Upload** | react-dropzone |
| **Concurrency** | p-limit |
| **Icons** | Lucide React |
| **PDF Generation** | @react-pdf/renderer |
| **Local Storage** | IndexedDB |

---

## Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                           User Interface                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Upload      │  │  Application │  │  Results Display         │  │
│  │  Dropzone    │  │  Values Form │  │  (Summary + Details)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────────┘  │
│         │                 │                        ▲                 │
│         ▼                 ▼                        │                 │
│  ┌───────────────────────────────────────┐        │                 │
│  │         Verification Orchestrator      │────────┘                 │
│  │  (useVerification / useBatchVerify)   │                          │
│  └───────────────┬───────────────────────┘                          │
└──────────────────│──────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Layer                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  /api/extract                                                  │  │
│  │  - Validates image (type, size)                                │  │
│  │  - Calls OpenAI Vision API                                     │  │
│  │  - Parses response with Zod schema                             │  │
│  │  - Returns structured extraction                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Processing Pipeline                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Merge       │  │  Validation  │  │  Result                  │  │
│  │  Extractions │─▶│  Engine      │─▶│  Computation             │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                      │               │
│                                                      ▼               │
│                                        ┌──────────────────────────┐  │
│                                        │  Report Store            │  │
│                                        │  (IndexedDB)             │  │
│                                        └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── api/extract/              # OCR extraction endpoint
│   ├── verify/                   # Verification page
│   ├── reports/                  # Report history
│   │   └── [reportId]/           # Individual report view
│   └── help/                     # Usage documentation
├── components/
│   ├── layout/                   # Header, navigation
│   ├── ui/                       # Reusable UI primitives
│   │   ├── Button, Card, Badge   # Basic components
│   │   ├── StatusBadge           # Pass/Fail/NeedsReview indicators
│   │   ├── ImagePreviewModal     # Full-size image viewer
│   │   └── ErrorBanner           # Error display
│   ├── verify/                   # Verification-specific components
│   │   ├── UploadDropzone        # Image upload
│   │   ├── ThumbnailList         # Image previews
│   │   ├── ApplicationValuesForm # Expected values input
│   │   ├── SingleVerifyView      # Single mode UI
│   │   ├── BatchVerifyView       # Batch mode UI
│   │   └── ResultsDetails        # Field-by-field results
│   └── pdf/                      # PDF report generation
└── lib/
    ├── types/                    # TypeScript interfaces
    ├── utils/
    │   ├── mergeExtractions      # Multi-image extraction merge
    │   ├── reportStore           # IndexedDB persistence
    │   └── imageResize           # Client-side image optimization
    └── validation/
        └── validators            # Field comparison & warning validation
```

---

## Getting Started

### Prerequisites

- **Node.js** 18.x or later (20.x recommended)
- **npm** or yarn
- **OpenAI API key** with access to GPT-4 Vision models

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd yahavcorcos-itspecialist-takehome
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Required: OpenAI API key for vision-based OCR
OPENAI_API_KEY=sk-your-api-key-here

# Optional: Override the default model (gpt-4o-mini)
# OPENAI_MODEL=gpt-4o
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | Your OpenAI API key with GPT-4 Vision access |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model to use (`gpt-4o-mini` for speed, `gpt-4o` for accuracy) |

### Running Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm run start
```

For deployment on Vercel, set the `OPENAI_API_KEY` environment variable in your project settings.

---

## Usage

### Single Mode

Best for reviewing one application with one or more label images (front, back, side panels).

1. **Upload Images**: Drag and drop or click to select label images
2. **Enter Application Values** (optional): Fill in expected values from the application form
3. **Run Verification**: Click the button to start processing
4. **Review Results**: See the overall status and field-by-field breakdown
5. **View Details**: Expand to see extracted values, comparisons, and the government warning status

### Batch Mode

Best for processing multiple applications at once during peak season.

1. **Upload All Images**: Drop all label images from multiple applications
2. **Review Grouping**: The app auto-groups images by filename pattern
   - `BrandName_front.jpg` and `BrandName_back.jpg` → grouped together
   - Non-descriptive names (IMG_1234.jpg) remain ungrouped
3. **Adjust Groups** (if needed):
   - Select images and click "Group Selected" to create a group
   - Click "Split" on a group to separate images
   - Rename groups for clarity
4. **Run Batch Verification**: Process all applications with controlled concurrency
5. **Filter Results**: View All, Pass, Fail, Needs Review, or Error
6. **Review Details**: Click any application to see full details
7. **Retry Failed**: Re-run extraction for any failed applications

---

## Validation Rules

### Government Warning Strictness

The government warning validation is the most critical check. It validates:

**1. Wording Match** (Strict)
- Must match the canonical warning word-for-word
- Whitespace is normalized (multiple spaces/newlines collapsed to single space)
- Case variations result in Needs Review or Fail

**Canonical Warning Text:**
> GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.

**2. Uppercase Prefix**
- "GOVERNMENT WARNING:" must appear in uppercase
- Missing or lowercase prefix fails validation

**3. Visual Formatting** (Observation-based)
- **Bold Detection**: GPT-4 Vision observes if "GOVERNMENT WARNING:" has thicker letter strokes
- **Font Size**: Reports if warning text appears very small relative to label text
- **Visibility**: Notes overall prominence (prominent, moderate, subtle)

**Note**: Bold formatting detection requires manual confirmation as OCR cannot guarantee bold detection accuracy.

### Field Comparisons

| Field | Comparison Type | Notes |
|-------|-----------------|-------|
| Brand Name | Text (normalized) | Allows case/punctuation/accent differences |
| Class/Type | Text (normalized) | e.g., "Bourbon Whiskey" = "bourbon whiskey" |
| ABV/Proof | Numeric | Converts between ABV% and Proof (÷2) |
| Net Contents | Numeric | Converts between ml/L/oz |
| Producer | Text (normalized) | Allows formatting variations |
| Country | Text (normalized) | "Product of USA" matches "Made in USA" |

**Status Outcomes:**
- **Pass**: Values match (with normalization)
- **Fail**: Values differ significantly
- **Needs Review**: Close but not exact, or conflicting values from multiple images
- **Missing**: Value not found on label
- **Not Provided**: No expected value entered (label-only mode)

### Label-Only Mode

When application values are not provided:

- Validation still runs for presence/format
- Government warning is fully validated against the canonical text
- Field statuses show "Not Provided" for expected values
- Useful for quick label checks without an application reference

---

## Reports

### Local Persistence

Reports are automatically saved to your browser's IndexedDB after each verification run. This provides:

- **Privacy**: Data never leaves your device
- **Persistence**: Reports survive page refreshes and browser restarts
- **Capacity**: IndexedDB handles large reports better than localStorage

Access saved reports via the **Reports** page in the navigation.

### Downloads

Reports can be exported in two formats:

1. **JSON**: Full structured data for programmatic use or archival
2. **PDF**: Formatted report with visual status indicators (via @react-pdf/renderer)

### Images Not Stored

**Important**: Uploaded images are processed transiently and are NOT stored in reports. This is a deliberate privacy decision.

- Reports contain extracted text and validation results only
- To re-run verification, images must be re-uploaded
- The report detail view displays a clear banner about this limitation

---

## Performance Considerations

### Controlled Concurrency

Batch processing uses `p-limit` to control concurrent API calls:

- **2-4 concurrent applications** by default
- Prevents rate limiting from OpenAI
- Keeps the UI responsive during processing

### Client-Side Image Optimization

Before sending images to the API:

1. **Resize**: Large images are scaled down using Canvas API
2. **Compress**: JPEG quality is reduced to decrease payload size
3. **Base64 Encoding**: Images are sent as data URLs

This reduces:
- Upload time
- API processing time
- Risk of timeouts

### Progressive Results

Results appear as each application completes rather than waiting for all:

- Users can start reviewing while processing continues
- Failed applications don't block successful ones
- Filtering is available during and after processing

---

## Trade-offs Made

| Decision | Trade-off | Rationale |
|----------|-----------|-----------|
| **Local-only storage** | No cross-device sync | Simplicity, privacy, no backend required |
| **No image storage** | Must re-upload to re-verify | Privacy, storage limits, regulatory compliance |
| **Bold = manual confirm** | Can't guarantee bold detection | OCR technology limitation; safety first |
| **No COLA integration** | Manual data entry for expected values | Scope limitation; integration would require auth/API access |
| **gpt-4o-mini default** | Slightly lower accuracy | Much faster (~2-3x), significantly cheaper; gpt-4o available as option |
| **IndexedDB over server DB** | Data on single device only | Zero server cost, no auth complexity, privacy |
| **Strict warning validation** | May flag acceptable variations | Regulatory compliance requires exactness |

---

## Known Limitations

1. **Bold Detection Uncertainty**: OCR cannot reliably detect bold formatting. The app marks this for manual confirmation.

2. **Image Quality Dependency**: Poor quality images (blurry, glare, skewed, low resolution) produce lower confidence results.

3. **English Only**: Government warning validation is specific to U.S. TTB requirements.

4. **Single Device**: Reports are stored locally and not synced across devices or browsers.

5. **API Dependency**: Requires OpenAI API access. Network issues or API outages affect functionality.

6. **Browser Storage Limits**: Very large numbers of reports may approach browser storage quotas (typically 50MB+).

---

## Future Improvements

- **Multi-language Support**: Add warning validation for other countries
- **COLA Integration**: Direct connection to TTB systems for expected values
- **Cloud Sync**: Optional cloud storage for cross-device access
- **Improved Bold Detection**: Custom vision fine-tuning for formatting detection
- **Batch Application Values**: Upload expected values via CSV for batch processing
- **Audit Trail**: Track who verified what and when
- **Confidence Thresholds**: Configurable thresholds for automatic Pass/Fail
- **Image Quality Scoring**: Pre-check images and suggest re-upload
- **Offline Support**: Cache for limited offline functionality
