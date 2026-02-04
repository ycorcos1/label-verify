import { 
  HelpCircle, 
  FileCheck, 
  Layers, 
  AlertTriangle, 
  ImageOff, 
  Eye,
  Upload,
  ArrowRight,
  Info,
  CheckCircle,
  XCircle,
  FolderOpen,
  Scissors,
  Edit3
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

      {/* Single vs Batch Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600 dark:text-blue-500" aria-hidden="true" />
            Single vs Batch Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          {/* Single Mode */}
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold dark:bg-blue-900 dark:text-blue-300">
                1
              </span>
              Single Mode
            </h4>
            <div className="ml-8 space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>
                Use Single mode when verifying <strong>one application</strong> at a time. 
                All uploaded images are treated as belonging to the same label (e.g., front and back panels).
              </p>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Upload images
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                <span className="flex items-center gap-1.5 rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                  Enter application values (optional)
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                <span className="flex items-center gap-1.5 rounded bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  <FileCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Run Verification
                </span>
              </div>
            </div>
          </div>

          {/* Batch Mode */}
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold dark:bg-blue-900 dark:text-blue-300">
                2
              </span>
              Batch Mode
            </h4>
            <div className="ml-8 space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>
                Use Batch mode to verify <strong>multiple applications</strong> at once. 
                Upload all images and the app will automatically group them by filename when possible.
              </p>
              <p>
                Results appear progressively as each application completes. You can filter results 
                by status (Pass, Fail, Needs Review) and drill into details while processing continues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouping Guidance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-amber-600 dark:text-amber-500" aria-hidden="true" />
            Image Grouping Guidance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            In Batch mode, images with similar filenames are automatically grouped into applications.
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
            {/* Images Not Stored */}
            <li className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/50">
                <ImageOff className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Images Are Not Stored</h4>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  Uploaded images are processed transiently and are not saved. Reports contain extracted 
                  data only. To re-verify a label, you must re-upload the images.
                </p>
              </div>
            </li>

            {/* Bold Manual Confirm */}
            <li className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Bold Text Requires Manual Confirmation</h4>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  The Government Warning statement must have &quot;GOVERNMENT WARNING:&quot; in bold. 
                  OCR cannot reliably detect bold formatting, so this must be visually confirmed by the reviewer. 
                  The app will mark this as &quot;Manual confirm&quot; in results.
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
                  required wording. Any deviation (except whitespace) will cause a Fail status.
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
                  Download reports as JSON to preserve them.
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
              <span>Name files descriptively (e.g., &quot;bourbon_front.jpg&quot;) for better auto-grouping in Batch mode.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
              <span>Download reports as JSON for permanent records since local storage can be cleared.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
