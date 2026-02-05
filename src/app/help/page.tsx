import { 
  HelpCircle, 
  FileCheck, 
  Layers, 
  AlertTriangle, 
  Eye,
  Upload,
  ArrowRight,
  Info,
  CheckCircle,
  XCircle,
  FolderOpen,
  Scissors,
  Edit3,
  Download,
  FileText,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

export default function HelpPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Help
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Learn how to use LabelVerify for label compliance verification.
        </p>
      </div>

      {/* What the App Does */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-500" aria-hidden="true" />
            What LabelVerify Does
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            LabelVerify helps alcohol label compliance agents verify label submissions quickly and accurately. 
            The app extracts key information from label images using AI-powered OCR and validates them against 
            required rules and optional application values.
          </p>
          <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Key Fields Extracted</h4>
            <ul className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                Brand Name
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                Class/Type
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                Alcohol Content (ABV/Proof)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                Net Contents
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                Producer/Bottler
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                Country of Origin
              </li>
              <li className="flex items-center gap-2 col-span-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                Government Health Warning Statement
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Verification Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600 dark:text-blue-500" aria-hidden="true" />
            Verification Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <p className="text-zinc-600 dark:text-zinc-400">
            LabelVerify uses a unified workflow that handles both single and multiple applications seamlessly.
            Simply upload your images and the app takes care of the rest.
          </p>

          {/* Step 1: Upload */}
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold dark:bg-blue-900 dark:text-blue-300">
                1
              </span>
              Upload Images
            </h4>
            <div className="ml-8 space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>
                Upload one or more label images. You can upload images for a single application 
                (e.g., front and back of one label) or multiple applications at once.
              </p>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Select files
                </span>
                <span className="text-zinc-400">or</span>
                <span className="flex items-center gap-1.5 rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  Drag & drop
                </span>
              </div>
            </div>
          </div>

          {/* Step 2: Auto-Grouping */}
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold dark:bg-blue-900 dark:text-blue-300">
                2
              </span>
              Automatic Grouping
            </h4>
            <div className="ml-8 space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>
                Images are automatically grouped into applications based on filename patterns.
                For example, <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">bourbon_front.jpg</code> and{' '}
                <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">bourbon_back.jpg</code> will be grouped together.
              </p>
              <p>
                You can manually adjust groups before running verification using the grouping tools.
              </p>
            </div>
          </div>

          {/* Step 3: Optional Values */}
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold dark:bg-blue-900 dark:text-blue-300">
                3
              </span>
              Enter Application Values (Optional)
            </h4>
            <div className="ml-8 space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>
                Optionally enter expected application values (brand name, class type, etc.) to compare 
                against the extracted data. This helps catch discrepancies between application forms and labels.
              </p>
            </div>
          </div>

          {/* Step 4: Run Verification */}
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold dark:bg-blue-900 dark:text-blue-300">
                4
              </span>
              Run Verification
            </h4>
            <div className="ml-8 space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>
                Click &quot;Run Verification&quot; to start the process. Results appear progressively as 
                each application completes. You can filter by status and drill into details while 
                processing continues.
              </p>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 rounded bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  <FileCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Run Verification
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                <span className="flex items-center gap-1.5 rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  View Results
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                <span className="flex items-center gap-1.5 rounded bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download PDF
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouping Guidance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-amber-600 dark:text-amber-500" aria-hidden="true" />
            Image Grouping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Images with similar filenames are automatically grouped into applications.
            You can always adjust groups manually before running verification.
          </p>
          
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-200 dark:divide-zinc-700">
            {/* Auto-grouping */}
            <div className="p-4">
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Auto-Grouping</h4>
              <p className="mb-2">
                Images are grouped when filenames share a common base name and differ only by panel indicators:
              </p>
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded p-3 font-mono text-xs">
                <div className="text-emerald-600 dark:text-emerald-400">
                  <span className="text-zinc-500 dark:text-zinc-500">Example: </span>
                  bourbon_front.jpg, bourbon_back.jpg 
                  <ArrowRight className="inline h-3 w-3 mx-2" aria-hidden="true" />
                  Grouped as &quot;bourbon&quot;
                </div>
              </div>
            </div>

            {/* Non-descriptive filenames */}
            <div className="p-4">
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" aria-hidden="true" />
                Non-Descriptive Filenames
              </h4>
              <p className="mb-2">
                Generic filenames (e.g., IMG_1234, DSC_0001) are not auto-grouped to prevent mistakes. 
                Each image stays separate by default.
              </p>
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded p-3 font-mono text-xs">
                <div className="text-amber-600 dark:text-amber-400">
                  <span className="text-zinc-500 dark:text-zinc-500">Example: </span>
                  IMG_1234.jpg, IMG_1235.jpg 
                  <ArrowRight className="inline h-3 w-3 mx-2" aria-hidden="true" />
                  Kept separate
                </div>
              </div>
            </div>

            {/* Manual grouping */}
            <div className="p-4">
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Manual Grouping Tools</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <FolderOpen className="h-4 w-4 mt-0.5 text-zinc-400" aria-hidden="true" />
                  <span><strong>Group Selected:</strong> Select multiple images and click &quot;Group Selected&quot; to combine them into one application.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Scissors className="h-4 w-4 mt-0.5 text-zinc-400" aria-hidden="true" />
                  <span><strong>Split Group:</strong> If images were incorrectly grouped, use &quot;Split&quot; to separate them back into individual images.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Edit3 className="h-4 w-4 mt-0.5 text-zinc-400" aria-hidden="true" />
                  <span><strong>Rename:</strong> Give groups a meaningful name for easier identification.</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports & Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-500" aria-hidden="true" />
            Reports & Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Verification results are automatically saved as reports. Each application gets its own 
            report, identified by the brand name extracted from the label.
          </p>
          
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-200 dark:divide-zinc-700">
            {/* Report Storage */}
            <div className="p-4">
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-blue-500" aria-hidden="true" />
                Report Storage
              </h4>
              <p>
                Reports are saved in your browser&apos;s local storage along with image thumbnails for reference.
                View past reports from the Reports page to review verification history.
              </p>
            </div>

            {/* PDF Export */}
            <div className="p-4">
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <Download className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                PDF Export
              </h4>
              <p>
                Download any report as a styled PDF document for sharing or archival. The PDF includes 
                all verification details, field comparisons, and source image thumbnails.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" aria-hidden="true" />
            Limitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4 text-sm">
            {/* Bold Detection */}
            <li className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Bold Text Detection</h4>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  The Government Warning statement must have &quot;GOVERNMENT WARNING:&quot; in bold. 
                  LabelVerify uses AI vision to detect bold formatting and will show:
                </p>
                <ul className="mt-2 ml-4 space-y-1 text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                    <span><strong>&quot;Likely Bold&quot;</strong> when AI detects bold formatting</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                    <span><strong>&quot;Possibly Not Bold&quot;</strong> when AI doesn&apos;t detect bold</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                    <span><strong>&quot;Manual Confirm&quot;</strong> when AI can&apos;t determine</span>
                  </li>
                </ul>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  When manual confirmation is needed, a visual verification prompt will appear with 
                  an image thumbnail for quick reference.
                </p>
              </div>
            </li>

            {/* Warning Strictness */}
            <li className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/50">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Strict Government Warning Validation</h4>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  The Government Health Warning statement is validated word-for-word against the canonical 
                  required wording. Any deviation (except whitespace and accents) will cause a Fail status.
                </p>
              </div>
            </li>

            {/* No COLA Integration */}
            <li className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Info className="h-4 w-4 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">No COLA Integration</h4>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  This is a standalone verification tool. It does not connect to COLA or other 
                  internal systems. Application values must be entered manually if comparison is desired.
                </p>
              </div>
            </li>

            {/* Local Storage */}
            <li className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Reports Stored Locally</h4>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  Reports are saved in your browser&apos;s local storage. They are not synced across 
                  devices or browsers. Clearing browser data will delete all saved reports. 
                  Download reports as PDF or JSON to preserve them.
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-500" aria-hidden="true" />
            Tips for Best Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
              <span>Upload both front and back label images for complete verification, especially to capture the Government Warning.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
              <span>Use clear, well-lit images. Avoid glare, blur, or heavy skew for more accurate OCR.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
              <span>Name files descriptively (e.g., &quot;bourbon_front.jpg&quot;) for better auto-grouping.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
              <span>Download reports as PDF for professional documentation or JSON for data preservation.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
              <span>When bold status shows &quot;Manual Confirm&quot;, click the image thumbnail to visually verify the warning text formatting.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
