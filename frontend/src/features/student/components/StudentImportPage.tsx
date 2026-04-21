// frontend/src/features/student/components/StudentImportPage.tsx
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog'
import { Button } from '../../../components/ui/button'
import {
  studentApi,
  extractErrorMessage,
  type ParseImportResult,
  type ImportStudentsResult,
} from '../api'

type PageState = 'upload' | 'parsed' | 'imported'

export default function StudentImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pageState, setPageState] = useState<PageState>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseImportResult | null>(null)
  const [importResult, setImportResult] = useState<ImportStudentsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    if (selected && selected.size > 5 * 1024 * 1024) {
      setFileError('File exceeds the 5 MB limit. Please reduce the file size.')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setFile(selected)
    setFileError(null)
    setParseResult(null)
    setPageState('upload')
  }

  async function handleParse() {
    if (!file) {
      setFileError('Please select a file before parsing.')
      return
    }
    setLoading(true)
    try {
      const res = await studentApi.parseImport(file)
      setParseResult(res.data)
      setPageState('parsed')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function handleChooseDifferent() {
    setFile(null)
    setParseResult(null)
    setFileError(null)
    setPageState('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleConfirmClick() {
    if (!parseResult) return
    if (parseResult.invalid > 0 || parseResult.alreadyEnrolled > 0) {
      setConfirmOpen(true)
    } else {
      void runImport()
    }
  }

  async function runImport() {
    if (!file) return
    setConfirmOpen(false)
    setLoading(true)
    try {
      const res = await studentApi.importStudents(file)
      setImportResult(res.data)
      setPageState('imported')
      toast.success(`Import complete — ${res.data.imported} student(s) enrolled.`)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function handleImportAnother() {
    setFile(null)
    setParseResult(null)
    setImportResult(null)
    setFileError(null)
    setPageState('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const skipCount = (parseResult?.invalid ?? 0) + (parseResult?.alreadyEnrolled ?? 0)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-on-surface">Import Students</h1>
        <p className="font-sans text-sm font-medium text-muted-foreground mt-1">
          Upload a university Excel export to enroll students into the active semester.
        </p>
      </div>

      {/* State 1 — Upload */}
      {pageState === 'upload' && (
        <div className="bg-surface-container-low rounded-lg p-8 space-y-4 max-w-xl">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full border-2 border-dashed border-surface-container-highest rounded-lg p-10 flex flex-col items-center gap-3 hover:bg-surface-container transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-sans text-sm font-medium text-on-surface">
                {file ? file.name : 'Click to select a file'}
              </p>
              <p className="font-sans text-xs text-muted-foreground mt-1">
                .xlsx or .xls files only
              </p>
            </div>
          </button>

          {fileError && (
            <p className="font-sans text-sm text-destructive">{fileError}</p>
          )}

          <Button
            onClick={handleParse}
            disabled={loading}
            className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
          >
            {loading ? 'Parsing…' : 'Parse File'}
          </Button>
        </div>
      )}

      {/* State 2 — Parse Results */}
      {pageState === 'parsed' && parseResult && (
        <div className="space-y-4 max-w-2xl">
          {/* Summary bar */}
          <div className="bg-surface-container-low rounded-lg p-4 flex gap-8">
            <Stat label="Total" value={parseResult.total} />
            <Stat label="Valid" value={parseResult.valid} highlight="primary" />
            {parseResult.alreadyEnrolled > 0 && (
              <Stat label="Already Enrolled" value={parseResult.alreadyEnrolled} highlight="warning" />
            )}
            {parseResult.invalid > 0 && (
              <Stat label="Invalid" value={parseResult.invalid} highlight="destructive" />
            )}
          </div>

          {/* Already enrolled table */}
          {parseResult.alreadyEnrolledDetails.length > 0 && (
            <div className="bg-surface-container-low rounded-lg overflow-hidden">
              <p className="px-4 py-3 font-label text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-surface-container">
                Already Enrolled — will be skipped
              </p>
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container">
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Row</th>
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Student ID</th>
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.alreadyEnrolledDetails.map((d) => (
                    <tr key={`${d.row}-${d.studentId}`} className="border-t border-surface-container">
                      <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{d.row}</td>
                      <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">{d.studentId}</td>
                      <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{d.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Invalid rows table */}
          {parseResult.errors.length > 0 && (
            <div className="bg-surface-container-low rounded-lg overflow-hidden">
              <p className="px-4 py-3 font-label text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-surface-container">
                Invalid Rows — will be skipped
              </p>
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container">
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Row</th>
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.errors.map((e) => (
                    <tr key={e.row} className="border-t border-surface-container">
                      <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{e.row}</td>
                      <td className="px-4 py-3 font-sans text-sm text-destructive">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* All records invalid/enrolled */}
          {parseResult.valid === 0 && (
            <p className="font-sans text-sm text-muted-foreground bg-surface-container-low rounded-lg px-4 py-3">
              All records are invalid or already enrolled. Please fix the file and re-upload.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={handleChooseDifferent}
              disabled={loading}
              className="font-label"
            >
              Choose Different File
            </Button>
            {parseResult.valid > 0 && (
              <Button
                onClick={handleConfirmClick}
                disabled={loading}
                className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
              >
                {loading ? 'Importing…' : 'Confirm Import'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* State 3 — Import Results */}
      {pageState === 'imported' && importResult && (
        <div className="space-y-4 max-w-2xl">
          {/* Summary bar */}
          <div className="bg-surface-container-low rounded-lg p-4 flex gap-8">
            <Stat label="Imported" value={importResult.imported} highlight="primary" />
            <Stat label="Skipped" value={importResult.skipped} />
          </div>

          {/* Skipped details table */}
          {importResult.skippedDetails.length > 0 && (
            <div className="bg-surface-container-low rounded-lg overflow-hidden">
              <p className="px-4 py-3 font-label text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-surface-container">
                Skipped Records
              </p>
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container">
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Row</th>
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Student ID</th>
                    <th className="text-left px-4 py-2 font-label text-xs text-muted-foreground">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.skippedDetails.map((d, i) => (
                    <tr key={`${d.row}-${d.studentId ?? i}`} className="border-t border-surface-container">
                      <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{d.row}</td>
                      <td className="px-4 py-3 font-sans text-sm font-medium text-on-surface">{d.studentId ?? '—'}</td>
                      <td className="px-4 py-3 font-sans text-sm text-muted-foreground">{d.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Button
            onClick={handleImportAnother}
            className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
          >
            Import Another File
          </Button>
        </div>
      )}

      {/* Confirmation alert dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent
          className="bg-surface"
          style={{ boxShadow: '0 0 32px 0 rgba(25,28,29,0.06)' }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg font-semibold text-on-surface">
              Confirm Import
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-muted-foreground">
              {`${skipCount} record(s) will be skipped (${parseResult?.invalid ?? 0} invalid, ${parseResult?.alreadyEnrolled ?? 0} already enrolled). Only ${parseResult?.valid ?? 0} valid record(s) will be imported. Continue?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading} className="font-label">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={() => void runImport()}
              className="font-label bg-gradient-to-br from-primary to-primary-container text-primary-foreground"
            >
              {loading ? 'Importing…' : 'Import'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: 'primary' | 'destructive' | 'warning'
}) {
  const valueClass =
    highlight === 'primary'
      ? 'text-primary'
      : highlight === 'destructive'
        ? 'text-destructive'
        : highlight === 'warning'
          ? 'text-amber-600'
          : 'text-on-surface'

  return (
    <div>
      <p className="font-label text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`font-display text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  )
}
